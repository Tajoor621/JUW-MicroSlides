import type { Slide } from "./types";
export function lectureSpeakerNotes(slide: Slide) {
  return [
    slide.notes.split(/\n\nSource paragraph context \(verbatim\):/)[0],
    slide.commonMisconceptions?.length && !/Common misconceptions/i.test(slide.notes)
      ? `Common misconceptions\n${slide.commonMisconceptions.map((s) => `- ${s}`).join("\n")}`
      : "",
    slide.assessment?.length
      ? `Instructor answer key\n${slide.assessment.map((q, i) => `${i + 1}. ${q.answer}\nRationale: ${q.rationale}\nSource: ${q.sourceUrl || "Review required"}`).join("\n\n")}`
      : "",
    slide.protocol ? `Protocol record\n${JSON.stringify(slide.protocol, null, 2)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
