import type { Slide } from "./types";
import { citationMatchesUrl } from "./teaching";
/** Evidence category is descriptive; it is not a study-quality score or certification. */
export function slideEvidenceBasis(slide: Slide) {
  const result: Record<string, string[]> = {};
  const names = {
    primary: "Primary experimental data",
    review: "Review",
    textbook: "Textbook consensus",
  };
  const add = (key: string, urls: string[], ids: string[] = []) => {
    result[key] = [
      ...new Set(
        slide.citations
          .filter((c) => ids.includes(c.id) || urls.some((url) => citationMatchesUrl(c, url)))
          .flatMap((c) => (c.evidenceKind ? [names[c.evidenceKind]] : [])),
      ),
    ];
  };
  for (const r of slide.surfaceReviews || []) if (r.sourceUrl) add(r.field, [r.sourceUrl]);
  for (const [i, text] of [
    ...slide.bullets,
    ...slide.leftBullets,
    ...slide.rightBullets,
  ].entries()) {
    const c = slide.claims?.find((c) => c.text === text);
    if (c)
      add(
        `bullet.${i}`,
        c.evidence.map((e) => e.sourceUrl),
        c.evidence.flatMap((e) => (e.citationId ? [e.citationId] : [])),
      );
  }
  for (const [i, q] of (slide.teaching?.quantitative || []).entries())
    add(`teaching.quantitative.${i}`, [q.sourceUrl]);
  return result;
}
