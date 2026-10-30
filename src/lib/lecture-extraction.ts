import type { Slide } from "./types";
import { lectureSlideSchema } from "./lecture-schema";
import { passageContainsStatement, passageText } from "./generation-grounding";
/** Deterministic labelled-note extraction. Missing values stay empty; laboratory
 * timings and clinical decisions are never completed with generic defaults. */
export function populateLabelledFields(slide: Slide, sectionText: string): Slide {
  const lines = sectionText.split(/\n+/).map((s) => s.replace(/^[-*]\s*/, "").trim());
  const field = (labels: string) =>
    lines.find((s) => new RegExp(`^(?:${labels})\\s*:`, "i").test(s))?.replace(/^[^:]+:\s*/, "") ||
    "";
  const next = structuredClone(slide);
  if (next.caseData) {
    const c = next.caseData;
    for (const [key, labels] of Object.entries({
      vignette: "Vignette|Patient",
      differential: "Differential(?: diagnosis)?",
      workup: "Work-?up|Laboratory work-?up",
      results: "Results|Expected results",
      diagnosis: "Diagnosis|Final diagnosis",
      management: "Management|Management & infection control",
    })) {
      const value = field(labels);
      if (value) (c as unknown as Record<string, unknown>)[key] = value;
    }
    const question = field("Questions?|Teaching questions?");
    if (question) c.questions = question.split(/\s*;\s*/);
  }
  if (next.protocol) {
    const p = next.protocol;
    const source =
      next.claims?.find((c) => c.evidence.length)?.evidence[0]?.sourceUrl ||
      sectionText.match(/https:\/\/[^\s|]+/)?.[0] ||
      "";
    for (const step of p.steps) if (!step.sourceUrl) step.sourceUrl = source;
    for (const [key, labels] of Object.entries({
      interpretation: "Interpretation|Expected results",
      qc: "QC|Quality control",
      biosafety: "Biosafety|PPE|Containment",
      troubleshooting: "Troubleshooting|Common errors",
    })) {
      const value = field(labels);
      if (value) (p as unknown as Record<string, unknown>)[key] = value;
    }
  }
  const table = lines.filter((l) => l.includes("\t")).map((l) => l.split("\t"));
  if (
    table.length > 1 &&
    table.length <= 9 &&
    table[0].length >= 2 &&
    table[0].length <= 6 &&
    table.slice(1).every((r) => r.length === table[0].length)
  )
    next.scientificTable = { caption: slide.title, headers: table[0], rows: table.slice(1) };
  const lineage = field("Taxonomy|Lineage");
  if (lineage)
    next.taxonomy = lineage.split(/\s*>\s*/).map((label, i) => ({ label, parent: i - 1 }));
  return next;
}
/** A model may organise supplied wording. Complete statements retain their
 * qualifications; structured values cannot borrow unrelated numbers. */
export function groundedModelFields(slide: Slide, candidate: Slide, source: string): Slide {
  const parsed = lectureSlideSchema.safeParse(candidate);
  if (!parsed.success) return slide;
  const normalized = passageText(source);
  const present = (text: string) => !text || passageContainsStatement(source, text);
  const label = (text: string) => !text || normalized.includes(passageText(text));
  const next = structuredClone(slide),
    p = parsed.data;
  if (
    p.protocol &&
    [
      p.protocol.interpretation,
      p.protocol.qc,
      p.protocol.biosafety,
      p.protocol.troubleshooting,
    ].every(present) &&
    p.protocol.materials.every(label) &&
    p.protocol.steps.every(
      (s) =>
        present(s.action) &&
        (!s.timing || passageText(s.action).includes(passageText(s.timing))) &&
        label(s.sourceUrl),
    )
  )
    next.protocol = p.protocol;
  if (
    p.caseData &&
    [
      p.caseData.vignette,
      p.caseData.differential,
      p.caseData.workup,
      p.caseData.results,
      p.caseData.diagnosis,
      p.caseData.management,
    ].every(present)
  )
    next.caseData = {
      ...p.caseData,
      questions: p.caseData.questions.filter(label),
      caseNumber: slide.caseData?.caseNumber || p.caseData.caseNumber,
      phase: slide.caseData?.phase || p.caseData.phase,
    };
  if (
    p.scientificTable &&
    [p.scientificTable.caption, ...p.scientificTable.headers].every(label) &&
    p.scientificTable.rows.every((row) => normalized.includes(passageText(row.join("\t"))))
  )
    next.scientificTable = p.scientificTable;
  return next;
}
