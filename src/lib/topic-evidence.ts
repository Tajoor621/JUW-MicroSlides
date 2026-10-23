import { sourceConceptHeading } from "./source-headings";
import { fetchPubmedAbstracts } from "./pubmed-abstracts";
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

import { scientificPlainText as text, coherentSourcePassages } from "./source-passages";
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
  ["architecture", "organization", "organisation", "structure"],
  ["packaging", "packing", "wrapping", "compaction"],
  ["antimicrobial", "antibiotic", "antibacterial"],
  ["microbiology", "microbial", "microorganism", "microorganisms"],
  ["qpcr", "quantitative pcr", "real-time pcr"],
  ["biofilm", "biofilms"],
  ["stain", "staining", "stains"],
  [
    "mrsa",
    "methicillin-resistant staphylococcus aureus",
    "methicillin resistant staphylococcus aureus",
  ],
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
  "please",
  "provide",
  "detailed",
  "comprehensive",
  "complete",
  "full",
  "cover",
  "covering",
  "including",
  "include",
  "their",
  "these",
  "this",
  "that",
  "into",
  "from",
  "what",
  "how",
  "can",
  "you",
  "differences",
  "difference",
  "between",
  "microbes",
]);
/** Sentence-separated syllabus requests are alternative source scopes, not one AND query. */
export function researchScopes(topic: string) {
  const clean = topic.trim().replace(/^["“]+|["”]+$/g, "");
  const clauses = clean
    .split(/(?<=[a-z]{2}|\))[.!?]\s+|[;\n]+/i)
    .map((s) => s.trim())
    .filter(Boolean);
  return clauses.length > 1 && clauses.length <= 8 ? clauses : [clean];
}
function termsFor(topic: string) {
  const terms = [...new Set(topicTerms(topic))].filter((t) => !generic.has(t) && !/^\d+$/.test(t));
  if (/\barchitecture\b/i.test(topic)) terms.push("architecture");
  return terms.length ? terms : ["microbiology"];
}
function variants(term: string) {
  return aliases.find((group) => group.includes(term)) ?? [term];
}
const taxonGroups = [
  ["bacteria", "bacterial", "bacterium", "bacteriology"],
  ["archaea", "archaeal", "archaeon"],
  ["fungi", "fungal", "fungus", "mycology"],
  ["virus", "viruses", "viral", "virology"],
  ["parasite", "parasites", "parasitic", "parasitology"],
];
function topicTaxa(terms: string[]) {
  return taxonGroups.filter((group) => terms.some((term) => group.includes(term)));
}
const reproductionNumberTopic = /\breproduct(?:ion|ive)\s+(?:number|ratio)s?\b/i;
const reproductionScopeWords = new Set([
  "pathogen",
  "pathogens",
  "reproductive",
  "reproduction",
  "number",
  "numbers",
  "ratio",
  "ratios",
  "interpretation",
]);
function reproductionNumberContext(body: string) {
  return (
    (/\breproduct(?:ion|ive)\s+(?:number|ratio)s?\b/i.test(body) ||
      /(?<![\p{L}\p{N}_])R(?:0|₀|t|ₜ)(?![\p{L}\p{N}_])|\bR\(t\)/u.test(body)) &&
    /\b(?:epidem\w*|transmiss\w*|infect\w*|outbreak\w*|herd|incidence|susceptib\w*)\b/i.test(body)
  );
}
function mentionsVariant(body: string, variant: string) {
  const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?:s)?(?![\\p{L}\\p{N}_])`, "iu").test(body);
}
export function sourceTopicRelevance(topic: string, body: string): number {
  const scopes = researchScopes(topic);
  if (scopes.length > 1)
    return Math.max(...scopes.map((scope) => sourceTopicRelevance(scope, body)));
  // Structural lectures must not be filled by generic genome-resource or
  // microbiome surveys that merely share organism/genome words.
  if (
    /genome\s+architecture|chromosome\s+organi[sz]ation|organi[sz]ation\s+of\s+(?:the\s+)?(?:bacterial\s+)?chromosome|dna\s+packaging|prokaryotic.*eukaryotic.*genom/i.test(
      topic,
    ) &&
    !/chromatin|nucleoid|histone|nucleosome|DNA\s+(?:packag|wrapp|supercoil|compact)|(?:genom\w*|chromosom\w*)\s+(?:architec|organi[sz]|structur|topolog|segreg|fold|packag)|(?:architec\w*|organi[sz]\w*|structur\w*)\s+(?:of\s+)?(?:the\s+)?(?:bacterial\s+|archaeal\s+|fungal\s+)?(?:genom|chromosom)/i.test(
      body,
    )
  )
    return 0;
  // A reproduction number is an epidemiological concept. Shared words about
  // reproduction, chromosome number or interpretation cannot establish this scope.
  const reproduction = reproductionNumberTopic.test(topic);
  if (reproduction && !reproductionNumberContext(body)) return 0;
  const terms = termsFor(topic).filter(
      (term) => !reproduction || !reproductionScopeWords.has(term),
    ),
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
  // A comparative lecture can use a source on one requested taxon. Require the
  // shared scientific concept too; unrelated taxon-only papers remain excluded.
  if (!terms.length) return 1;
  const groups = topicTaxa(terms);
  if (groups.length > 1) {
    const anchors = terms.filter((term) => !groups.some((group) => group.includes(term)));
    if (!groups.some((group) => group.some((term) => lower.includes(term.replace(/s$/, "")))))
      return 0;
    if (anchors.length)
      return (
        anchors.filter((term) => variants(term).some((v) => mentionsVariant(lower, v))).length /
        anchors.length
      );
  }
  return (
    terms.filter((term) => variants(term).some((v) => mentionsVariant(lower, v))).length /
    terms.length
  );
}
export function researchQueries(topic: string): string[] {
  const scopes = researchScopes(topic);
  if (scopes.length > 1)
    return [...new Set(scopes.flatMap((scope) => researchQueries(scope)))].slice(0, 24);
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
  const groups = topicTaxa(terms);
  const anchors = terms.filter((term) => !groups.some((group) => group.includes(term)));
  const comparative =
    groups.length > 1
      ? `${anchors
          .map(
            (term) =>
              `(${variants(term)
                .map((v) => `"${v}"`)
                .join(" OR ")})`,
          )
          .join(" AND ")}${anchors.length ? " AND " : ""}(${groups
          .flat()
          .map((v) => `"${v}"`)
          .join(" OR ")})`
      : "";
  return [
    ...new Set([
      `"${clean}"`,
      reproductionNumberTopic.test(clean)
        ? '("reproduction number" OR "reproductive number" OR "basic reproduction ratio" OR "effective reproduction number") AND (transmission OR epidemic OR infection OR outbreak)' +
          terms
            .filter((term) => !reproductionScopeWords.has(term))
            .map(
              (term) =>
                ` AND (${variants(term)
                  .map((v) => `"${v}"`)
                  .join(" OR ")})`,
            )
            .join("")
        : "",
      expanded,
      comparative,
      concepts.length ? `(${concepts.join(" OR ")})` : terms.join(" "),
    ]),
  ].filter(Boolean);
}
function sourceSlides(
  papers: Paper[],
  topic: string,
  usedBodies: Set<string>,
  limit = 50,
  preferOverview = false,
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
      const score = sourceTopicRelevance(topic, `${p.title} ${plainPassage}`);
      if (score < 0.6) return [];
      const parts = coherentSourcePassages(
        passage,
        Boolean(p.fullBody),
        (body) =>
          (!p.fullBody &&
            researchScopes(topic).length === 1 &&
            !reproductionNumberTopic.test(topic)) ||
          sourceTopicRelevance(topic, body) >= 0.6,
      );
      if (!parts.length) return [];
      return [
        {
          p,
          score:
            score +
            (p.sourceDocument?.access === "textbook" || p.sourceDocument?.access === "guideline"
              ? 0.4
              : 0) +
            (p.fullBody ? 0.2 : 0),
          parts,
        },
      ];
    })
    .sort((a, b) => b.score - a.score);
  const overviewScore = (slide: Slide) => {
    const body = slide.bullets.join(" ");
    return (
      (slide.citations.some((c) => c.type === "book") ? 1 : 0) +
      (/\b(is|are|refers? to|defined as)\b/i.test(body) ? 0.3 : 0) -
      (/\b(we|our|found|observed|measured|investigated)\b/i.test(body) ? 0.8 : 0)
    );
  };
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
      const bullets = parts[part].sentences;
      const key = bullets.join(" ").toLowerCase().replace(/\W/g, "");
      if (usedBodies.has(key)) continue;
      usedBodies.add(key);
      const title = sourceConceptHeading(bullets, topic, headings);
      const draft: Slide = {
        id: uid("research"),
        layout: "content",
        theme: "molecular",
        title,
        subtitle: `${p.sourceDocument?.access || (p.fullBody ? "Full-text" : "Abstract")} · ${p.pubYear || "date unrecorded"} · source excerpt`,
        bullets,
        leftBullets: [],
        rightBullets: [],
        notes: `Source: ${sourceTitle}\n${source}\nParagraph ${parts[part].paragraph}; excerpt group ${part + 1} of ${parts.length} from the ${p.fullBody ? "article body" : "publication abstract"}. The excerpts describe the cited study, not universal facts. Review the full study and publication status before teaching.\n\nSource paragraph context (verbatim):\n${parts[part].context}`,
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
            locator: `${p.sourceDocument?.locator || (p.fullBody ? "Article body" : "Abstract")}, paragraph ${parts[part].paragraph}, excerpt group ${part + 1}; locate exact quoted text`,
            quote: c.text,
            access: p.sourceDocument?.access || (p.fullBody ? "full-text" : "abstract"),
            checkedAt: Date.now(),
          },
        ],
      }));
      slides.push(traced);
    }
    const strength = (slide: Slide) =>
      (preferOverview ? overviewScore(slide) : 0) +
      sourceTopicRelevance(topic, slide.bullets.join(" ")) +
      (/result|showed|found|demonstrat|observed|measured/i.test(slide.bullets.join(" ")) ? 0.3 : 0);
    groups.push(slides.sort((a, b) => strength(b) - strength(a)));
  }
  if (preferOverview)
    groups.sort((a, b) => (b[0] ? overviewScore(b[0]) : -10) - (a[0] ? overviewScore(a[0]) : -10));
  const scopes = researchScopes(topic);
  const focused = (group: Slide[]) =>
    sourceTopicRelevance(topic, group[0]?.citations[0]?.title || "") >= 0.6;
  // For syllabus requests, use distinct passages from directly focused studies
  // before tangential papers that mention the concept in passing.
  const tiers =
    scopes.length > 1
      ? [groups.filter(focused), groups.filter((group) => !focused(group))]
      : [groups];
  // Round-robin across studies; compare each new statement once against accepted content.
  // Rechecking every historical pair for each candidate was cubic and blocked cancellation timers.
  const accepted: Slide[] = [],
    statements: string[] = [];
  const take = (slide: Slide | undefined) => {
    if (
      !slide ||
      accepted.includes(slide) ||
      slide.bullets.some((line, i) =>
        [...statements, ...slide.bullets.slice(0, i)].some(
          (previous) => statementSimilarity(previous, line) >= 0.86,
        ),
      )
    )
      return false;
    accepted.push(slide);
    statements.push(...slide.bullets);
    return true;
  };
  // Cover each requested syllabus clause before filling the remaining slots.
  if (scopes.length > 1 && limit >= scopes.length)
    for (const scope of scopes) {
      if (accepted.some((s) => sourceTopicRelevance(scope, s.bullets.join(" ")) >= 0.6)) continue;
      for (const slide of tiers.flat().flat())
        if (sourceTopicRelevance(scope, slide.bullets.join(" ")) >= 0.6 && take(slide)) break;
    }
  for (const tier of tiers) {
    for (let part = 0; part < Math.max(0, ...tier.map((g) => g.length)); part++) {
      for (const group of tier) {
        const slide = group[part];
        if (accepted.length >= limit) return accepted;
        if (!take(slide)) continue;
        if (accepted.length >= limit) return accepted;
      }
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
          sourceTopicRelevance(input.topic, `${parsed.data.title} ${parsed.data.text}`) >= 0.6
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
  const timer = setTimeout(() => controller.abort(new Error("Research search timed out")), 120000);
  const cacheKey = `research-passages-v3:${input.topic.toLowerCase().trim().slice(0, 240)}`;
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
  async function expandFullTexts(optional = false) {
    const fullTextSignal = optional
      ? AbortSignal.any([controller.signal, AbortSignal.timeout(4000)])
      : controller.signal;
    const candidates = [...papers.values()]
      .filter(
        (p) =>
          p.pmcid &&
          p.isOpenAccess === "Y" &&
          !p.fullBody &&
          !fullTextAttempts.has(p.pmcid) &&
          sourceTopicRelevance(input.topic, `${p.title} ${p.abstractText}`) >= 0.6 &&
          !europeNotices(p).length,
      )
      .slice(0, Math.max(0, 6 - fullTextAttempts.size));
    for (let i = 0; i < candidates.length; i += 3) {
      const batch = candidates.slice(i, i + 3);
      const results = await Promise.allSettled(
        batch.map(async (p) => {
          fullTextAttempts.add(p.pmcid!);
          const fullBody = await fetchOpenArticle(p.pmcid!, fullTextSignal);
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
    target === 1,
  );
  let work = queries.map((query) => ({ query, cursor: "*" }));
  const scopes = researchScopes(input.topic);
  const missingScopes = () =>
    scopes.length > 1 && needed >= scopes.length
      ? scopes.filter(
          (scope) =>
            ![...core, ...evidence].some(
              (s) => sourceTopicRelevance(scope, s.bullets.join(" ")) >= 0.6,
            ),
        )
      : [];
  const enough = () => evidence.length >= needed && missingScopes().length === 0;
  try {
    for (let round = 0; round < 3 && work.length && !enough(); round++) {
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
          deck = { ...deck, lastLiteratureCheck: Date.now() };
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
      // Prefer full text, but bound optional retrieval when usable abstracts already
      // cover the count. A slow article endpoint must not block the whole lecture.
      evidence = sourceSlides(
        [...papers.values()],
        input.topic,
        new Set(bodyKeys),
        needed,
        target === 1,
      );
      onProgress?.("Screening sources and retrieving available open full text…");
      await expandFullTexts(evidence.length >= needed);
      try {
        await writeLocalRecord(
          cacheKey,
          JSON.stringify({ retrievedAt: Date.now(), papers: [...papers.values()] }),
        );
      } catch {
        /* Online generation can continue with an explicit uncached source. */
      }
      evidence = sourceSlides(
        [...papers.values()],
        input.topic,
        new Set(bodyKeys),
        needed,
        target === 1,
      );
      if (signal?.aborted) throw signal.reason;
    }
    if (!enough() && !controller.signal.aborted) {
      onProgress?.("Trying PubMed abstracts through an independent research provider…");
      try {
        const fallback = await fetchPubmedAbstracts(
          queries.map((q) => `(${q})`).join(" OR "),
          controller.signal,
        );
        successful++;
        deck = { ...deck, lastLiteratureCheck: Date.now() };
        for (const p of fallback) {
          const key = (p.doi || p.pmid).toLowerCase();
          if (!papers.has(key)) papers.set(key, p);
        }
        evidence = sourceSlides(
          [...papers.values()],
          input.topic,
          new Set(bodyKeys),
          needed,
          target === 1,
        );
        await writeLocalRecord(
          cacheKey,
          JSON.stringify({ retrievedAt: Date.now(), papers: [...papers.values()] }),
        ).catch(() => undefined);
      } catch (error) {
        signal?.throwIfAborted();
        requestErrors.push(error instanceof Error ? error.message : "PubMed unavailable");
      }
    }
    if (!enough())
      throw new DeckCompletionError(
        target,
        original.length + evidence.length,
        `${successful ? "Research sources supplied too little relevant text." : `No research request succeeded (${requestErrors.at(-1) || "service unavailable"}). Reconnect and retry, or use attributed cached sources.`} ${missingScopes().length ? `Uncovered requested sections: ${missingScopes().join("; ")}.` : ""} ${requestErrors.length ? ` Last provider error: ${requestErrors.at(-1)}.` : ""} Add lecture notes/abstracts or configure a local AI model. Your existing deck has been kept.`,
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
