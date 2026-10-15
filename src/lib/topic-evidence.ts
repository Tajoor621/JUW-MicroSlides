import type { Deck, GenerateInput, Slide, Citation } from "./types";
import { topicOverlap } from "./topic-content";
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
export async function enrichTopicEvidence(
  deck: Deck,
  input: GenerateInput,
  signal?: AbortSignal,
): Promise<Deck> {
  if (deck.slides.length >= input.count) return deck;
  const phrase = input.topic.replace(/["\\]/g, " ").slice(0, 300);
  const response = await fetch(
    `https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&resultType=core&pageSize=20&query=${encodeURIComponent(`"${phrase}"`)}`,
    { credentials: "omit", signal: signal || AbortSignal.timeout(10000) },
  );
  if (!response.ok) throw new Error("Live research abstracts are unavailable.");
  const data = await response.json();
  const papers = (data.resultList?.result ?? []) as {
    id?: string;
    source?: string;
    title?: string;
    abstractText?: string;
    authorString?: string;
    pubYear?: string;
    journalInfo?: { journal?: { title?: string } };
    doi?: string;
    pmid?: string;
    isOpenAccess?: string;
  }[];
  const existing = new Set(deck.slides.map((s) => s.title.toLowerCase()));
  const evidence: Slide[] = [];
  for (const p of papers) {
    if (!p.title || !p.abstractText || existing.has(p.title.toLowerCase())) continue;
    if (topicOverlap(input.topic, `${p.title} ${text(p.abstractText)}`) < 0.5) continue;
    const abstract = text(p.abstractText);
    const sentences = abstract
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .filter((s) => s.length > 40 && s.length < 700);
    if (sentences.length < 2) continue;
    const url = p.pmid
      ? `https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`
      : p.doi
        ? `https://doi.org/${p.doi}`
        : `https://europepmc.org/article/${p.source || "MED"}/${p.id}`;
    const citation: Citation = {
      id: `europepmc-${p.source || "MED"}-${p.id}`,
      title: text(p.title),
      authors: p.authorString || "Authors not supplied",
      journal: p.journalInfo?.journal?.title || "Publication metadata requires verification",
      year: p.pubYear || "n.d.",
      doi: p.doi,
      pmid: p.pmid,
    };
    evidence.push({
      id: uid("evidence"),
      title: text(p.title),
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
    existing.add(p.title.toLowerCase());
  }
  const original = deck.slides.filter((s) => s.title !== "Evidence required");
  const closing = original.filter((s) => /^(Key conclusions|Suggested reading)$/.test(s.title));
  const core = original.filter((s) => !closing.includes(s));
  const needed = Math.max(0, input.count - core.length - closing.length);
  const added = evidence.slice(0, needed);
  const slides = [...core, ...added, ...closing]
    .slice(0, input.count)
    .map((s, i) => ({ ...s, theme: cycleTheme(i, s.layout) }));
  const warnings =
    slides.length < input.count
      ? [
          `Requested ${input.count} slides; ${slides.length} topic-specific draft slides are available. No unrelated filler was inserted.`,
        ]
      : [];
  if (added.length)
    warnings.push(
      `${added.length} slides use retrieved publication abstracts. These are source summaries, not a systematic review or a scientific accuracy certification.`,
    );
  return { ...deck, slides, contentWarnings: warnings, updatedAt: Date.now() };
}
