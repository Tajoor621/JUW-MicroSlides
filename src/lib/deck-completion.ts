import { MAX_SLIDES, type Deck } from "./types";

export class DeckCompletionError extends Error {
  constructor(
    public readonly requested: number,
    public readonly available: number,
    detail = "",
  ) {
    super(
      `The ${requested}-slide deck is not complete yet (${available} usable slides). ${detail || "Connect to research sources, paste more topic material, or configure a local AI model, then retry."}`,
    );
    this.name = "DeckCompletionError";
  }
}
export function requestedCount(value: number) {
  return Math.min(MAX_SLIDES, Math.max(1, Math.round(value) || 1));
}
/** A generation succeeds only when the actual deck matches the requested size. */
export function assertCompleteDeck(deck: Deck, count: number) {
  const target = requestedCount(count);
  const usable = deck.slides.filter((s) => s.title !== "Evidence required");
  if (usable.length !== target || deck.slides.length !== target)
    throw new DeckCompletionError(target, usable.length);
  if (usable[0]?.layout !== "title")
    throw new Error("The deck must start with its topic introduction.");
  if (
    usable
      .slice(1)
      .some(
        (s) =>
          !s.title.trim() ||
          ![...s.bullets, ...s.leftBullets, ...s.rightBullets].some((b) => b.trim()),
      )
  )
    throw new Error("A generated content slide is empty. Add source material and retry.");
  return deck;
}
