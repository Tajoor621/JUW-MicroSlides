import { z } from "zod";
import { duplicateStatements, reconcileClaims } from "./deck-integrity";
import { mediaKey } from "./utils";
import type { Deck, Slide } from "./types";
const proposalSchema = z.object({
  title: z.string().trim().min(1).max(1000),
  bullets: z.array(z.string().trim().min(1).max(3000)).min(1).max(12),
  notes: z.string().max(10000).optional(),
});
export function replacementSnapshot(deck: Deck, slide: Slide) {
  return JSON.stringify([deck.id, deck.topic, deck.discipline, deck.level, slide]);
}
export function inspectedReplacement(
  deck: Deck,
  slideId: string,
  proposal: unknown,
  snapshot: string,
  keepFigures: boolean,
) {
  if (deck.slides.length > 50)
    throw Error(
      "Legacy archive preserved. Make an explicit copy with at most 50 slides before replacing content.",
    );
  const index = deck.slides.findIndex((s) => s.id === slideId),
    slide = deck.slides[index];
  if (!slide || replacementSnapshot(deck, slide) !== snapshot)
    throw Error(
      "The slide or research context changed after drafting. Discard this proposal and review a fresh replacement.",
    );
  if (slide.locked || slide.layout === "title")
    throw Error("Select an unlocked teaching slide before applying a replacement.");
  const parsed = proposalSchema.safeParse(proposal);
  if (!parsed.success)
    throw Error(
      "Provide a nonempty title and 1–12 substantive teaching points within the supported text limits.",
    );
  const p = parsed.data;
  const replacement = reconcileClaims({
    ...slide,
    title: p.title,
    subtitle: "",
    bullets: p.bullets,
    leftBullets: [],
    rightBullets: [],
    claims: [],
    citations: [],
    notes: p.notes || "",
    media: keepFigures ? slide.media : [],
  });
  const slides = deck.slides.map((s, i) => (i === index ? replacement : s));
  if (duplicateStatements(slides).some((d) => d.first === index || d.second === index))
    throw Error(
      "Replacement overlaps another teaching statement. Revise the proposal before applying.",
    );
  const pool = [...(deck.mediaPool || [])];
  if (!keepFigures)
    for (const m of slide.media)
      if (!pool.some((other) => other.id === m.id || mediaKey(other.src) === mediaKey(m.src)))
        pool.push(m);
  return { slides, mediaPool: pool };
}
