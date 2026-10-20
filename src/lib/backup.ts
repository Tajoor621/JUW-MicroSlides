import { z } from "zod";
import { publicationCheckSchema } from "./publication-schema";
import { sourceDocumentSchema } from "./source-documents";
import { LAYOUTS, LEVELS, CITATION_STYLES } from "./types";
import { SLIDE_THEMES } from "./slide-themes";
const text = z.string().max(100000);
const safeSrc = z
  .string()
  .max(5000000)
  .refine(
    (s) =>
      /^(https?:|data:(?:image\/(png|jpeg|jpg|gif|webp|svg\+xml)|video\/(mp4|webm|ogg))[;,]|\/(?!\/))/.test(
        s,
      ),
    "Unsupported image URL",
  );
const media = z.object({
  id: text,
  kind: z.enum(["micrograph", "diagram", "icon", "photo", "gif", "chart", "video"]),
  title: text,
  src: safeSrc,
  credit: text,
  source: text,
  license: text,
  licenseUrl: z
    .string()
    .url()
    .refine((s) => s.startsWith("https://") || s.startsWith("http://"))
    .optional(),
  originalSrc: safeSrc.optional(),
  provider: text.optional(),
  keywords: z.array(text).max(100),
});
export const citationSchema = z.object({
  publicationCheck: publicationCheckSchema.optional(),
  cslJson: z.string().max(100_000).optional(),
  type: z.enum(["article-journal", "book", "chapter", "report", "webpage"]).optional(),
  url: z
    .string()
    .url()
    .refine((s) => /^https?:/.test(s), "Use an HTTP(S) reference URL")
    .optional(),
  publisher: text.optional(),
  accessed: text.optional(),
  id: text,
  authors: text,
  title: text,
  journal: text,
  year: text,
  cslAuthors: z
    .array(z.object({ family: text.optional(), given: text.optional(), literal: text.optional() }))
    .max(1000)
    .optional(),
  pmid: text.optional(),
  doi: text.optional(),
  volume: text.optional(),
  pages: text.optional(),
});
const claim = z.object({
  id: text,
  text,
  teachingPurpose: text,
  classification: z.enum(["unclassified", "foundational", "study-result", "guideline"]),
  status: z.enum(["unreviewed", "supported-excerpt", "lecturer-reviewed", "stale"]),
  reviewedAt: z.number().optional(),
  evidence: z
    .array(
      z.object({
        citationId: text.optional(),
        sourceUrl: z
          .string()
          .url()
          .refine((s) => /^https?:/.test(s)),
        locator: text,
        quote: text,
        access: z.enum(["abstract", "full-text", "textbook", "guideline", "instructor"]),
        checkedAt: z.number(),
      }),
    )
    .max(100),
});
const slide = z.object({
  claims: z.array(claim).max(500).optional(),
  locked: z.boolean().optional(),
  teachingPurpose: text.optional(),
  id: text,
  layout: z.enum(LAYOUTS),
  theme: z.enum(SLIDE_THEMES),
  title: text,
  subtitle: text,
  bullets: z.array(text).max(500),
  leftBullets: z.array(text).max(500),
  rightBullets: z.array(text).max(500),
  notes: text,
  citations: z.array(citationSchema).max(1000),
  media: z.array(media).max(100),
});
export const deckSchema = z.object({
  sourceDocuments: z.array(sourceDocumentSchema).max(30).optional(),
  id: text,
  title: text,
  topic: text,
  discipline: text,
  level: z.enum(LEVELS),
  citationStyle: z.enum(CITATION_STYLES),
  course: text,
  courseCode: text,
  preparedBy: text,
  department: text,
  slides: z.array(slide).min(1).max(400),
  mediaPool: z.array(media).max(1000),
  requestedCount: z.number().int().min(1).max(400).optional(),
  contentWarnings: z.array(text).max(100).optional(),
  researchLinks: z
    .array(
      z.object({
        id: text,
        title: text,
        url: z
          .string()
          .url()
          .refine((s) => /^https?:\/\//.test(s)),
      }),
    )
    .max(500)
    .optional(),
  generationSource: z.enum(["knowledge", "cloud-ai", "local-ai"]).optional(),
  revisionId: text.optional(),
  updatedAt: z.number().finite(),
});
export const backupSchema = z.object({
  format: z.literal("juw-microslides"),
  schemaVersion: z.literal(1),
  decks: z.array(deckSchema).min(1).max(500),
});
export function parseBackup(raw: string) {
  if (raw.length > 100000000) throw new Error("Backup exceeds 100 MB.");
  return backupSchema.parse(JSON.parse(raw)).decks;
}
