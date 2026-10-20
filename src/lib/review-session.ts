import { z } from "zod";
import { sha256, scientificReviewerForm } from "./scientific-review-pack.ts";
import { reviewerSchema, assessScientificReviews } from "./scientific-review-assessment.ts";
const hash = z.string().regex(/^[a-f0-9]{64}$/i);
const evidence = z.object({
  sourceUrl: z.string().max(2000),
  locator: z.string().max(1000),
  quote: z.string().max(20000),
  access: z.string().max(50),
});
const citation = z.object({
  title: z.string().max(2000),
  authors: z.string().max(4000).optional(),
  year: z.string().max(100).optional(),
  url: z.string().max(2000).optional(),
  doi: z.string().max(1000).optional(),
  pmid: z.string().max(100).optional(),
});
const packSchema = z.object({
  schema: z.literal("juw-scientific-review-1"),
  packHash: hash,
  deckHash: hash,
  createdAt: z.string().max(100),
  topic: z.string().max(2000),
  slides: z.number().int().min(1).max(400),
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        slide: z.number().int().min(1).max(400),
        field: z.string().max(100),
        text: z.string().max(20000),
        contentHash: hash,
        citations: z.array(citation).max(200).optional(),
        claims: z
          .array(
            z.object({
              text: z.string().max(3000),
              classification: z.string().max(100),
              evidence: z.array(evidence).max(100),
            }),
          )
          .max(100)
          .optional(),
        media: z
          .object({
            title: z.string().max(2000),
            credit: z.string().max(4000),
            source: z.string().max(2000),
            license: z.string().max(4000),
            src: z.string().max(8000000).optional(),
          })
          .optional(),
      }),
    )
    .min(1)
    .max(2000),
  sourceSnapshotHashes: z.array(z.object({ id: z.string().max(200), sha256: hash })).max(30),
});
export type ReviewerPack = z.infer<typeof packSchema>;
export type ScientificReviewForm = z.infer<typeof reviewerSchema>;
export async function openReviewerPack(text: string): Promise<ReviewerPack> {
  if (new TextEncoder().encode(text).length > 8 * 1024 * 1024)
    throw Error("Review pack exceeds 8 MB. Nothing was loaded.");
  const raw = JSON.parse(text);
  const checked = packSchema.safeParse(raw);
  if (!checked.success) throw Error("Invalid review pack structure.");
  const pack = checked.data;
  if (!Number.isFinite(Date.parse(pack.createdAt))) throw Error("Invalid review pack date.");
  if (
    new Set(pack.items.map((i) => i.id)).size !== pack.items.length ||
    pack.items.some((i) => i.slide > pack.slides)
  )
    throw Error("Invalid or duplicate review items.");
  const { packHash, ...content } = raw;
  if (packHash !== (await sha256(content))) throw Error("Review pack hash mismatch.");
  for (const item of raw.items) {
    const { id: _id, contentHash, ...fields } = item;
    if (contentHash !== (await sha256(fields))) throw Error("Review item hash mismatch.");
  }
  // Only typed presentation fields leave this boundary; unknown metadata and prior review status are not shown.
  return pack;
}
export function openReviewerDraft(pack: ReviewerPack, text: string): ScientificReviewForm {
  if (new TextEncoder().encode(text).length > 8 * 1024 * 1024)
    throw Error("Review draft exceeds 8 MB.");
  const draftSchema = reviewerSchema.extend({
    reviewer: reviewerSchema.shape.reviewer.extend({ id: z.string().max(200) }),
    decisions: z
      .array(
        reviewerSchema.shape.decisions.element.extend({
          sourceUrls: z.array(z.string()),
          redundantWith: z.array(z.string()),
        }),
      )
      .max(2000),
  });
  const parsed = draftSchema.safeParse(JSON.parse(text));
  if (!parsed.success) throw Error("Invalid reviewer form.");
  const form = parsed.data;
  if (
    form.packHash !== pack.packHash ||
    form.decisions.length !== pack.items.length ||
    new Set(form.decisions.map((d) => d.id)).size !== pack.items.length ||
    pack.items.some(
      (item) => !form.decisions.some((d) => d.id === item.id && d.contentHash === item.contentHash),
    )
  )
    throw Error("This form belongs to a different or changed review pack.");
  return form;
}
export function newReviewerDraft(pack: ReviewerPack): ScientificReviewForm {
  return scientificReviewerForm(pack, "");
}
export function reviewFormIssues(pack: ReviewerPack, form: ScientificReviewForm, now = Date.now()) {
  const report = assessScientificReviews(
    pack,
    [{ ...canonicalReviewerForm(form), completedAt: new Date(now).toISOString() }],
    now,
  );
  return report.errors.filter((e) => e !== "Exactly two separate reviewer attestations required");
}
export function reviewSourceUrl(raw: string) {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && !u.username && !u.password ? u.href : null;
  } catch {
    return null;
  }
}
export function draftCheckpoints(
  previous: { savedAt: number; form: ScientificReviewForm }[],
  form: ScientificReviewForm,
  now = Date.now(),
) {
  if (previous[0] && JSON.stringify(previous[0].form) === JSON.stringify(form))
    return previous.slice(0, 3);
  return [{ savedAt: now, form }, ...previous].slice(0, 3);
}

export function reviewRasterPreview(src?: string) {
  return src &&
    src.length <= 4700000 &&
    /^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/=\r\n]+$/i.test(src)
    ? src
    : null;
}

export function canonicalReviewerForm(form: ScientificReviewForm): ScientificReviewForm {
  return {
    ...form,
    decisions: form.decisions.map((d) => ({
      ...d,
      sourceUrls: [...new Set(d.sourceUrls.map((u) => u.trim()).filter(Boolean))],
      redundantWith: [...new Set(d.redundantWith.map((id) => id.trim()).filter(Boolean))],
    })),
  };
}
export function serializeReviewerDraft(form: ScientificReviewForm) {
  const text = JSON.stringify(form, null, 2);
  if (new TextEncoder().encode(text).length > 8 * 1024 * 1024)
    throw Error(
      "Review form exceeds 8 MB. Shorten overly long entries before saving; the open form has not changed.",
    );
  return text;
}
