import { reconcileClaims, slideStatements } from "./deck-integrity";
import { teachingSchema } from "./teaching-schema";
import type { Deck, Slide } from "./types";

/** Copy only existing, source-linked scientific wording. Never attest or invent it. */
export function completeSourcedTeaching(slide: Slide): Slide {
  let filled = false;
  const p = teachingSchema.parse(slide.teaching || {});
  const supported = (slide.claims || [])
    .filter((c) =>
      c.evidence.some(
        (e) =>
          e.quote.includes(c.text) &&
          slide.citations.some(
            (r) =>
              r.id === e.citationId &&
              !["retracted", "corrected", "concern", "notice"].includes(
                r.publicationCheck?.status || "",
              ),
          ),
      ),
    )
    .map((c) => c.text)
    .filter((text) => text.length <= 3000);
  const concise = supported.filter((text) => text.split(/\s+/).length <= 40);
  const fill = (
    key: "definition" | "mechanism" | "takeaway" | "limitation" | "pitfall",
    text?: string,
  ) => {
    if (!p[key] && text) {
      p[key] = text;
      filled = true;
    }
  };
  fill(
    "definition",
    supported.find((s) => /\b(is|are|refers to|defined as|consists of)\b/i.test(s)),
  );
  fill(
    "mechanism",
    supported.find((s) =>
      /\b(because|mediates?|through|cataly[sz]es?|binds?|inhibits?|regulates?)\b/i.test(s),
    ),
  );
  fill("takeaway", concise[0]);
  fill(
    "limitation",
    supported.find((s) => /\b(limitation|limited by|depends on|condition-dependent)\b/i.test(s)),
  );
  fill(
    "pitfall",
    supported.find((s) =>
      /\b(not always|does not imply|should not be|cannot be assumed)\b/i.test(s),
    ),
  );
  return filled ? { ...slide, teaching: p } : slide;
}

/** Safe mechanical corrections preserve slide count, source records and Undo data. */
export function improveDraft(deck: Deck) {
  const changes: { index: number; message: string }[] = [],
    seen = new Set<string>();
  const slides = deck.slides.map((slide, index) => {
    let remaining = slideStatements(slide).length;
    const removed: string[] = [];
    const keep = (text: string) => {
      if (seen.has(text) && remaining > 1) {
        remaining--;
        removed.push(text);
        return false;
      }
      seen.add(text);
      return true;
    };
    if (slide.locked) {
      slideStatements(slide).forEach((s) => seen.add(s));
      return slide;
    }
    let next = {
      ...slide,
      bullets: slide.bullets.filter(keep),
      leftBullets: slide.leftBullets.filter(keep),
      rightBullets: slide.rightBullets.filter(keep),
    };
    if (removed.length) {
      changes.push({
        index,
        message: `${removed.length} identical repeated teaching point(s) moved to notes; slide count preserved.`,
      });
      next.notes = `${slide.notes}\n\nAutomatic cleanup — exact repeated points retained here for provenance:\n${removed.join("\n")}`;
      next = reconcileClaims(next);
    }
    if (next.claims?.length && next.layout !== "title") {
      const completed = completeSourcedTeaching(next);
      if (JSON.stringify(completed.teaching) !== JSON.stringify(next.teaching)) {
        changes.push({
          index,
          message:
            "Filled available teaching fields with verbatim source-linked wording; scientific review status unchanged.",
        });
        next = completed;
      }
    }
    return next;
  });
  return { deck: changes.length ? { ...deck, slides } : deck, changes };
}
