import { z } from "zod";
export const GENERATION_MODES = [
  "standard",
  "pathogen",
  "laboratory",
  "clinical-cases",
  "curriculum",
] as const;
export const MODE_NAMES = {
  standard: "Standard Lecture",
  pathogen: "Pathogen Profile",
  laboratory: "Laboratory Method / Technique",
  "clinical-cases": "Clinical Case Series",
  curriculum: "Curriculum Module",
} as const;
export const MEDIA_TAGS = [
  "micrograph",
  "schematic",
  "workflow",
  "growth-curve",
  "phylogeny",
  "antibiogram",
  "colony-photo",
  "stain",
  "table",
  "other",
] as const;
export const EVIDENCE_FLAGS = [
  "consensus",
  "emerging",
  "guideline-linked",
  "needs-verification",
] as const;
export const EVIDENCE_FLAG_LABELS = {
  consensus: "Consensus knowledge",
  emerging: "Emerging / recent",
  "guideline-linked": "Guideline-linked",
  "needs-verification": "Needs verification",
} as const;
export const SECTION_TYPES = [
  "taxonomy",
  "morphology",
  "culture",
  "virulence",
  "pathogenesis",
  "diagnosis",
  "treatment",
  "epidemiology",
  "protocol",
  "case",
  "assessment",
  "other",
] as const;
const text = z.string().max(3000);
export const lectureOptionsSchema = z.object({
  researchDepth: z.enum(["standard", "thorough"]).optional(),
  generationMode: z.enum(GENERATION_MODES).optional(),
  includeObjectives: z.boolean().optional(),
  includeAssessment: z.boolean().optional(),
  clinicalCases: z.number().int().min(3).max(8).optional(),
  moduleTopics: z.array(z.string().trim().min(1).max(500)).min(2).max(12).optional(),
  focusDepth: z.enum(["overview", "standard", "exhaustive"]).optional(),
  visualEmphasis: z
    .enum(["auto", "morphology", "molecular", "clinical", "epidemiology"])
    .optional(),
});
export type LectureOptions = z.infer<typeof lectureOptionsSchema>;
export const lectureSlideFields = {
  learningObjectives: z.array(text).max(6).optional(),
  clinicalPearl: text.optional(),
  keyTakeaway: text.optional(),
  difficulty: z.enum(["core", "intermediate", "advanced"]).optional(),
  sectionType: z.enum(SECTION_TYPES).optional(),
  mediaTags: z.array(z.enum(MEDIA_TAGS)).max(10).optional(),
  evidenceFlags: z.array(z.enum(EVIDENCE_FLAGS)).max(4).optional(),
  commonMisconceptions: z.array(text).max(8).optional(),
  revealSteps: z.array(z.number().int().min(0).max(49)).max(50).optional(),
  scientificTable: z
    .object({
      caption: text,
      headers: z.array(text).min(2).max(6),
      rows: z.array(z.array(text).min(2).max(6)).max(8),
    })
    .optional(),
  protocol: z
    .object({
      materials: z.array(text).max(8),
      steps: z
        .array(z.object({ action: text, timing: text, sourceUrl: z.string().max(2000) }))
        .max(12),
      interpretation: text,
      qc: text,
      biosafety: text,
      troubleshooting: text,
    })
    .optional(),
  caseData: z
    .object({
      caseNumber: z.number().int().min(1).max(8),
      vignette: text,
      differential: text,
      workup: text,
      results: text,
      diagnosis: text,
      management: text,
      questions: z.array(text).max(6),
      phase: z.enum(["presentation", "resolution"]),
    })
    .optional(),
  assessment: z
    .array(
      z.object({
        kind: z.enum(["mcq", "short-answer", "image"]),
        question: text,
        options: z.array(text).max(6),
        answer: text,
        rationale: text,
        sourceUrl: z.string().max(2000).optional(),
        mediaId: text.optional(),
      }),
    )
    .max(8)
    .optional(),
  chart: z
    .object({
      title: text,
      xLabel: text,
      yLabel: text,
      points: z.array(z.object({ x: z.number().finite(), y: z.number().finite() })).max(50),
      sourceUrl: text,
    })
    .optional(),
  taxonomy: z
    .array(z.object({ label: text, parent: z.number().int().min(-1).max(29) }))
    .max(30)
    .optional(),
};
export const lectureSlideSchema = z.object(lectureSlideFields);
export type LectureSlideFields = z.infer<typeof lectureSlideSchema>;
export const courseMembershipSchema = z.object({
  id: z.string().max(200),
  title: text,
  order: z.number().int().min(1).max(100),
  prerequisites: z.array(z.string().max(200)).max(50),
});
export const lectureDeckFields = {
  lectureOptions: lectureOptionsSchema.optional(),
  lastLiteratureCheck: z.number().finite().positive().optional(),
  courseSeries: courseMembershipSchema.optional(),
};
