import { passageContainsStatement } from "./generation-grounding";
import { z } from "zod";
import { LEVELS } from "./types";
import type { Deck } from "./types";
import { supportedSlideSentences } from "./source-grounding";
export const NOTES_LABEL = "Unverified AI-assisted draft — personal educational use";
export const noteSourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z
    .string()
    .url()
    .refine((s) => /^https?:\/\//.test(s), "Use an HTTP(S) source URL"),
  doi: z
    .string()
    .regex(/^10\.\d{4,9}\/\S+$/i)
    .optional(),
  pmid: z
    .string()
    .regex(/^\d{1,10}$/)
    .optional(),
  year: z.string(),
  guideline: z.boolean(),
  kind: z.enum(["textbook", "guideline", "review", "primary"]).optional(),
  chapter: z.string().optional(),
  retrievedAt: z.string().optional(),
});
export const noteStatementSchema = z.object({
  text: z.string().min(1),
  sourceId: z.string(),
  quote: z.string().min(1),
  locator: z.string(),
});
export const educationalNoteSchema = z.object({
  id: z.string(),
  topic: z.string().min(1),
  level: z.enum(LEVELS),
  date: z.string(),
  label: z.literal(NOTES_LABEL),
  sections: z.array(z.object({ heading: z.string(), statements: z.array(noteStatementSchema) })),
  sources: z.array(noteSourceSchema),
  questions: z.array(z.object({ question: z.string(), answer: noteStatementSchema })),
  glossary: z.array(z.object({ term: z.string(), definition: noteStatementSchema })),
});
export type EducationalNote = z.infer<typeof educationalNoteSchema>;
export const NOTE_HEADINGS = [
  "Definition",
  "Classification or structure",
  "Mechanism or pathogenesis",
  "Laboratory diagnosis",
  "Treatment or control",
  "Key points",
  "Common misconceptions",
];
const treatment =
  /\b(treat(?:ment|ed|ing)?|dos(?:e|ing)|therapy|therapeutic|recommend(?:ation|ed)?|first-line)\b/i;
