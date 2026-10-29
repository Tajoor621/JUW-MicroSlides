import { educationalNotesFromDeck } from "./educational-notes";
import { generateLocalDeck, dedicatedLecture } from "./generate-deck";
import { enrichTopicEvidence } from "./topic-evidence";
import { inferFocus } from "./topic-engine";
import { assertGenerationBiosafety } from "./biosafety";
import type { Deck, GenerateInput, Level } from "./types";

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
    count: 3,
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
  return educationalNotesFromDeck(deck);
}
