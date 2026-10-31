import gram from "../content/concepts/gram-staining.json";
import transformation from "../content/concepts/transformation.json";
import conjugation from "../content/concepts/conjugation.json";
import growth from "../content/concepts/growth-curve.json";
import viral from "../content/concepts/viral-life-cycle.json";
import fungal from "../content/concepts/fungal-structure.json";
import protozoa from "../content/concepts/protozoan-life-cycles.json";
import pcr from "../content/concepts/pcr.json";
import type { Deck, GenerateInput, Slide, Citation } from "./types";
export const TEXTBOOK_CONCEPTS = [
  gram,
  transformation,
  conjugation,
  growth,
  viral,
  fungal,
  protozoa,
  pcr,
];
export const OPENSTAX_ATTRIBUTION = "Download for free at http://cnx.org/content/col12087/latest/.";
const key = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function conceptFor(topic: string) {
  const target = key(topic);
  return TEXTBOOK_CONCEPTS.find((c) => [c.topic, ...c.aliases].some((t) => key(t) === target));
}
export function hasTextbookCore(deck: Deck) {
  return deck.slides.some((s) =>
    s.claims?.some((c) => c.evidence.some((e) => e.access === "textbook")),
  );
}
/** Licensed extracts, not department-authored or expert-approved teaching material. */
export function textbookConceptDeck(base: Deck, input: GenerateInput, forNotes = false): Deck {
  const concept = conceptFor(input.topic);
  if (!concept || input.notes.trim() || input.mode === "ai") return base;
  if (!forNotes && base.slides.some((s) => s.teachingPurpose === "conjugation-core/v1"))
    return base;
  const citation: Citation = {
    id: `openstax-2016-${concept.source.chapter.split(" ")[0]}`,
    type: "chapter",
    evidenceKind: "textbook",
    title: `${concept.source.title}, ${concept.source.chapter}`,
    authors: concept.source.authors,
    publisher: concept.source.publisher,
    journal: `${concept.source.title}, ${concept.source.edition}`,
    year: concept.source.year,
    url: concept.source.url,
    accessed: concept.source.retrievedAt,
  };
  const items: Slide[] = concept.concepts.map((c, i) => ({
    id: `textbook-${c.id}`,
    layout: c.section === "Common misconceptions" ? "common-misconceptions" : "content",
    title: c.title,
    subtitle: "Textbook extract · educator approval pending",
    theme: "molecular",
    bullets: [c.quote],
    leftBullets: [],
    rightBullets: [],
    media: [],
    teachingPurpose: c.section,
    notes: `${concept.authoring}\nSource: ${citation.title} (${citation.year}). ${concept.source.locator}.\n${citation.url}\n${concept.source.attribution}`,
    citations: [citation],
    difficulty: "core",
    sectionType: "other",
    claims: [
      {
        id: `textbook-claim-${c.id}`,
        text: c.quote,
        teachingPurpose: c.section,
        classification: "foundational",
        status: "supported-excerpt",
        evidence: [
          {
            citationId: citation.id,
            sourceUrl: concept.source.url,
            locator: concept.source.locator,
            quote: c.quote,
            access: "textbook",
            checkedAt: Date.parse(concept.source.retrievedAt + "T00:00:00Z"),
          },
        ],
      },
    ],
    ...(i === 0 ? { learningObjectives: concept.learningOutcomes } : {}),
  }));
  const intro = base.slides.find((s) => s.layout === "title");
  const selected =
    input.count === 1
      ? items.slice(0, 1)
      : [...(intro ? [intro] : []), ...items].slice(0, input.count);
  return {
    ...base,
    slides: selected,
    contentWarnings: [
      ...(base.contentWarnings || []),
      `Bundled textbook extracts: ${concept.topic}; ${concept.source.edition}. ${concept.authoring}`,
    ],
  };
}
