import { slideEvidenceBasis } from "./evidence-basis";
import { teachingReady } from "./teaching-readiness";
import type { CitationStyle, Deck, Slide } from "./types";
/** Explicit display allowlist. New project fields remain private unless deliberately added here. */
export function audienceFrame(deck: Deck, index: number, citationStyle: CitationStyle) {
  const source = deck.slides[index];
  if (!source) throw Error("No audience slide at this index.");
  const safeDeck: Deck = {
    id: deck.id,
    title: deck.title,
    topic: deck.topic,
    discipline: deck.discipline,
    level: deck.level,
    citationStyle,
    course: deck.course,
    courseCode: deck.courseCode,
    preparedBy: deck.preparedBy,
    department: deck.department,
    slides: [],
    mediaPool: [],
    updatedAt: deck.updatedAt,
    exportMode: deck.exportMode,
    teachingVerification: deck.teachingVerification,
  };
  const slide: Slide = {
    learningObjectives: source.learningObjectives,
    clinicalPearl: source.clinicalPearl,
    keyTakeaway: source.keyTakeaway,
    difficulty: source.difficulty,
    sectionType: source.sectionType,
    scientificTable: source.scientificTable,
    protocol: source.protocol,
    caseData: source.caseData?.phase === "presentation" ? { ...source.caseData, results: "", diagnosis: "", management: "" } : source.caseData,
    chart: source.chart,
    taxonomy: source.taxonomy,
    revealSteps: source.revealSteps,
    assessment: source.assessment?.map((q) => ({
      ...q,
      answer: "",
      rationale: "",
      sourceUrl: undefined,
    })),
    id: source.id,
    layout: source.layout,
    theme: source.theme,
    title: source.title,
    subtitle: source.subtitle,
    bullets: source.bullets,
    leftBullets: source.leftBullets,
    rightBullets: source.rightBullets,
    teaching: source.teaching
      ? {
          definition: source.teaching.definition,
          mechanism: source.teaching.mechanism,
          advantage: source.teaching.advantage,
          limitation: source.teaching.limitation,
          pitfall: source.teaching.pitfall,
          takeaway: source.teaching.takeaway,
          diagram: source.teaching.diagram,
          diagramLabel: source.teaching.diagramLabel,
          altText: source.teaching.altText,
          legend: source.teaching.legend,
          equation: source.teaching.equation,
          assumptions: source.teaching.assumptions,
          discussion: source.teaching.discussion,
          labels: source.teaching.labels,
          steps: source.teaching.steps,
          comparison: source.teaching.comparison,
          quantitative: source.teaching.quantitative.map((q) => ({
            ...q,
            quote: "",
            sourceUrl: "",
          })),
          scaleBar: source.teaching.scaleBar
            ? { ...source.teaching.scaleBar, calibrationSource: "" }
            : undefined,
        }
      : undefined,
    notes: "",
    claims: [],
    media: source.media,
    citations: source.citations.map((c) => ({
      id: c.id,
      evidenceKind: c.evidenceKind,
      authors: c.authors,
      title: c.title,
      journal: c.journal,
      year: c.year,
      volume: c.volume,
      pages: c.pages,
      doi: c.doi,
      pmid: c.pmid,
      url: c.url,
      cslAuthors: c.cslAuthors,
    })),
  };
  return {
    deck: safeDeck,
    slide,
    index,
    total: deck.slides.length,
    citationStyle,
    reviewRequired: !teachingReady(deck),
    evidenceBasis: slideEvidenceBasis(source),
  };
}
