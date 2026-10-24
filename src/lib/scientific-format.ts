import type { Deck } from "./types";
export const SCIENTIFIC_RENDER_REVISION = "2026-10-24.1";
// Conservative typography hints, not a taxonomy resolver. Unknown names stay unchanged.
const genera = new Set(
  "Escherichia Staphylococcus Streptococcus Bacillus Clostridium Clostridioides Mycobacterium Neisseria Salmonella Shigella Pseudomonas Klebsiella Vibrio Helicobacter Enterococcus Campylobacter Legionella Haemophilus Bordetella Treponema Borrelia Chlamydia Mycoplasma Corynebacterium Candida Aspergillus Cryptococcus Histoplasma Plasmodium Giardia Trypanosoma Leishmania Toxoplasma Saccharomyces Acinetobacter Yersinia Francisella Brucella Coxiella Burkholderia Listeria".split(
    " ",
  ),
);
export function scientificRuns(text: string): { text: string; italic: boolean }[] {
  const runs: { text: string; italic: boolean }[] = [];
  let end = 0;
  for (const match of text.matchAll(/\b([A-Z][a-z]+) ([a-z][a-z-]{1,})\b/g)) {
    if (
      !genera.has(match[1]) ||
      ["species", "spp", "strain", "infection", "infections", "isolates"].includes(match[2])
    )
      continue;
    if (match.index > end) runs.push({ text: text.slice(end, match.index), italic: false });
    runs.push({ text: match[0], italic: true });
    end = match.index + match[0].length;
  }
  if (end < text.length) runs.push({ text: text.slice(end), italic: false });
  return runs;
}
/** Typography suggestions only: no rescaling quantities or changing scientific records. */
export function unitTypography(text: string) {
  return text
    .replace(/\b(\d+(?:\.\d+)?)\s*(?:uL|μl|µl)\b/g, "$1 µL")
    .replace(
      /\b(mg|µg|μg|ug|g)\s*\/\s*ml\b/g,
      (_, mass: string) => `${mass === "ug" || mass === "μg" ? "µg" : mass}/mL`,
    )
    .replace(/\b(\d+(?:\.\d+)?)\s*°\s*C\b/g, "$1 °C");
}
export function doiSyntax(raw: string) {
  const value = raw
    .trim()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "");
  return /^10\.\d{4,9}\/[^\s<>]+$/i.test(value) ? value : null;
}
export function scientificPreflight(deck: Deck) {
  return deck.slides.flatMap((slide, index) => {
    const notes: { index: number; message: string }[] = [];
    const text = [
      slide.title,
      slide.subtitle,
      ...slide.bullets,
      ...slide.leftBullets,
      ...slide.rightBullets,
    ].join("\n");
    if (unitTypography(text) !== text)
      notes.push({
        index,
        message:
          "Unit typography differs from the house style; inspect µL, mL and °C. Quantities have not been changed.",
      });
    for (const c of slide.citations) {
      if (c.doi && !doiSyntax(c.doi))
        notes.push({ index, message: `Reference DOI has invalid syntax: ${c.title}` });
      if (!c.publicationCheck?.complete)
        notes.push({
          index,
          message: `Reference metadata still needs checking: ${c.title}. DOI syntax alone does not verify a reference or claim.`,
        });
    }
    return notes;
  });
}
