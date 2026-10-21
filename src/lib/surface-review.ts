import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { z } from "zod";
import type { Deck, Slide } from "./types";
import { guidanceNeedsReview } from "./source-documents";

const https = z
  .string()
  .url()
  .max(2000)
  .refine((raw) => {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password;
  }, "Use a public HTTPS source without credentials");
export const surfaceReviewSchema = z.object({
  field: z.string().max(300),
  snapshot: z.string().regex(/^[a-f0-9]{64}$/),
  verdict: z.enum(["supported", "not-factual"]),
  rationale: z.string().trim().min(20).max(10000),
  reviewedAt: z.number().finite(),
  sourceUrl: https.optional(),
  quote: z.string().max(100000).optional(),
  locator: z.string().max(1000).optional(),
});
export type SurfaceReview = z.infer<typeof surfaceReviewSchema>;
export function surfaceItems(slide: Slide) {
  return [
    ...(["title", "subtitle", "notes"] as const).flatMap((field) =>
      slide[field].trim() ? [{ field, text: slide[field], media: false }] : [],
    ),
    ...slide.media.map((m, i) => ({ field: `media.${i}`, text: m.title, media: true })),
  ];
}
// Exact serialized context invalidates attestations after scientific content or provenance changes.
// Bind actual image data so retaining an original URL cannot hide a replaced figure.
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, canonical(record[key])]),
    );
  }
  return value;
}
export function surfaceSnapshot(deck: Deck, slide: Slide, field: string) {
  return bytesToHex(
    sha256(
      utf8ToBytes(
        JSON.stringify(
          canonical({
            field,
            topic: deck.topic,
            discipline: deck.discipline,
            level: deck.level,
            title: slide.title,
            subtitle: slide.subtitle,
            notes: slide.notes,
            bullets: slide.bullets,
            leftBullets: slide.leftBullets,
            rightBullets: slide.rightBullets,
            media: slide.media.map((m) => ({
              id: m.id,
              kind: m.kind,
              title: m.title,
              src: m.src,
              credit: m.credit,
              source: m.source,
              license: m.license,
              licenseUrl: m.licenseUrl,
            })),
            citations: slide.citations.map(({ publicationCheck: _check, ...citation }) => citation),
            sources: (deck.sourceDocuments || []).map(({ text: _text, ...metadata }) => metadata),
          }),
        ),
      ),
    ),
  );
}
export function surfaceReviewProblem(
  deck: Deck,
  slide: Slide,
  field: string,
  raw: unknown,
  now = Date.now(),
) {
  const parsed = surfaceReviewSchema.safeParse(raw);
  if (!parsed.success) return "Record a decision and a specific rationale for this field.";
  const review = parsed.data;
  const item = surfaceItems(slide).find((i) => i.field === field);
  if (!item || review.field !== field || review.snapshot !== surfaceSnapshot(deck, slide, field))
    return "Content or source context changed; review this field again.";
  if (review.reviewedAt <= 0 || review.reviewedAt > now) return "Record a valid review date.";
  if (item.media) {
    const media = slide.media[Number(field.split(".")[1])];
    if (!/^data:image\//.test(media.src))
      return "Save a local image snapshot before reviewing this figure; remote URLs can change.";
    if (review.verdict !== "supported")
      return "Inspect the attached figure and record its source support.";
    if (
      !https.safeParse(media.source).success ||
      !media.credit.trim() ||
      /unknown|not supplied/i.test(media.credit) ||
      !media.license.trim() ||
      /unknown|verify|open licen[cs]e|pmc open access/i.test(media.license)
    )
      return "Record the figure's original HTTPS source, creator and actual reuse terms.";
  }
  if (review.verdict === "not-factual") return null;
  if (
    !review.sourceUrl ||
    !review.quote ||
    review.quote.trim().length < 20 ||
    !review.locator?.trim()
  )
    return "Factual content needs an exact supporting passage, HTTPS source and locator.";
  const source = new URL(review.sourceUrl);
  let sourceId = "";
  if (["doi.org", "dx.doi.org", "pubmed.ncbi.nlm.nih.gov"].includes(source.hostname)) {
    try {
      sourceId = decodeURIComponent(source.pathname)
        .replace(/^\/|\/$/g, "")
        .toLowerCase();
    } catch {
      return "Correct the malformed DOI or PMID source URL.";
    }
  }
  if (
    sourceId &&
    !slide.citations.some(
      (citation) =>
        (citation.doi
          ?.replace(/^https?:\/\/(?:dx\.)?doi.org\//i, "")
          .trim()
          .toLowerCase() || citation.pmid?.trim()) === sourceId,
    )
  )
    return "Attach and check the bibliographic record for this DOI or PMID source.";
  const sources = (deck.sourceDocuments || []).filter((d) => d.url === review.sourceUrl);
  const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
  if (sources.length && !sources.some((d) => normalize(d.text).includes(normalize(review.quote!))))
    return "The quotation does not occur in the saved source; re-extract the original passage.";
  if (sources.some((d) => guidanceNeedsReview(d, now)))
    return "Confirm the saved guideline version, jurisdiction and publisher currency.";
  return null;
}
export function surfaceFindings(deck: Deck, slide: Slide) {
  return surfaceItems(slide).flatMap((item) => {
    const record = slide.surfaceReviews?.find((r) => r.field === item.field);
    const problem = surfaceReviewProblem(deck, slide, item.field, record);
    return problem ? [{ ...item, problem }] : [];
  });
}
