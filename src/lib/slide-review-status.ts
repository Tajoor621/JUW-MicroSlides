import { claimReviewIsCurrent, surfaceFindings, surfaceItems } from "./surface-review";
import type { Deck, Slide } from "./types";
export type SlideReviewStatus = "draft" | "reviewed";
/** Derived from current evidence snapshots: never trust an imported 'reviewed' label. */
export function slideReviewStatus(deck: Deck, slide: Slide): SlideReviewStatus {
  const claims = slide.claims || [];
  return surfaceItems(slide).length > 0 &&
    surfaceFindings(deck, slide).length === 0 &&
    claims.every((c) => claimReviewIsCurrent(deck, c))
    ? "reviewed"
    : "draft";
}
