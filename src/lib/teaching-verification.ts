import { TEACHING_DIAGRAM_REVISION } from "./teaching-schema";
import { z } from "zod";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import type { Deck } from "./types";
export const teachingVerificationSchema = z.object({
  instructor: z.string().trim().min(1).max(100),
  at: z.number().finite().positive(),
  snapshot: z.string().regex(/^[a-f0-9]{64}$/),
});
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}
export function teachingDeckSnapshot(deck: Deck) {
  const {
    id: _id,
    teachingVerification: _verification,
    updatedAt: _updated,
    revisionId: _revision,
    mediaPool: _pool,
    ...content
  } = deck;
  return bytesToHex(
    sha256(
      utf8ToBytes(
        JSON.stringify(
          canonical({
            ...content,
            teachingTemplateRevision: deck.slides.some((s) => s.teaching?.diagram)
              ? TEACHING_DIAGRAM_REVISION
              : undefined,
          }),
        ),
      ),
    ),
  );
}
export function teachingVerificationProblem(deck: Deck) {
  const parsed = teachingVerificationSchema.safeParse(deck.teachingVerification);
  if (!parsed.success)
    return "Record an explicit named instructor verification after reviewing the deck; the prepared-by header is not verification.";
  if (parsed.data.at > Date.now()) return "Instructor verification cannot be dated in the future.";
  if (parsed.data.snapshot !== teachingDeckSnapshot(deck))
    return "The deck changed after instructor verification. Review it and record a new verification.";
  return null;
}
