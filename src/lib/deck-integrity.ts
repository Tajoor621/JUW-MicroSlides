import type { Deck, Slide, Claim } from "./types";
export const statementKey = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const stop = new Set(
  "the a an of to in on and or is are was were for with by from that this as be at it".split(" "),
);
function tokens(s: string) {
  return new Set(
    statementKey(s)
      .split(" ")
      .filter((t) => !stop.has(t))
      .map((t) => t.replace(/(ing|ed|s)$/, "")),
  );
}
export function statementSimilarity(a: string, b: string) {
  if (statementKey(a) === statementKey(b)) return 1;
  // Preserve numbers and negation: similar wording with different results is a review concern, not an exact duplicate.
  if (
    JSON.stringify(a.match(/\d+(?:\.\d+)?/g) || []) !==
    JSON.stringify(b.match(/\d+(?:\.\d+)?/g) || [])
  )
    return 0;
  if (/\b(not|never|without)\b/i.test(a) !== /\b(not|never|without)\b/i.test(b)) return 0;
  const x = tokens(a),
    y = tokens(b);
  if (Math.min(x.size, y.size) < 5) return 0;
  return [...x].filter((t) => y.has(t)).length / new Set([...x, ...y]).size;
}
export function slideStatements(s: Slide) {
  return [...s.bullets, ...s.leftBullets, ...s.rightBullets].filter((t) => t.trim());
}
export type Duplicate = { first: number; second: number; quote: string; similarity: number };
export function duplicateStatements(slides: Slide[]): Duplicate[] {
  const seen: { text: string; index: number }[] = [];
  const issues: Duplicate[] = [];
  slides.forEach((s, index) =>
    slideStatements(s).forEach((text) => {
      const duplicate = seen.find((p) => statementSimilarity(p.text, text) >= 0.86);
      if (duplicate)
        issues.push({
          first: duplicate.index,
          second: index,
          quote: text,
          similarity: statementSimilarity(duplicate.text, text),
        });
      seen.push({ text, index });
    }),
  );
  return issues;
}
export function reconcileClaims(slide: Slide): Slide {
  const old = new Map((slide.claims || []).map((c) => [statementKey(c.text), c]));
  const claims: Claim[] = slideStatements(slide).map((text, index) => {
    const existing = old.get(statementKey(text));
    if (existing && existing.text === text)
      return existing.teachingPurpose === slide.title
        ? existing
        : { ...existing, teachingPurpose: slide.title, status: "stale" };
    return {
      id: `${slide.id}-claim-${index}-${simpleHash(text)}`,
      text,
      classification: "unclassified",
      status: "unreviewed",
      evidence: [],
      teachingPurpose: slide.title,
    };
  });
  return { ...slide, claims };
}
function simpleHash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(36);
}
export function reconcileDeck(deck: Deck): Deck {
  return { ...deck, slides: deck.slides.map(reconcileClaims) };
}
export type IntegrityFinding = {
  slideId: string;
  index: number;
  quote: string;
  severity: "critical" | "warning";
  category: string;
  message: string;
};
export function integrityAudit(deck: Deck): IntegrityFinding[] {
  const findings: IntegrityFinding[] = [];
  for (const d of duplicateStatements(deck.slides))
    findings.push({
      slideId: deck.slides[d.second].id,
      index: d.second,
      quote: d.quote,
      severity: "critical",
      category: "Repetition",
      message: `Overlaps slide ${d.first + 1}. Similarity screening requires lecturer review; replace redundant teaching content.`,
    });
  deck.slides.forEach((s, index) => {
    for (const c of reconcileClaims(s).claims || []) {
      const linked = c.evidence.filter(
        (e) =>
          e.quote.trim() &&
          e.locator.trim() &&
          e.sourceUrl &&
          (!e.citationId || s.citations.some((r) => r.id === e.citationId)),
      );
      if (!linked.length || c.status === "unreviewed" || c.status === "stale")
        findings.push({
          slideId: s.id,
          index,
          quote: c.text,
          severity: "critical",
          category: "Evidence",
          message:
            "Missing claim-level support or review. A slide citation alone does not verify this statement.",
        });
      else if (c.status !== "lecturer-reviewed")
        findings.push({
          slideId: s.id,
          index,
          quote: c.text,
          severity: "critical",
          category: "Source excerpt",
          message:
            "Traceable excerpt; abstract access and publication metadata do not establish scientific validity. Review the original study.",
        });
      for (const e of linked)
        if (e.access === "abstract")
          findings.push({
            slideId: s.id,
            index,
            quote: c.text,
            severity: "warning",
            category: "Abstract only",
            message:
              "Evidence is limited to the abstract; do not infer unreported methods or clinical recommendations.",
          });
      if (c.reviewedAt && Date.now() - c.reviewedAt > 365 * 86400000)
        findings.push({
          slideId: s.id,
          index,
          quote: c.text,
          severity: "warning",
          category: "Review age",
          message:
            "Review is older than one year. Check current guidance where applicable; age alone is not evidence of invalidity.",
        });
    }
  });
  return findings;
}
export function classroomReady(deck: Deck) {
  return (
    deck.slides.length >= 1 &&
    deck.slides.length <= 50 &&
    !integrityAudit(deck).some((i) => i.severity === "critical")
  );
}
