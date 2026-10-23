import { lectureFindings } from "./lecture-readiness";
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
    ...lectureFindings(deck),
  ];
}
export function teachingReleaseFindings(deck: Deck) {
  const problem = teachingVerificationProblem(deck);
  return [...teachingContentFindings(deck), ...(problem ? [{ index: 0, message: problem }] : [])];
}
export function teachingReady(deck: Deck) {
  return teachingReleaseFindings(deck).length === 0;
}
/** Review queue, grouped by reason and affected slide, rather than error totals. */
export function groupedReviewNotes(issues: ReturnType<typeof teachingReleaseFindings>) {
  const groups = new Map<string, { message: string; indices: number[] }>();
  for (const issue of issues) {
    let message = issue.message.replace(/^[\w.]+: /, "");
    if (/^Overlaps slide/.test(message))
      message = "Compare overlapping teaching points and their sources.";
    else if (/Record a decision and a specific rationale/.test(message))
      message = "Instructor review is pending for populated teaching fields.";
    const group = groups.get(message) || { message, indices: [] };
    if (!group.indices.includes(issue.index)) group.indices.push(issue.index);
    groups.set(message, group);
  }
  return [...groups.values()];
}
export function assertTeachingReady(deck: Deck) {
  const issues = teachingReleaseFindings(deck);
  if (issues.length)
    throw new Error(
      `Teaching export blocked: slide ${issues[0].index + 1}: ${issues[0].message} (${issues.length} unresolved findings). Recovery backups remain available.`,
    );
}
