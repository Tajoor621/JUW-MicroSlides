import type { Slide } from "./types";
/** Publication continuity is a screening condition, never patient identity verification. */
export function caseContinuityProblem(slides: Slide[], supplied: boolean[]) {
  const numbers = [...new Set(slides.flatMap((s) => (s.caseData ? [s.caseData.caseNumber] : [])))];
  for (const number of numbers) {
    const indices = slides.flatMap((s, i) => (s.caseData?.caseNumber === number ? [i] : []));
    if (indices.every((i) => supplied[i])) continue;
    if (indices.some((i) => supplied[i]))
      return `Case ${number} mixes supplied notes with an unrelated research lookup. Supply both phases from the same case.`;
    const urls = indices.map(
      (i) => new Set((slides[i].claims || []).flatMap((c) => c.evidence.map((e) => e.sourceUrl))),
    );
    if (!urls[0]?.size || ![...urls[0]].some((url) => urls.every((set) => set.has(url))))
      return `Case ${number} has no shared source across its presentation and resolution. Add both phases from one case report or labelled instructor case notes; different patients must not be combined.`;
  }
  return "";
}
