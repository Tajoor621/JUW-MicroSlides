import { cslCitation } from "./csl-format";
import type { Citation, CitationStyle, Deck } from "./types";

export const CANONICAL: Record<string, Citation[]> = {
  general: [
    {
      id: "koch1884",
      authors: "Koch R",
      title: "Die Aetiologie der Tuberkulose",
      journal: "Mitt Kaiserlichen Gesundheitsamte",
      year: "1884",
      pages: "1–88",
    },
    {
      id: "woese1977",
      authors: "Woese CR, Fox GE",
      title: "Phylogenetic structure of the prokaryotic domain: the primary kingdoms",
      journal: "Proc Natl Acad Sci USA",
      year: "1977",
      volume: "74",
      pages: "5088–5090",
      doi: "10.1073/pnas.74.11.5088",
    },
  ],
  bacteriology: [
    {
      id: "gram1884",
      authors: "Gram C",
      title: "Über die isolirte Färbung der Schizomyceten in Schnitt- und Trockenpräparaten",
      journal: "Fortschr Med",
      year: "1884",
      volume: "2",
      pages: "185–189",
    },
    {
      id: "falkow1988",
      authors: "Falkow S",
      title: "Molecular Koch's postulates applied to microbial pathogenicity",
      journal: "Rev Infect Dis",
      year: "1988",
      volume: "10",
      pages: "S274–S276",
    },
  ],
  virology: [
    {
      id: "baltimore1971",
      authors: "Baltimore D",
      title: "Expression of animal virus genomes",
      journal: "Bacteriol Rev",
      year: "1971",
      volume: "35",
      pages: "235–241",
    },
  ],
  immunology: [
    {
      id: "janeway1989",
      authors: "Janeway CA Jr",
      title: "Approaching the asymptote? Evolution and revolution in immunology",
      journal: "Cold Spring Harb Symp Quant Biol",
      year: "1989",
      volume: "54",
      pages: "1–13",
    },
  ],
  amr: [
    {
      id: "fleming1929",
      authors: "Fleming A",
      title:
        "On the antibacterial action of cultures of a penicillium, with special reference to their use in the isolation of B. influenzae",
      journal: "Br J Exp Pathol",
      year: "1929",
      volume: "10",
      pages: "226–236",
    },
  ],
  clinical: [
    {
      id: "clsi",
      authors: "CLSI",
      title: "Performance Standards for Antimicrobial Susceptibility Testing",
      journal: "CLSI supplement M100",
      year: "2024",
    },
  ],
};

export function formatCitation(c: Citation, style: CitationStyle): string {
  return cslCitation(c, style);
}

export function seedCitations(discipline: string): Citation[] {
  const d = discipline.toLowerCase();
  if (d.includes("bacter")) return [...CANONICAL.bacteriology];
  if (d.includes("viro")) return [...CANONICAL.virology];
  if (d.includes("immuno")) return [...CANONICAL.immunology];
  if (d.includes("antimicrobial") || d.includes("pharmac")) return [...CANONICAL.amr];
  if (d.includes("clinical") || d.includes("medical")) return [...CANONICAL.clinical];
  return [...CANONICAL.general];
}

export function applyPapers(deck: Deck, papers: Citation[]): Deck {
  if (!papers.length) return deck;
  const fresh = papers.filter((p) => p.title && p.authors);
  if (!fresh.length) return deck;
  const slides = deck.slides.map((s) => ({
    ...s,
    citations: [...s.citations],
    bullets: [...s.bullets],
  }));
  const ref = slides.find((s) => /reference/i.test(s.title));
  if (ref) {
    const seen = new Set(ref.bullets.map((b) => b.toLowerCase()));
    for (const paper of fresh) {
      const line = `${paper.authors} (${paper.year}). ${paper.title}. ${paper.journal}.`;
      if (seen.has(line.toLowerCase())) continue;
      seen.add(line.toLowerCase());
      ref.bullets.push(line);
      ref.citations.push(paper);
    }
    ref.notes =
      "Canonical starting points plus live PubMed hits for this topic. Check each paper before you quote a number.";
  }
  // Search results are reading suggestions, not evidence for individual slide claims.
  return { ...deck, slides };
}
