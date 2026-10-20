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
  };
  const slide: Slide = {
    id: source.id,
    layout: source.layout,
    theme: source.theme,
    title: source.title,
    subtitle: source.subtitle,
    bullets: source.bullets,
    leftBullets: source.leftBullets,
    rightBullets: source.rightBullets,
    notes: "",
    claims: [],
    media: source.media,
    citations: source.citations.map((c) => ({
      id: c.id,
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
  return { deck: safeDeck, slide, index, total: deck.slides.length, citationStyle };
}