export function assertNoteSources(note: EducationalNote) {
  const parsed = educationalNoteSchema.parse(note);
  const statements = [
    ...parsed.sections.flatMap((s) => s.statements),
    ...parsed.questions.map((q) => q.answer),
    ...parsed.glossary.map((g) => g.definition),
  ];
  if (statements.length < 4)
    throw Error(
      "Sources cannot support a useful note. Retrieve more attributable passages. Existing notes were kept.",
    );
  for (const s of statements) {
    const ref = parsed.sources.find((r) => r.id === s.sourceId);
    if (
      !ref ||
      (!ref.doi && !ref.pmid && !(ref.kind === "textbook" && ref.chapter?.trim())) ||
      !passageContainsStatement(s.quote, s.text)
    )
      throw Error(
        "A note statement has no traceable DOI/PMID passage. Regenerate from attributable sources.",
      );
    if (treatment.test(s.text) && (!ref.guideline || !/^\d{4}$/.test(ref.year)))
      throw Error("Treatment statements require a dated guideline.");
  }
  return parsed;
}
export function educationalNotesFromDeck(deck: Deck): EducationalNote {
  const sources: EducationalNote["sources"] = [];
  const sections = NOTE_HEADINGS.map((heading) => ({
    heading,
    statements: [] as z.infer<typeof noteStatementSchema>[],
  }));
  const seen = new Set<string>();
  for (const slide of deck.slides) {
    for (const statement of supportedSlideSentences(slide, deck.sourceDocuments)) {
      const ref = slide.citations.find((c) => c.id === statement.citationId);
      if (!ref || (!ref.doi && !ref.pmid && ref.evidenceKind !== "textbook")) continue;
      // Excerpt fidelity alone is insufficient: deictic and first-person result
      // fragments cannot stand in for a topic explanation without their context.
      if (
        /^(?:this\b|these\b|those\b|such\b|it\b|they\b|we\b|our\b|here\b|in light of this\b)/i.test(
          statement.text.trim(),
        )
      )
        continue;
      const guideline = statement.access === "guideline";
      if (treatment.test(statement.text) && (!guideline || !/^\d{4}$/.test(ref.year))) continue;
      const key = statement.text.toLowerCase().replace(/\W/g, "");
      if (seen.has(key)) continue;
      seen.add(key);
      if (!sources.some((s) => s.id === ref.id))
        sources.push({
          id: ref.id,
          title: ref.title,
          url: statement.url,
          doi: ref.doi,
          pmid: ref.pmid,
          year: ref.year,
          guideline,
          kind: statement.access === "textbook" ? "textbook" : guideline ? "guideline" : "primary",
          chapter: statement.access === "textbook" ? ref.title : undefined,
          retrievedAt: new Date(statement.checkedAt).toISOString().slice(0, 10),
        });
      const fact = {
        text: statement.text,
        sourceId: ref.id,
        quote: statement.quote,
        locator:
          slide.claims?.flatMap((c) => c.evidence).find((e) => e.citationId === ref.id)?.locator ||
          "Retrieved passage",
      };
      const explicitSection = NOTE_HEADINGS.indexOf(slide.teachingPurpose || "");
      const index =
        explicitSection >= 0
          ? explicitSection
          : treatment.test(fact.text)
            ? 4
            : /\b(?:defined as|refers to|means)\b/i.test(fact.text)
              ? 0
              : /misconception|not always|does not|cannot be/i.test(fact.text)
                ? 6
                : /diagnos|assay|detect|test(?:ing)?\b/i.test(fact.text)
                  ? 3
                  : /mechanis|pathogenes|transfer|replicat|process/i.test(fact.text)
                    ? 2
                    : /classif|structure|morpholog|wall|membrane/i.test(fact.text)
                      ? 1
                      : /\b(is|are|defined|refers)\b/i.test(fact.text)
                        ? 0
                        : 5;
      sections[index].statements.push(fact);
    }
  }
  const all = sections.flatMap((s) => s.statements);
  const coreSections = sections.slice(0, 5).filter((s) => s.statements.length).length;
  const explanatorySection = sections.slice(0, 3).some((s) => s.statements.length);
  if (all.length < 4 || coreSections < 2 || !explanatorySection)
    throw Error(
      "Sources cannot support a useful note: at least four distinct, self-contained source statements spanning two teaching sections, including a definition, structure or mechanism, are needed. Add attributable teaching passages with DOI/PMID. Existing notes were kept.",
    );
  const note: EducationalNote = {
    id: crypto.randomUUID(),
    topic: deck.topic,
    level: deck.level,
    date: new Date().toISOString().slice(0, 10),
    label: NOTES_LABEL,
    sections,
    sources,
    questions: sections
      .filter((s) => s.statements.length)
      .slice(0, 3)
      .map((s, i) => ({
        question: `${i + 1}. For “${s.heading}”, explain the quoted statement and identify a limit of what its source establishes.`,
        answer: s.statements[0],
      })),
    glossary: [],
  };
  // Only source-defined terms enter the glossary; never manufacture a definition.
  for (const definition of all) {
    const m = definition.text.match(/^([A-Z][\w -]{2,60}) (?:is|are|refers to) /);
    if (m && note.glossary.length < 8) note.glossary.push({ term: m[1], definition });
  }
  return assertNoteSources(note);
}
export function noteText(note: EducationalNote) {
  const sourceIndex = (id: string) => note.sources.findIndex((s) => s.id === id) + 1;
  return [
    `${note.topic}\n${note.level} · ${note.date}\n${note.label}`,
    "Learning outcomes\nExplain the retrieved source statements, compare their scope and identify limitations.",
    ...note.sections.map(
      (s) =>
        `${s.heading}\n${s.statements.length ? s.statements.map((v) => `${v.text} [${sourceIndex(v.sourceId)}]${treatment.test(v.text) ? "\nCheck current guidance before clinical use." : ""}`).join("\n\n") : "No source-supported passage retrieved for this section."}`,
    ),
    "Self-check questions with answers\n" +
      note.questions
        .map((q) => `${q.question}\nAnswer: ${q.answer.text} [${sourceIndex(q.answer.sourceId)}]`)
        .join("\n\n"),
    "References\n" +
      note.sources
        .map(
          (s, i) =>
            `${i + 1}. ${s.title} (${s.year}). ${s.doi ? `DOI: ${s.doi}` : s.pmid ? `PMID: ${s.pmid}` : `Textbook chapter: ${s.chapter}`}\n${s.url}`,
        )
        .join("\n\n"),
    "Glossary\n" +
      (note.glossary
        .map((g) => `${g.term}: ${g.definition.text} [${sourceIndex(g.definition.sourceId)}]`)
        .join("\n\n") || "No explicit source definitions were retrieved."),
  ].join("\n\n");
}
export const treatmentStatement = (text: string) => treatment.test(text);
