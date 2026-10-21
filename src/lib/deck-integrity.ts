import { surfaceFindings, claimReviewIsCurrent } from "./surface-review";
import { citationIdentifier, publicationCheckIsCurrent } from "./publication-status";
import { guidanceNeedsReview } from "./source-documents";
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
    for (const finding of surfaceFindings(deck, s))
      findings.push({
        slideId: s.id,
        index,
        quote: finding.text,
        severity: "critical",
        category: finding.media ? "Figure review" : "Heading and notes review",
        message: `${finding.field}: ${finding.problem}`,
      });
    for (const citation of s.citations) {
      const check = citation.publicationCheck;
      const add = (severity: "critical" | "warning", category: string, message: string) =>
        findings.push({ slideId: s.id, index, quote: citation.title, severity, category, message });
      if (check && check.identifier !== citationIdentifier(citation))
        add(
          "critical",
          "Source identity changed",
          "The identifier changed after the publication check. Check this reference again.",
        );
      else if (check?.metadataMatch === false)
        add(
          "critical",
          "Reference mismatch",
          "The identifier resolves to a different title. Correct and recheck the citation.",
        );
      else if (check && ["retracted", "concern", "corrected", "notice"].includes(check.status))
        add(
          "critical",
          "Publication notice",
          `${check.status}: inspect the notice and replace affected claims. The app does not clear this through a claim-review checkbox.`,
        );
      else if ((citation.doi || citation.pmid) && !publicationCheckIsCurrent(citation))
        add(
          "critical",
          "Publication status incomplete",
          "Run online reference checks. Missing, partial or older-than-seven-day checks do not establish current publication status.",
        );
    }
    for (const doc of deck.sourceDocuments || [])
      if (
        guidanceNeedsReview(doc) &&
        s.claims?.some((c) => c.evidence.some((e) => e.sourceUrl === doc.url))
      )
        findings.push({
          slideId: s.id,
          index,
          quote: doc.title,
          severity: "critical",
          category: "Guideline currency",
          message:
            "Record publication/version date and jurisdiction, then confirm the publisher has not superseded this guidance (repeat within 30 days). This interval is a review policy, not a clinical validity period.",
        });

    if (
      (index > 0 || deck.slides.length === 1) &&
      (s.layout === "title" || (!slideStatements(s).length && !s.media.length))
    )
      findings.push({
        slideId: s.id,
        index,
        quote: s.title,
        severity: "critical",
        category: "Empty teaching slide",
        message:
          "Replace this placeholder or title-only page with substantive visible teaching content before reviewed export.",
      });
    for (const c of reconcileClaims(s).claims || []) {
      if (c.status === "lecturer-reviewed" && !claimReviewIsCurrent(deck, c))
        findings.push({
          slideId: s.id,
          index,
          quote: c.text,
          severity: "critical",
          category: "Source review changed",
          message:
            "The evidence or saved source revision changed. Review and confirm this claim again.",
        });
      const linked = c.evidence.filter(
        (e) =>
          e.quote.trim() &&
          e.locator.trim() &&
          e.sourceUrl &&
          (!e.citationId || s.citations.some((r) => r.id === e.citationId)),
      );
      for (const e of linked) {
        const identifier =
          e.sourceUrl.match(/^https?:\/\/(?:dx\.)?doi\.org\/(.+)/i)?.[1]?.toLowerCase() ||
          e.sourceUrl.match(/^https?:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i)?.[1];
        if (identifier && !s.citations.some((ref) => citationIdentifier(ref) === identifier))
          findings.push({
            slideId: s.id,
            index,
            quote: c.text,
            severity: "critical",
            category: "Unlinked source identifier",
            message: "Attach and check the bibliographic record for this DOI or PMID passage.",
          });
        const saved = (deck.sourceDocuments || []).filter((d) => d.url === e.sourceUrl);
        const normalizeSpace = (text: string) => text.replace(/\s+/g, " ").trim();
        if (
          saved.length &&
          !saved.some((d) => normalizeSpace(d.text).includes(normalizeSpace(e.quote)))
        )
          findings.push({
            slideId: s.id,
            index,
            quote: c.text,
            severity: "critical",
            category: "Source quotation mismatch",
            message:
              "The evidence quotation does not occur in the saved source text. Re-extract and review the original passage, including numbers, units and comparisons. Lecturer confirmation cannot override this mismatch.",
          });
      }
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
      if (
        c.classification === "guideline" &&
        !linked.some((e) =>
          deck.sourceDocuments?.some(
            (d) => d.url === e.sourceUrl && d.access === "guideline" && !guidanceNeedsReview(d),
          ),
        )
      )
        findings.push({
          slideId: s.id,
          index,
          quote: c.text,
          severity: "critical",
          category: "Guideline currency",
          message:
            "Attach a saved guideline with its version, jurisdiction and recent publisher-currency confirmation. An abstract cannot establish current clinical guidance.",
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
