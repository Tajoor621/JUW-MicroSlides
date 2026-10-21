import { z } from "zod";
// Bump when scientific annotations or template geometry change, so old reviews become stale.
export const TEACHING_DIAGRAM_REVISION = "2026-10-21.1";
export const DIAGRAMS = [
  "adsorption",
  "covalent",
  "entrapment",
  "cross-linking",
  "diffusion",
  "biofilm",
  "gram-wall",
  "fluorescence",
  "enzyme",
] as const;
const text = z.string().max(3000);
export const teachingSchema = z.object({
  definition: text.default(""),
  mechanism: text.default(""),
  advantage: text.default(""),
  limitation: text.default(""),
  pitfall: text.default(""),
  takeaway: text.default(""),
  discussion: text.default(""),
  diagram: z.enum(DIAGRAMS).optional(),
  diagramLabel: text.default(""),
  altText: text.default(""),
  legend: text.default(""),
  equation: text.default(""),
  assumptions: text.default(""),
  scaleBar: z
    .object({
      pixels: z.number().positive(),
      physicalLength: z.number().positive(),
      unit: z.enum(["nm", "µm", "mm"]),
      calibrationSource: text,
    })
    .optional(),
  labels: z
    .array(z.object({ text, x: z.number().min(0).max(100), y: z.number().min(0).max(100) }))
    .max(8)
    .default([]),
  quantitative: z
    .array(
      z.object({
        metric: text,
        value: text,
        units: text,
        conditions: text,
        sourceUrl: text,
        quote: text,
      }),
    )
    .max(8)
    .default([]),
  comparison: z
    .array(z.object({ criterion: text, left: text, right: text }))
    .max(5)
    .default([]),
  steps: z.array(text).max(5).default([]),
});
export type Teaching = z.infer<typeof teachingSchema>;
