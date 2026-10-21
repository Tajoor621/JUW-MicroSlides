import { teachingVerificationProblem } from "./teaching-verification";
import { integrityAudit } from "./deck-integrity";
import { teachingFindings } from "./teaching";
import type { Deck } from "./types";
export function teachingContentFindings(deck: Deck) {
  return [
    ...(deck.slides.length < 1 || deck.slides.length > 50
      ? [
          {
            index: 0,
            message:
              "Teaching export requires 1–50 slides. Legacy archives remain available through recovery backups.",
          },
        ]
      : []),
    ...integrityAudit(deck)
      .filter((f) => f.severity === "critical")
      .map((f) => ({ index: f.index, message: f.message })),
    ...teachingFindings(deck),
  ];
}
export function teachingReleaseFindings(deck: Deck) {
  const problem = teachingVerificationProblem(deck);
  return [...teachingContentFindings(deck), ...(problem ? [{ index: 0, message: problem }] : [])];
}
export function teachingReady(deck: Deck) {
  return teachingReleaseFindings(deck).length === 0;
}
export function assertTeachingReady(deck: Deck) {
  const issues = teachingReleaseFindings(deck);
  if (issues.length)
    throw new Error(
      `Teaching export blocked: slide ${issues[0].index + 1}: ${issues[0].message} (${issues.length} unresolved findings). Recovery backups remain available.`,
    );
}
