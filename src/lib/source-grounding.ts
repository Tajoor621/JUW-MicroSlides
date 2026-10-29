import type { Deck, Slide } from "./types";
const normal = (s: string) => s.replace(/\s+/g, " ").trim();
/** Conservative extractive support, not semantic entailment or independent scientific verification. */
export function supportedSlideSentences(slide: Slide) {
  if (!slide.citations.length) return [];
  const sources =
    slide.claims?.flatMap((c) =>
      c.evidence
        .filter(
          (e) =>
            e.citationId &&
            slide.citations.some((ref) => ref.id === e.citationId) &&
            /^https?:\/\//.test(e.sourceUrl),
        )
        .map((e) => ({
          quote: e.quote,
          url: e.sourceUrl,
          citationId: e.citationId!,
          access: e.access,
          checkedAt: e.checkedAt,
        })),
    ) || [];
  return [...slide.bullets, ...slide.leftBullets, ...slide.rightBullets].flatMap((text) => {
    if (!text.trim()) return [];
    const evidence = sources.find((e) => normal(e.quote).includes(normal(text)));
    return evidence ? [{ text, ...evidence }] : [];
  });
}
export function checkResearchClaims(deck: Deck) {
  return {
    ...deck,
    slides: deck.slides.map((s) => {
      if (!s.id.startsWith("research")) return s;
      const supported = supportedSlideSentences(s);
      if (!supported.length)
        throw Error(
          `Source needed: “${s.title}” has no passage-supported teaching statements. Your existing deck has been kept.`,
        );
      return {
        ...s,
        bullets: s.bullets.filter((t) => supported.some((v) => v.text === t)),
        leftBullets: s.leftBullets.filter((t) => supported.some((v) => v.text === t)),
        rightBullets: s.rightBullets.filter((t) => supported.some((v) => v.text === t)),
      };
    }),
  };
}
