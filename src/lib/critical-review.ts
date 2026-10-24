import { integrityAudit } from "./deck-integrity";
import { reviewDeck, type ReviewIssue } from "./research-review";
import type { Deck } from "./types";
const criticalCategories = new Set([
  "Reference mismatch",
  "Source identity changed",
  "Publication notice",
  "Unlinked source identifier",
  "Source quotation mismatch",
  "Empty teaching slide",
]);
/** Missing sign-offs/coverage are evidence tasks, not detected scientific errors. */
export function criticalFindings(deck: Deck): ReviewIssue[] {
  return [
    ...reviewDeck(deck).filter((i) => i.severity === "high"),
    ...integrityAudit(deck)
      .filter((i) => i.severity === "critical" && criticalCategories.has(i.category))
      .map((i, n) => ({
        id: `critical-${n}`,
        index: i.index,
        slideId: i.slideId,
        severity: "high" as const,
        category: i.category,
        quote: i.quote,
        problem: i.message,
        suggestion:
          "Inspect the original source and correct the affected content. Editable PPTX downloads remain available.",
      })),
  ];
}
