import { generateLocalDeck, dedicatedLecture } from "./generate-deck";
import { enrichTopicEvidence } from "./topic-evidence";
import { formatCitation } from "./citations";
import { inferFocus } from "./topic-engine";
import { assertGenerationBiosafety } from "./biosafety";
import type { Deck, GenerateInput, Level } from "./types";

export function notesMarkdown(deck: Deck) {
  const blocks = deck.slides
    .filter((s) => s.layout !== "title")
    .map((s) => {
      const body = [...s.bullets, ...s.leftBullets, ...s.rightBullets]
        .map((b) => `- ${b}`)
        .join("\n");
      return `## ${s.title}\n\n${body}\n\n${s.notes || ""}\n\n${s.citations.map((c) => `Source: ${formatCitation(c, "Vancouver")}\n${c.doi ? `https://doi.org/${c.doi}` : c.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${c.pmid}/` : c.url || ""}`).join("\n\n")}`;
    });
  if (!blocks.length)
    throw Error("No usable notes found. Add source material or try a narrower topic.");
  return `# ${deck.topic}\n\nStudy notes · ${deck.level} · ${new Date().toISOString().slice(0, 10)}\n\nDraft source summaries; check the original publications before teaching.\n\n${blocks.join("\n\n")}`;
}
export async function generateWritingNotes(
  request: { topic: string; sources: string; level: Level; mode: "manual" | "ai" },
  signal: AbortSignal,
  progress: (message: string) => void,
  ai?: (input: GenerateInput) => Promise<Deck>,
) {
  const topic = request.topic.trim();
  if (!topic) throw Error("Enter a notes topic first.");
  const discipline = inferFocus(topic).discipline || "General Microbiology";
  const input: GenerateInput = {
    ...dedicatedLecture(topic, discipline),
    topic,
    discipline,
    count: 6,
    level: request.level,
    notes: request.sources,
    mode: request.mode,
    researchDepth: "thorough",
    generationMode: "standard",
    includeObjectives: false,
    includeAssessment: false,
  };
  assertGenerationBiosafety(input);
  signal.throwIfAborted();
  let deck = generateLocalDeck(input);
  if (request.mode === "ai") {
    if (!ai) throw Error("Configure a local AI model in Settings, or choose Knowledge research.");
    progress("Writing topic notes with the configured model…");
    deck = await ai(input);
  } else if (typeof navigator !== "undefined" && navigator.onLine && !request.sources.trim()) {
    progress("Searching publications and open full text for the notes topic…");
    deck = await enrichTopicEvidence(
      { ...deck, slides: deck.slides.filter((s) => s.layout === "title").slice(0, 1) },
      input,
      signal,
      progress,
    );
  }
  signal.throwIfAborted();
  return notesMarkdown(deck);
}
