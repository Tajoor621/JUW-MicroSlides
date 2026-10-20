import { readLocalRecord, writeLocalRecord } from "./durable-storage";
import { statementSimilarity, reconcileClaims } from "./deck-integrity";
import type { Deck, GenerateInput, Slide, Citation } from "./types";
import { topicTerms, profileFor } from "./topic-content";
import { researchTheme } from "./slide-themes";
import {
  fetchOpenArticle,
  sourceDocumentSchema,
  guidanceNeedsReview,
  type SourceDocument,
} from "./source-documents";
import { europeNotices, noticeStatus } from "./publication-status";
import { uid } from "./utils";
import { DeckCompletionError, requestedCount } from "./deck-completion";

const text = (raw: string) =>
  raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
type Paper = {
  id?: string;
  source?: string;
  title?: string;
  abstractText?: string;
  pmcid?: string;
  isOpenAccess?: string;
  isRetracted?: string;
  license?: string;
  pubTypeList?: { pubType?: string[] };
  commentCorrectionList?: { commentCorrection?: { type?: string; id?: string; source?: string }[] };
  fullBody?: string;
  sourceDocument?: SourceDocument;
  authorString?: string;
  pubYear?: string;
  journalInfo?: { journal?: { title?: string } };
  doi?: string;
  pmid?: string;
};
const aliases = [
  ["bacteria", "bacterial", "bacterium", "bacteriology"],
  ["fungi", "fungal", "fungus", "mycology"],
  ["virus", "viral", "viruses", "virology"],
  ["archaea", "archaeal", "archaeon"],
  ["parasitology", "parasite", "parasites", "parasitic"],
  ["immunology", "immunity", "immune"],
  ["phycology", "algae", "algal"],
  ["malaria", "malarial", "plasmodium"],
  ["immobilization", "immobilisation", "immobilized", "immobilised"],
  ["genome", "genomic", "genomes"],
  ["antimicrobial", "antibiotic", "antibacterial"],
  ["microbiology", "microbial", "microorganism", "microorganisms"],
  ["qpcr", "quantitative pcr", "real-time pcr"],
  ["biofilm", "biofilms"],
  ["nitrogen fixation", "diazotroph", "diazotrophy"],
];
const generic = new Set([
  "mechanism",
  "mechanisms",
  "role",
  "effect",
  "effects",
  "types",
  "importance",
  "introduction",
  "overview",
  "about",
  "slides",
  "slide",
  "presentation",
  "lecture",
  "create",
  "generate",
  "make",
  "explain",
  "dedicated",
  "subject",
  "topic",
  "research",
  "study",
  "microbiology",
  "microbial",
]);
function termsFor(topic: string) {
  const terms = topicTerms(topic).filter((t) => !generic.has(t));
  return terms.length ? terms : ["microbiology"];
}
function variants(term: string) {
  return aliases.find((group) => group.includes(term)) ?? [term];
}
function relevance(topic: string, body: string) {
  const terms = termsFor(topic),
    lower = body.toLowerCase();
  if (
    /microb/i.test(topic) &&
    !/microb|bacter|archae|fung|viru|viral|alga|protozo|yeast|pathogen/i.test(body)
  )
    return 0;
  const taxa = [
    /bacter/i,
    /viru|viral|virolog/i,
    /fung|mycolog/i,
    /archae/i,
    /parasit|malari|plasmod/i,
  ];
  const required = taxa.filter((taxon) => taxon.test(topic));
  if (required.length === 1 && !required[0].test(body)) return 0;
  return (
    terms.filter((term) => variants(term).some((v) => lower.includes(v.replace(/s$/, "")))).length /
    terms.length
  );
}
export function researchQueries(topic: string) {
  const clean = topic
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
  const terms = termsFor(clean).slice(0, 12);
  const expanded = terms
    .map(
      (term) =>
        `(${variants(term)
          .map((t) => `"${t}"`)
          .join(" OR ")})`,
    )
    .join(" AND ");
  const concepts =
    profileFor(topic)
      ?.sections.slice(0, 6)
      .map((s) => `"${s.title}"`) ?? [];
  return [
    ...new Set([
      `"${clean}"`,
      expanded,
      concepts.length ? `(${concepts.join(" OR ")})` : terms.join(" "),
    ]),
  ].filter(Boolean);
}
function chunks(sentences: string[]): string[][] {
  const result: string[][] = [];
  for (let i = 0; i < sentences.length; i += 2) result.push(sentences.slice(i, i + 2));
  if (result.length > 1 && result.at(-1)!.length === 1)
    result[result.length - 2].push(...result.pop()!);
  return result.filter((c) => c.length >= 2);
}
function sourceSlides(
  papers: Paper[],
  topic: string,
  usedBodies: Set<string>,
  limit = 50,
): Slide[] {
  const ranked = papers
    .flatMap((p) => {
      if (p.source === "PPR" || p.pubTypeList?.pubType?.some((t) => /preprint/i.test(t))) return [];
      if (p.sourceDocument && guidanceNeedsReview(p.sourceDocument)) return [];
      const notices = europeNotices(p);
      if (["retracted", "concern", "notice", "corrected"].includes(noticeStatus(notices, true)))
        return [];
      const passage = p.fullBody || p.abstractText;
      if (!p.title || !passage) return [];
      const plainPassage = p.fullBody ? passage.replace(/\s+/g, " ").trim() : text(passage);
      const score = relevance(topic, `${p.title} ${plainPassage}`);
      if (score < 0.6) return [];
      const sentences = plainPassage
        .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
        .filter(
          (s) =>
            (!p.fullBody || relevance(topic, s) >= 0.6) &&
            s.length > 40 &&
            s.length < 800 &&
            !/copyright|all rights reserved|trial registration|competing interest|author contribution|funding:/i.test(
              s,
            ),
        );
      if (sentences.length < 2) return [];
      return [
        {
          p,
          score:
            score +
            (p.sourceDocument?.access === "textbook" || p.sourceDocument?.access === "guideline"
              ? 0.4
              : 0) +
            (p.fullBody ? 0.2 : 0),
          parts: chunks(sentences.slice(0, 24)),
        },
      ];
    })
    .sort((a, b) => b.score - a.score);
  const groups: Slide[][] = [],
    headings = new Set<string>();
  // Every passage is used at most once. Longer abstracts contribute several coherent sections.
  for (const { p, parts } of ranked.slice(0, 150)) {
    const slides: Slide[] = [];
    const sourceTitle = text(p.title!);
    const citation: Citation = {
      id: `epmc-${p.source || "MED"}-${p.id || p.doi || p.pmid}`,
      title: sourceTitle,
      authors: p.authorString || "Authors not supplied",
      journal: p.journalInfo?.journal?.title || "Journal not supplied",
      year: p.pubYear || "n.d.",
      doi: p.doi,
      pmid: p.pmid,
      url: p.sourceDocument?.url,
      type:
        p.sourceDocument?.access === "textbook"
          ? "book"
          : p.sourceDocument?.access === "guideline"
            ? "report"
            : "article-journal",
    };
    const source =
      p.sourceDocument?.url ||
      (p.pmid
        ? `https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`
        : p.doi
          ? `https://doi.org/${p.doi}`
          : `https://europepmc.org/article/${p.source || "MED"}/${p.id}`);
    for (let part = 0; part < parts.length; part++) {
      const bullets = parts[part];
      const key = bullets.join(" ").toLowerCase().replace(/\W/g, "");
      if (usedBodies.has(key)) continue;
      usedBodies.add(key);
      let title = bullets[0]
        .replace(/^(background|objective|methods?|results?|conclusions?)\s*:?\s*/i, "")
        .split(/[;:,]/)[0]
        .split(/\s+/)
        .slice(0, 9)
        .join(" ")
        .replace(/[.!?]$/, "");
      if (title.length < 10) title = sourceTitle.slice(0, 85);
      const root = title;
      let n = 2;
      while (headings.has(title.toLowerCase())) title = `${root} (${n++})`;
      headings.add(title.toLowerCase());
      const draft: Slide = {
        id: uid("research"),
        layout: "content",
        theme: "molecular",
        title,
        subtitle: `${p.sourceDocument?.access || (p.fullBody ? "Full-text" : "Abstract")} · source excerpt`,
        bullets,
        leftBullets: [],
        rightBullets: [],
        notes: `Source: ${sourceTitle}\n${source}\nPassage ${part + 1} of ${parts.length} from the ${p.fullBody ? "article body" : "publication abstract"}. The excerpts describe the cited study, not universal facts. Review the full study and publication status before teaching.`,
        citations: [citation],
        media: [],
      };
      const traced = reconcileClaims(draft);
      traced.claims = traced.claims?.map((c) => ({
        ...c,
        classification:
          p.sourceDocument?.access === "guideline"
            ? "guideline"
            : p.sourceDocument?.access === "textbook"
              ? "foundational"
              : "study-result",
        status: "supported-excerpt",
        evidence: [
          {
            citationId: citation.id,
            sourceUrl: source,
            locator: `${p.sourceDocument?.locator || (p.fullBody ? "Article body" : "Abstract")}, excerpt group ${part + 1}; locate exact quoted text`,
            quote: c.text,
            access: p.sourceDocument?.access || (p.fullBody ? "full-text" : "abstract"),
            checkedAt: Date.now(),
          },
        ],
      }));
      slides.push(traced);
    }
    const strength = (slide: Slide) =>
      relevance(topic, slide.bullets.join(" ")) +
      (/result|showed|found|demonstrat|observed|measured/i.test(slide.bullets.join(" ")) ? 0.3 : 0);
    groups.push(slides.sort((a, b) => strength(b) - strength(a)));
  }
  // Round-robin across studies; compare each new statement once against accepted content.
  // Rechecking every historical pair for each candidate was cubic and blocked cancellation timers.
  const accepted: Slide[] = [],
    statements: string[] = [];
  for (let part = 0; part < Math.max(0, ...groups.map((g) => g.length)); part++) {
    for (const group of groups) {
      const slide = group[part];
      if (
        !slide ||
        slide.bullets.some((line, i) =>
          [...statements, ...slide.bullets.slice(0, i)].some(
            (previous) => statementSimilarity(previous, line) >= 0.86,
          ),
        )
      )
        continue;
      accepted.push(slide);
      statements.push(...slide.bullets);
      if (accepted.length >= limit) return accepted;
    }
  }
  return accepted;
}
export async function enrichTopicEvidence(
  deck: Deck,
  input: GenerateInput,
  signal?: AbortSignal,
  onProgress?: (message: string) => void,
): Promise<Deck> {
  const target = requestedCount(input.count);
  try {
    const saved = JSON.parse((await readLocalRecord("teaching-source-library")) || "[]");
    if (Array.isArray(saved) && saved.length <= 30) {
      const docs = saved.flatMap((raw) => {
        const parsed = sourceDocumentSchema.safeParse(raw);
        return parsed.success &&
          !guidanceNeedsReview(parsed.data) &&
          relevance(input.topic, `${parsed.data.title} ${parsed.data.text}`) >= 0.6
          ? [parsed.data]
          : [];
      });
      deck = {
        ...deck,
        sourceDocuments: [
          ...new Map([...(deck.sourceDocuments || []), ...docs].map((d) => [d.id, d])).values(),
        ].slice(0, 30),
      };
    }
  } catch {
    /* An unreadable source library must never fabricate evidence. */
  }
  const original = deck.slides.filter((s) => s.title !== "Evidence required");
  if (original.length >= target)
    return { ...deck, slides: original.slice(0, target), requestedCount: target };
  const closing = original.filter((s) => /^(Key conclusions|Suggested reading)$/.test(s.title));
  const core = original.filter((s) => !closing.includes(s));
  const needed = target - core.length - closing.length;
  const queries = researchQueries(input.topic);
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error("Research search timed out")), 75000);
  const cacheKey = `research-body-v2:${input.topic.toLowerCase().trim().slice(0, 240)}`;
  const papers = new Map<string, Paper>();
  try {
    const cached = JSON.parse((await readLocalRecord(cacheKey)) || "null");
    if (cached?.papers)
      for (const p of cached.papers as Paper[])
        papers.set(p.doi || p.pmid || p.id || p.title || "", p);
  } catch {
    /* Unavailable cache must not invent evidence. */
  }
  for (const doc of deck.sourceDocuments || [])
    papers.set(`document:${doc.id}`, {
      id: doc.id,
      title: doc.title,
      fullBody: doc.text,
      authorString: doc.publisher,
      pubYear: doc.publishedDate.slice(0, 4) || "n.d.",
      sourceDocument: doc,
    });
  let successful = 0;
  const requestErrors: string[] = [];
  const fullTextAttempts = new Set<string>();
  async function expandFullTexts() {
    const candidates = [...papers.values()]
      .filter(
        (p) =>
          p.pmcid &&
          p.isOpenAccess === "Y" &&
          !p.fullBody &&
          !fullTextAttempts.has(p.pmcid) &&
          relevance(input.topic, `${p.title} ${p.abstractText}`) >= 0.6 &&
          !europeNotices(p).length,
      )
      .slice(0, Math.max(0, 6 - fullTextAttempts.size));
    for (let i = 0; i < candidates.length; i += 3) {
      const batch = candidates.slice(i, i + 3);
      const results = await Promise.allSettled(
        batch.map(async (p) => {
          fullTextAttempts.add(p.pmcid!);
          const fullBody = await fetchOpenArticle(p.pmcid!, controller.signal);
          return { p, fullBody };
        }),
      );
      for (const result of results)
        if (result.status === "fulfilled") {
          const { p, fullBody } = result.value;
          p.fullBody = fullBody;
          p.sourceDocument = {
            id: p.pmcid!,
            title: text(p.title || "Article"),
            url: `https://europepmc.org/articles/${p.pmcid}`,
            publisher: p.journalInfo?.journal?.title || "Journal",
            access: "full-text",
            text: fullBody,
            locator: "Article body; exact quoted text",
            license: p.license || "Open-access subset; confirm article-specific reuse terms",
            retrievedAt: Date.now(),
            publishedDate: p.pubYear || "",
            jurisdiction: "",
            acquisition: "provider-xml",
          };
        }
    }
  }
  const bodyKeys = new Set(core.map((s) => s.bullets.join(" ").toLowerCase().replace(/\W/g, "")));
  let evidence: Slide[] = sourceSlides(
    [...papers.values()],
    input.topic,
    new Set(bodyKeys),
    needed,
  );
  let work = queries.map((query) => ({ query, cursor: "*" }));
  try {
    for (let round = 0; round < 3 && work.length && evidence.length < needed; round++) {
      onProgress?.(
        `Research search ${round + 1}/3 · ${Math.min(target, original.length + evidence.length)} of ${target} slides planned`,
      );
      const attempted = work;
      const responses = await Promise.allSettled(
        work.map(async ({ query, cursor }) => {
          const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&resultType=core&pageSize=100&cursorMark=${encodeURIComponent(cursor)}&query=${encodeURIComponent(`(${query}) AND HAS_ABSTRACT:y`)}`;
          const response = await fetch(url, {
            credentials: "omit",
            signal: AbortSignal.any([controller.signal, AbortSignal.timeout(18000)]),
          });
          if (!response.ok) throw new Error(`Research service returned ${response.status}`);
          const data = await response.json();
          return {
            papers: (data.resultList?.result ?? []) as Paper[],
            query,
            cursor: data.nextCursorMark as string | undefined,
          };
        }),
      );
      work = [];
      for (const [position, result] of responses.entries())
        if (result.status === "fulfilled") {
          successful++;
          for (const p of result.value.papers) {
            const key = (
              p.doi ||
              p.pmid ||
              `${p.source || ""}:${p.id || p.title || ""}`
            ).toLowerCase();
            if (key && !papers.has(key)) papers.set(key, p);
          }
          if (result.value.cursor && result.value.papers.length)
            work.push({ query: result.value.query, cursor: result.value.cursor });
        } else {
          const reason =
            result.reason instanceof Error ? result.reason.message : "Request unavailable";
          requestErrors.push(reason);
          onProgress?.(
            `Research request failed: ${reason}. Retrying within the bounded search budget.`,
          );
          if (!controller.signal.aborted) work.push(attempted[position]);
        }
      if (requestErrors.length && work.length && round < 2 && !controller.signal.aborted)
        await new Promise((resolve) => setTimeout(resolve, 500 * (round + 1)));
      onProgress?.("Retrieving licensed open full text and screening publication notices…");
      await expandFullTexts();
      try {
        await writeLocalRecord(
          cacheKey,
          JSON.stringify({ retrievedAt: Date.now(), papers: [...papers.values()] }),
        );
      } catch {
        /* Online generation can continue with an explicit uncached source. */
      }
      evidence = sourceSlides([...papers.values()], input.topic, new Set(bodyKeys), needed);
      if (signal?.aborted) throw signal.reason;
    }
    if (evidence.length < needed)
      throw new DeckCompletionError(
        target,
        original.length + evidence.length,
        `${successful ? "The research service supplied too little usable text." : `No research request succeeded (${requestErrors.at(-1) || "service unavailable"}). Reconnect and retry, or use attributed cached sources.`} Add lecture notes/abstracts or configure a local AI model. Your existing deck has been kept.`,
      );
    const added = evidence.slice(0, needed);
    if (target === 1 && added[0]) added[0] = { ...added[0], title: input.topic };
    const slides = [...core, ...added, ...closing].map((s) => ({
      ...s,
      theme: researchTheme(input.topic, input.discipline, s.layout),
    }));
    onProgress?.(`Completed ${slides.length} of ${target} slides`);
    return {
      ...deck,
      slides,
      sourceDocuments: [
        ...new Map(
          [
            ...(deck.sourceDocuments || []),
            ...[...papers.values()].flatMap((p) =>
              p.sourceDocument &&
              added.some((s) => s.citations.some((c) => c.url === p.sourceDocument!.url))
                ? [p.sourceDocument]
                : [],
            ),
          ].map((d) => [d.id, d]),
        ).values(),
      ].slice(0, 30),
      requestedCount: target,
      contentWarnings: [
        `${added.length} slides contain attributed source excerpts retrieved through ${successful} research searches. Open full-text retrieval is bounded to six articles per request. Metadata notices are screened; absence of a notice is not proof of validity. Cached evidence may be stale; run reference checks before teaching.`,
      ],
      updatedAt: Date.now(),
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
