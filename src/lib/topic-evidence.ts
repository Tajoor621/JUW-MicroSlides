import { fetchOpenAlexPassages } from "./openalex-research";
import { RESEARCH_CONFIG } from "./research-config";
import { readResearchCheckpoint, saveResearchCheckpoint } from "./research-checkpoint";
export { researchScopes, researchQueries, sourceTopicRelevance } from "./research-queries";
import {
  researchScopes,
  researchQueries,
  sourceTopicRelevance,
  reproductionNumberTopic,
} from "./research-queries";
import { dnaTransferClarification, dnaTransferSectionTitle } from "./dna-transfer-topic";
import { sourceConceptHeading } from "./source-headings";
import { fetchPubmedAbstracts } from "./pubmed-abstracts";
import { readLocalRecord, writeLocalRecord } from "./durable-storage";
import { statementSimilarity, reconcileClaims } from "./deck-integrity";
import type { Deck, GenerateInput, Slide, Citation } from "./types";
import { researchTheme } from "./slide-themes";
import {
  fetchOpenArticle,
  sourceDocumentSchema,
  guidanceNeedsReview,
  type SourceDocument,
} from "./source-documents";
import { europeNotices, noticeStatus } from "./publication-status";
import { uid } from "./utils";
import { hasConjugationCore } from "./conjugation-curriculum";
import { checkPublication } from "./publication-status";
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
/** Refresh provider metadata while retaining cached full text and adverse notices. */
export function mergeResearchPaper(prior: Paper | undefined, fresh: Paper): Paper {
  if (!prior) return fresh;
  const notices = [
    ...(prior.commentCorrectionList?.commentCorrection || []),
    ...(fresh.commentCorrectionList?.commentCorrection || []),
  ];
  return {
    ...prior,
    ...fresh,
    fullBody: fresh.fullBody || prior.fullBody,
    sourceDocument: fresh.sourceDocument || prior.sourceDocument,
    isRetracted:
      prior.isRetracted === "Y" || fresh.isRetracted === "Y"
        ? "Y"
        : fresh.isRetracted || prior.isRetracted,
    pubTypeList: {
      pubType: [
        ...new Set([...(prior.pubTypeList?.pubType || []), ...(fresh.pubTypeList?.pubType || [])]),
      ],
    },
    commentCorrectionList: { commentCorrection: notices },
  };
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
            quote: parts[part].context,
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
      if (
        !dnaTransferSectionTitle(scope) &&
        accepted.some((s) => sourceTopicRelevance(scope, s.bullets.join(" ")) >= 0.6)
      )
        continue;
      const candidates = tiers.flat().flat();
      if (dnaTransferSectionTitle(scope))
        candidates.sort(
          (a, b) =>
            sourceTopicRelevance(scope, b.citations[0]?.title || "") -
            sourceTopicRelevance(scope, a.citations[0]?.title || ""),
        );
      for (const slide of candidates)
        if (sourceTopicRelevance(scope, slide.bullets.join(" ")) >= 0.6 && take(slide)) {
          const sectionTitle = dnaTransferSectionTitle(scope);
          if (sectionTitle) {
            slide.title = sectionTitle;
            slide.notes = `Requested section: ${scope}\n\n${slide.notes}`;
          }
          break;
        }
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
  if (hasConjugationCore(deck) && input.researchDepth === "thorough") {
    signal?.throwIfAborted();
    onProgress?.("Checking the teaching core's original references and publication notices…");
    const refs = [
      ...new Map(deck.slides.flatMap((s) => s.citations).map((c) => [c.id, c])).values(),
    ];
    const checks = await Promise.allSettled(
      refs.map(async (c) => [c.id, await checkPublication(c)] as const),
    );
    signal?.throwIfAborted();
    const found = new Map(checks.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])));
    const complete = refs.every((c) => found.get(c.id)?.complete && !found.get(c.id)?.cached);
    deck = {
      ...deck,
      slides: deck.slides.map((s) => ({
        ...s,
        citations: s.citations.map((c) => ({
          ...c,
          publicationCheck: found.get(c.id) || c.publicationCheck,
        })),
      })),
      ...(complete ? { lastLiteratureCheck: Date.now() } : {}),
      contentWarnings: [
        ...(deck.contentWarnings || []),
        complete
          ? "Reference notice lookups completed. This does not independently verify scientific claims."
          : "Some reference notice checks were unavailable or cached. The editorial core remains an unverified draft.",
        ...refs.flatMap((c) => {
          const check = found.get(c.id);
          return check && ["retracted", "corrected", "concern", "notice"].includes(check.status)
            ? [`Reference notice requires attention: ${c.title} (${check.status}).`]
            : [];
        }),
      ],
    };
  }
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
  if (original.length > target)
    throw new DeckCompletionError(
      target,
      original.length,
      "The draft exceeds the requested count; no slides were truncated.",
    );
  if (original.length === target) return { ...deck, slides: original, requestedCount: target };
  const closing = original.filter((s) => /^(Key conclusions|Suggested reading)$/.test(s.title));
  const core = original.filter((s) => !closing.includes(s));
  const needed = target - core.length - closing.length;
  const queries = researchQueries(input.topic);
  const thorough = input.researchDepth === "thorough";
  const fullTextLimit = thorough ? 24 : 6;
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(
    () => controller.abort(new Error("Research search timed out")),
    thorough ? RESEARCH_CONFIG.defaultBudgetMs : RESEARCH_CONFIG.quickBudgetMs,
  );
  const cacheKey = `research-passages-v3:${input.topic.toLowerCase().trim().slice(0, 240)}`;
  const papers = new Map<string, Paper>();
  const checkpoint = await readResearchCheckpoint(input).catch(() => null);
  if (checkpoint) {
    for (const p of checkpoint.papers as Paper[])
      papers.set(p.doi || p.pmid || p.id || p.title || "", p);
    onProgress?.(
      `Resuming ${checkpoint.completedSlides.length} saved source slides; completed batches will not be fetched again.`,
    );
  }
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
    const fullTextSignal =
      optional && !thorough
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
      .sort(
        (a, b) =>
          sourceTopicRelevance(input.topic, `${b.title} ${b.abstractText}`) -
          sourceTopicRelevance(input.topic, `${a.title} ${a.abstractText}`),
      )
      .slice(0, Math.max(0, fullTextLimit - fullTextAttempts.size));
    for (let i = 0; i < candidates.length; i += 3) {
      const batch = candidates.slice(i, i + 3);
      const results = await Promise.allSettled(
        batch.map(async (p) => {
          fullTextAttempts.add(p.pmcid!);
          const fullBody = await fetchOpenArticle(
            p.pmcid!,
            fullTextSignal,
            thorough ? 30000 : 9000,
          );
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
  let work = checkpoint?.work.length
    ? checkpoint.work
    : queries.map((query) => ({ query, cursor: "*" }));
  const firstRound =
    checkpoint?.work.length && checkpoint.round < (thorough ? RESEARCH_CONFIG.rounds : 3)
      ? checkpoint.round
      : 0;
  const scopes = researchScopes(input.topic);
  const missingScopes = () =>
    scopes.length > 1 && needed >= scopes.length
      ? scopes.filter(
          (scope) =>
            ![...core, ...evidence].some((s) =>
              dnaTransferSectionTitle(scope)
                ? s.notes.startsWith(`Requested section: ${scope}\n`)
                : sourceTopicRelevance(scope, s.bullets.join(" ")) >= 0.6,
            ),
        )
      : [];
  const enough = () => evidence.length >= needed && missingScopes().length === 0;
  try {
    for (
      let round = firstRound;
      round < (thorough ? RESEARCH_CONFIG.rounds : 3) &&
      work.length &&
      (!enough() || (thorough && round < 2));
      round++
    ) {
      onProgress?.(
        `Research search ${round + 1}/${thorough ? 5 : 3} · ${Math.min(target, original.length + evidence.length)} of ${target} slides planned`,
      );
      const attempted = work;
      const responses = await Promise.allSettled(
        work.map(async ({ query, cursor }) => {
          const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&resultType=core&pageSize=100&cursorMark=${encodeURIComponent(cursor)}&query=${encodeURIComponent(`(${query}) AND HAS_ABSTRACT:y`)}`;
          const response = await fetch(url, {
            credentials: "omit",
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(thorough ? 35000 : 18000),
            ]),
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
            if (key) papers.set(key, mergeResearchPaper(papers.get(key), p));
          }
          if (
            result.value.cursor &&
            result.value.cursor !== attempted[position].cursor &&
            result.value.papers.length
          )
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
      await expandFullTexts(!thorough && evidence.length >= needed);
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
      await saveResearchCheckpoint({
        input,
        round: round + 1,
        work,
        completedSlides: evidence,
        papers: [...papers.values()],
        savedAt: Date.now(),
      });
      if (signal?.aborted) throw signal.reason;
    }
    if ((!enough() || thorough) && !controller.signal.aborted) {
      onProgress?.("Trying PubMed abstracts through an independent research provider…");
      try {
        const fallback: Awaited<ReturnType<typeof fetchPubmedAbstracts>> = [];
        const independentQueries = thorough
          ? researchScopes(input.topic)
              .slice(0, 8)
              .map((scope) =>
                researchQueries(scope)
                  .slice(0, 3)
                  .map((q) => `(${q})`)
                  .join(" OR "),
              )
          : [queries.map((q) => `(${q})`).join(" OR ")];
        let independentSuccess = 0;
        for (const [index, query] of independentQueries.entries()) {
          if (index) await new Promise((resolve) => setTimeout(resolve, 400));
          controller.signal.throwIfAborted();
          try {
            fallback.push(...(await fetchPubmedAbstracts(query, controller.signal)));
            independentSuccess++;
          } catch (error) {
            signal?.throwIfAborted();
            requestErrors.push(error instanceof Error ? error.message : "PubMed unavailable");
          }
        }
        successful += independentSuccess;
        if (independentSuccess) deck = { ...deck, lastLiteratureCheck: Date.now() };
        for (const p of fallback) {
          const key = (p.doi || p.pmid).toLowerCase();
          papers.set(key, mergeResearchPaper(papers.get(key), p));
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
    if (!enough() && !controller.signal.aborted) {
      onProgress?.("Searching OpenAlex for additional attributable abstracts…");
      try {
        const extra = await fetchOpenAlexPassages(input.topic, controller.signal);
        successful++;
        for (const p of extra)
          papers.set(p.doi || p.id, mergeResearchPaper(papers.get(p.doi || p.id), p));
        evidence = sourceSlides(
          [...papers.values()],
          input.topic,
          new Set(bodyKeys),
          needed,
          target === 1,
        );
        await saveResearchCheckpoint({
          input,
          round: RESEARCH_CONFIG.rounds,
          work: [],
          completedSlides: evidence,
          papers: [...papers.values()],
          savedAt: Date.now(),
        });
      } catch (error) {
        signal?.throwIfAborted();
        requestErrors.push(error instanceof Error ? error.message : "OpenAlex unavailable");
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
        ...(deck.contentWarnings || []).filter(
          (warning) => !/^Requested \d+ slides;/.test(warning),
        ),
        ...[dnaTransferClarification(input.topic)].filter((note): note is string => Boolean(note)),
        `${added.length} slides contain attributed source excerpts retrieved through ${successful} research searches. Open full-text retrieval is bounded to ${fullTextLimit} articles per request. Metadata notices are screened; absence of a notice is not proof of validity. Cached evidence may be stale; run reference checks before teaching.`,
      ],
      updatedAt: Date.now(),
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
