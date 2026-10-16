import type { Deck, GenerateInput, Slide, Citation } from "./types";
import { topicOverlap, profileFor } from "./topic-content";
import { cycleTheme } from "./slide-themes";
import { uid } from "./utils";

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
  authorString?: string;
  pubYear?: string;
  journalInfo?: { journal?: { title?: string } };
  doi?: string;
  pmid?: string;
};

/** Broaden one vague exact-phrase search into a bounded set of complementary topic queries. */
export function researchQueries(topic: string) {
  const clean = topic.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 220);
  const concepts =
    profileFor(topic)
      ?.sections.slice(0, 8)
      .map((s) => `"${s.title}"`) ?? [];
  return [
    ...new Set(
      [`"${clean}"`, clean, concepts.length ? `(${concepts.join(" OR ")})` : ""].filter(Boolean),
    ),
  ].slice(0, 3);
}

export async function enrichTopicEvidence(
  deck: Deck,
  input: GenerateInput,
  signal?: AbortSignal,
): Promise<Deck> {
  if (deck.slides.length >= input.count) return deck;
  const queries = researchQueries(input.topic);
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error("Research search timed out")), 25000);
  try {
    // Independent searches run concurrently and are deduplicated before relevance ranking.
    const responses = await Promise.allSettled(
      queries.map(async (query) => {
        const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&resultType=core&pageSize=100&query=${encodeURIComponent(query)}`;
        const response = await fetch(url, { credentials: "omit", signal: controller.signal });
        if (!response.ok) throw new Error(`Europe PMC returned ${response.status}`);
        const data = await response.json();
        return (data.resultList?.result ?? []) as Paper[];
      }),
    );
    if (signal?.aborted) throw signal.reason;
    const uniquePapers = new Map<string, Paper>();
    for (const result of responses)
      if (result.status === "fulfilled") {
        for (const p of result.value) {
          const id = (
            p.doi ||
            p.pmid ||
            `${p.source || ""}:${p.id || p.title || ""}`
          ).toLowerCase();
          if (id && !uniquePapers.has(id)) uniquePapers.set(id, p);
        }
      }
    if (!uniquePapers.size) throw new Error("No public research results were returned.");

    const existing = new Set(deck.slides.map((s) => s.title.toLowerCase()));
    const candidates = [...uniquePapers.values()]
      .flatMap((p) => {
        if (!p.title || !p.abstractText || existing.has(text(p.title).toLowerCase())) return [];
        const abstract = text(p.abstractText);
        const relevance = topicOverlap(input.topic, `${p.title} ${abstract}`);
        if (relevance < 0.42) return [];
        const sentences = abstract
          .split(/(?<=[.!?])\s+(?=[A-Z])/)
          .filter((s) => s.length > 45 && s.length < 700);
        if (sentences.length < 2) return [];
        return [{ p, abstract, sentences, relevance }];
      })
      .sort((a, b) => b.relevance - a.relevance);

    const evidence: Slide[] = [];
    for (const { p, sentences } of candidates) {
      const title = text(p.title || "Research abstract");
      if (existing.has(title.toLowerCase())) continue;
      const url = p.pmid
        ? `https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`
        : p.doi
          ? `https://doi.org/${p.doi}`
          : `https://europepmc.org/article/${p.source || "MED"}/${p.id}`;
      const citation: Citation = {
        id: `europepmc-${p.source || "MED"}-${p.id}`,
        title,
        authors: p.authorString || "Authors not supplied",
        journal: p.journalInfo?.journal?.title || "Publication metadata requires verification",
        year: p.pubYear || "n.d.",
        doi: p.doi,
        pmid: p.pmid,
      };
      evidence.push({
        id: uid("evidence"),
        title,
        subtitle: "Published abstract — review in the original study",
        layout: "content",
        theme: "molecular",
        bullets: sentences.slice(0, 3),
        leftBullets: [],
        rightBullets: [],
        notes: `Abstract-derived source material, not an independent validation or systematic review. Check the complete study, limitations, figures and current publication status. Original source: ${url}`,
        citations: [citation],
        media: [],
      });
      existing.add(title.toLowerCase());
    }
    const original = deck.slides.filter((s) => s.title !== "Evidence required");
    const closing = original.filter((s) => /^(Key conclusions|Suggested reading)$/.test(s.title));
    const core = original.filter((s) => !closing.includes(s));
    const needed = Math.max(0, input.count - core.length - closing.length);
    const added = evidence.slice(0, needed);
    const slides = [...core, ...added, ...closing]
      .slice(0, input.count)
      .map((s, i) => ({ ...s, theme: cycleTheme(i, s.layout) }));
    const successful = responses.filter((r) => r.status === "fulfilled").length;
    const warnings =
      slides.length < input.count
        ? [
            `Requested ${input.count} slides; ${slides.length} topic-specific slides were found. ${added.length} research abstracts were included from ${successful} successful searches. Add more source material to reach the requested count without padding.`,
          ]
        : [];
    if (added.length)
      warnings.push(
        `${added.length} slides summarize retrieved publication abstracts from ${successful} successful searches. Review the full papers; this is not a systematic review or accuracy certification.`,
      );
    return { ...deck, slides, contentWarnings: warnings, updatedAt: Date.now() };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
