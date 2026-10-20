import { z } from "zod";
import { makeScientificReviewPack, sha256 } from "./scientific-review-pack.ts";
import type { Deck } from "./types";
type AssessmentPack = {
  packHash: string;
  createdAt: string;
  items: { id: string; contentHash: string }[];
};
const reviewerSchema = z.object({
  packHash: z.string().max(100),
  reviewer: z.object({
    id: z.string().min(1).max(200),
    credentials: z.string().max(3000),
    independent: z.boolean(),
    conflictDeclaration: z.string().max(3000),
  }),
  completedAt: z.string().max(100),
  decisions: z
    .array(
      z.object({
        id: z.string().max(100),
        contentHash: z.string().max(100),
        verdict: z.enum(["pending", "supported", "revise", "remove", "not-factual"]),
        rationale: z.string().max(10000),
        sourceUrls: z.array(z.string().max(2000)).max(30),
        redundantWith: z.array(z.string().max(100)).max(2000),
      }),
    )
    .max(2000),
});
export function assessScientificReviews(
  pack: AssessmentPack,
  reviews: unknown[],
  now = Date.now(),
) {
  const errors = [],
    accepted: z.infer<typeof reviewerSchema>[] = [];
  const people = new Set();
  for (const raw of reviews) {
    const parsed = reviewerSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push("Invalid reviewer form structure");
      continue;
    }
    const r = parsed.data;
    if (!r.reviewer?.id.trim() || people.has(r.reviewer.id.trim().toLowerCase())) {
      errors.push("Missing or duplicate reviewer identity");
      continue;
    }
    people.add(r.reviewer.id.trim().toLowerCase());
    if (r.packHash !== pack.packHash) errors.push(`Stale review: ${r.reviewer.id}`);
    if (
      r.reviewer.independent !== true ||
      !r.reviewer.credentials?.trim() ||
      !r.reviewer.conflictDeclaration?.trim()
    )
      errors.push(`Reviewer attestation incomplete: ${r.reviewer.id}`);
    const date = Date.parse(r.completedAt);
    if (!Number.isFinite(date) || date > now || date < Date.parse(pack.createdAt))
      errors.push(`Invalid review date: ${r.reviewer.id}`);
    if (!Array.isArray(r.decisions)) {
      errors.push("Missing decisions");
      continue;
    }
    if (
      new Set(r.decisions.map((d) => d.id)).size !== r.decisions.length ||
      r.decisions.length !== pack.items.length
    )
      errors.push("Duplicate or incomplete decisions");
    for (const item of pack.items) {
      const d = r.decisions.find((d) => d.id === item.id);
      if (
        !d ||
        d.contentHash !== item.contentHash ||
        !["supported", "revise", "remove", "not-factual"].includes(d.verdict) ||
        !d.rationale?.trim() ||
        !Array.isArray(d.sourceUrls)
      ) {
        errors.push(`Incomplete decision ${item.id}`);
        continue;
      }
      if (
        !Array.isArray(d.redundantWith) ||
        d.redundantWith.some((id) => id === item.id || !pack.items.some((i) => i.id === id))
      )
        errors.push(`Invalid redundancy decisions ${item.id}`);
      if (
        d.verdict === "supported" &&
        !d.sourceUrls.some((url) => {
          try {
            const u = new URL(url);
            return u.protocol === "https:" && !u.username && !u.password;
          } catch {
            return false;
          }
        })
      )
        errors.push(`Missing scientific source ${item.id}`);
    }
    accepted.push(r);
  }
  if (reviews.length !== 2) errors.push("Exactly two separate reviewer attestations required");
  const disagreements = pack.items
    .filter(
      (item) =>
        new Set(accepted.map((r) => r.decisions.find((d) => d.id === item.id)?.verdict)).size > 1,
    )
    .map((i) => i.id);
  const corrections = pack.items
    .filter((item) =>
      accepted.some(
        (r) =>
          ["revise", "remove"].includes(r.decisions.find((d) => d.id === item.id)?.verdict ?? "") ||
          r.decisions.find((d) => d.id === item.id)?.redundantWith?.length,
      ),
    )
    .map((i) => i.id);
  return {
    status: errors.length
      ? "incomplete"
      : disagreements.length || corrections.length
        ? "corrections-or-adjudication-required"
        : "two-reviewer-attestations-complete",
    errors: [...new Set(errors)],
    disagreements,
    corrections,
    independentlyVerified: false,
    scientificCertification: false,
    limitations:
      "Identity, qualifications and independence are self-attested, not authenticated by this tool. Coordinator must verify reviewers and adjudicate disagreements. Edits require a new pack and review. This report never changes app classroom readiness.",
  };
}

export async function validateScientificReviewReturns(
  deck: Deck,
  packText: string,
  formTexts: string[],
) {
  const pack = JSON.parse(packText);
  if (
    !pack ||
    pack.schema !== "juw-scientific-review-1" ||
    !Array.isArray(pack.items) ||
    !pack.items.length ||
    pack.items.length > 2000 ||
    !Number.isFinite(Date.parse(pack.createdAt))
  )
    throw Error("Invalid scientific review pack.");
  const { packHash, ...content } = pack;
  if (packHash !== (await sha256(content))) throw Error("Review pack content hash mismatch.");
  for (const item of pack.items) {
    const { id: _id, contentHash, ...fields } = item;
    if ((await sha256(fields)) !== contentHash) throw Error("A review item has been changed.");
  }
  const current = await makeScientificReviewPack(deck);
  if (
    pack.topic !== current.topic ||
    pack.slides !== current.slides ||
    JSON.stringify(
      pack.items.map((i: { id: string; contentHash: string }) => [i.id, i.contentHash]),
    ) !== JSON.stringify(current.items.map((i) => [i.id, i.contentHash])) ||
    JSON.stringify(pack.sourceSnapshotHashes) !== JSON.stringify(current.sourceSnapshotHashes)
  )
    throw Error(
      "The deck or saved evidence changed after this review pack. Create a new pack and obtain new decisions.",
    );
  return {
    ...assessScientificReviews(
      pack,
      formTexts.map((text) => JSON.parse(text)),
    ),
    packHash,
    checkedAt: new Date().toISOString(),
  };
}
