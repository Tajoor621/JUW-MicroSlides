import type { Deck, CitationStyle } from "./types";
import { formatCitation } from "./citations";
export function teachingReferences(deck: Deck, style: CitationStyle = deck.citationStyle) {
  const unique = new Map(
    deck.slides
      .flatMap((s) => s.citations)
      .map((c) => [(c.doi || c.pmid || c.url || c.id).toLowerCase(), c]),
  );
  return [...unique.values()].map(
    (c) =>
      formatCitation(c, style) +
      (c.doi
        ? ` https://doi.org/${c.doi}`
        : c.pmid
          ? ` https://pubmed.ncbi.nlm.nih.gov/${c.pmid}/`
          : c.url
            ? ` ${c.url}`
            : ""),
  );
}
