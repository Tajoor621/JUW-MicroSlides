import { prepareTeachingDeck } from "./teaching";
import { duplicateStatements } from "./deck-integrity";
import { MAX_SLIDES, type Deck } from "./types";

export class DeckCompletionError extends Error {
  constructor(
    public readonly requested: number,
    public readonly available: number,
    public readonly detail = "",
  ) {
    super(
      `The ${requested}-slide deck is not complete yet (${available} usable slides). ${detail || "Connect to research sources, paste more topic material, or configure a local AI model, then retry."}`,
    );
    this.name = "DeckCompletionError";
  }
}
/** Reserved objective/assessment slots must not leak as the user's requested count. */
export function generationFailureMessage(error: unknown, total: number) {
  if (error instanceof DeckCompletionError)
    return new DeckCompletionError(total, error.available, error.detail).message;
  return error instanceof Error
    ? error.message
    : "The requested deck could not be completed. Add source material and retry.";
}
export function requestedCount(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > MAX_SLIDES)
    throw new Error(`Choose an integer slide count from 1 to ${MAX_SLIDES}.`);
  return value;
}
/** A generation succeeds only when the actual deck matches the requested size. */
export function assertCompleteDeck(deck: Deck, count: number) {
  const target = requestedCount(count);
  const usable = deck.slides.filter((s) => s.title !== "Evidence required");
  if (usable.length !== target || deck.slides.length !== target)
    throw new DeckCompletionError(target, usable.length);
  if (target > 1 && usable[0]?.layout !== "title")
    throw new Error("The deck must start with its topic introduction.");
  if (
    usable
      .filter((_, index) => index > 0 || target === 1)
      .some(
        (s) =>
          !s.title.trim() ||
          ![
            ...s.bullets,
            ...s.leftBullets,
            ...s.rightBullets,
            s.keyTakeaway || "",
            s.clinicalPearl || "",
            ...(s.learningObjectives || []),
            ...(s.assessment || []).map((q) => q.question),
            ...(s.protocol?.steps || []).map((p) => p.action),
            s.caseData?.vignette || "",
            s.caseData?.results || "",
          ].some((b) => b.trim()),
      )
  )
    throw new Error("A generated content slide is empty. Add source material and retry.");
  if (usable.some((s, index) => (index > 0 || target === 1) && s.layout === "title"))
    throw new Error(
      "Only a multi-slide deck's opening may use the title layout; teaching slides need substantive visible content.",
    );
  const duplicates = duplicateStatements(usable);
  if (duplicates.length)
    throw new Error(
      `Repetition detected on slide ${duplicates[0].second + 1}; the deck has not replaced your work.`,
    );
  return prepareTeachingDeck(deck);
}
