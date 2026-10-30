import type { Deck, Slide } from "./types";
import { sourcePassages, passageContainsStatement } from "./generation-grounding";
/** Extractive support for complete source statements, not semantic/human verification. */
export function supportedSlideSentences(slide: Slide, sourceDocuments?: Deck["sourceDocuments"]) {
  const bank = sourcePassages({ slides: [slide], sourceDocuments });
  return [...slide.bullets, ...slide.leftBullets, ...slide.rightBullets].flatMap((text) => {
    const source = bank.find((p) => passageContainsStatement(p.quote, text));
    return source
      ? [
          {
            text,
            quote: source.quote,
            url: source.sourceUrl,
            citationId: source.citation.id,
            access: source.access,
            checkedAt: source.checkedAt,
          },
        ]
      : [];
  });
}
export function checkResearchClaims(deck: Deck) {
  return {
    ...deck,
    slides: deck.slides.map((s) => {
      const bank = sourcePassages({ slides: [s], sourceDocuments: deck.sourceDocuments });
      if (!bank.length) {
        if (s.claims?.some((c) => c.status === "supported-excerpt" && c.evidence.length))
          throw Error(
            `Source needed: “${s.title}” has inconsistent stored passage provenance. Your existing deck has been kept.`,
          );
        return s;
      }
      const supported = supportedSlideSentences(s, deck.sourceDocuments);
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
