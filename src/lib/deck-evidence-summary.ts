import { integrityAudit, reconcileClaims } from "./deck-integrity";
import { citationIdentifier, statusIsFresh } from "./publication-status";
import type { Deck, Citation } from "./types";
export function deckEvidenceSummary(deck: Deck, now = Date.now()) {
  const findings = integrityAudit(deck);
  const references = new Map<
    string,
    { citation: Citation; slides: number[]; citations: Citation[] }
  >();
  const rows = deck.slides.map((slide, index) => {
    for (const citation of slide.citations) {
      const key = citationIdentifier(citation) || citation.url || citation.id;
      const entry = references.get(key);
      if (entry) {
        if (!entry.slides.includes(index + 1)) entry.slides.push(index + 1);
        entry.citations.push(citation);
      } else references.set(key, { citation, slides: [index + 1], citations: [citation] });
    }
    const claims = reconcileClaims(slide).claims || [];
    const linked = claims
      .map((claim) => ({
        claim,
        evidence: claim.evidence.filter(
          (e) =>
            e.quote.trim() &&
            e.locator.trim() &&
            e.sourceUrl &&
            (!e.citationId || slide.citations.some((r) => r.id === e.citationId)),
        ),
      }))
      .filter((row) => row.evidence.length);
    const reviewed = linked.filter((c) => c.claim.status === "lecturer-reviewed").length;
    const abstractOnly = linked.filter((c) =>
      c.evidence.every((e) => e.access === "abstract"),
    ).length;
    const fullAccess = linked.filter((c) =>
      c.evidence.some((e) => ["full-text", "textbook", "guideline"].includes(e.access)),
    ).length;
    const issues = findings.filter((f) => f.slideId === slide.id);
    return {
      index,
      slideId: slide.id,
      title: slide.title,
      layout: slide.layout,
      statements: claims.length,
      withPassages: linked.length,
      withoutPassages: claims.length - linked.length,
      lecturerReviewed: reviewed,
      needsLecturerReview: claims.length - reviewed,
      abstractOnly,
      fullAccess,
      figures: slide.media.length,
      critical: issues.filter((f) => f.severity === "critical").length,
      warnings: issues.filter((f) => f.severity === "warning").length,
    };
  });
  const refs = [...references.values()];
  const identifiable = refs.filter((r) => citationIdentifier(r.citation));
  const adverse = (c: Citation) =>
    c.publicationCheck &&
    ["retracted", "concern", "corrected", "notice"].includes(c.publicationCheck.status);
  const current = identifiable.filter((row) =>
    row.citations.every(
      (c) =>
        c.publicationCheck &&
        c.publicationCheck.identifier === citationIdentifier(c) &&
        c.publicationCheck.complete &&
        c.publicationCheck.metadataMatch !== false &&
        !adverse(c) &&
        c.publicationCheck.status === "no-notice-found" &&
        statusIsFresh(c.publicationCheck, now),
    ),
  );
  const sum = (
    key:
      | "statements"
      | "withPassages"
      | "withoutPassages"
      | "lecturerReviewed"
      | "abstractOnly"
      | "fullAccess"
      | "figures"
      | "critical"
      | "warnings",
  ) => rows.reduce((n, r) => n + r[key], 0);
  return {
    rows,
    references: refs.map(({ citations: _citations, ...entry }) => entry),
    findings,
    totals: {
      slides: rows.length,
      statements: sum("statements"),
      withPassages: sum("withPassages"),
      withoutPassages: sum("withoutPassages"),
      lecturerReviewed: sum("lecturerReviewed"),
      abstractOnly: sum("abstractOnly"),
      fullAccess: sum("fullAccess"),
      figures: sum("figures"),
      critical: sum("critical"),
      warnings: sum("warnings"),
      references: refs.length,
      identifiableReferences: identifiable.length,
      currentArticleChecks: current.length,
      adverseNotices: refs.filter((r) => r.citations.some(adverse)).length,
    },
    limitations:
      "Coverage counts record passages and lecturer attestations, not scientific accuracy. Publication metadata does not establish claim support. Titles, captions, notes, figure pixels and scientific generalization require separate review. Semantic repetition requires qualified model screening and human assessment.",
  };
}
