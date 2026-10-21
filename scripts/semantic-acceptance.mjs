import { digest, metrics } from "./scientific-evaluation.mjs";
// This checks supplied evidence consistency. It cannot authenticate reviewers or establish science.
export function semanticAcceptance(corpusRaw, report, now = Date.now()) {
  const corpus = JSON.parse(corpusRaw),
    errors = [];
  const criterion = (condition, message) => {
    if (!condition) errors.push(message);
  };
  criterion(
    report.corpusSha256 === digest(corpusRaw),
    "Corpus hash does not match the measured report.",
  );
  criterion(report.dirtyWorktree === false, "Benchmark source must be a clean identified commit.");
  criterion(/^[a-f0-9]{40}$/i.test(report.commit || ""), "Missing benchmark commit.");
  criterion(/^[a-f0-9]{64}$/i.test(report.modelDigest || ""), "Missing installed model digest.");
  criterion(report.status === "exploratory-development-evaluation", "Embedding run is incomplete.");
  const declaration = corpus.holdoutDeclaration || {};
  const date = Date.parse(declaration.thresholdDeclaredAt),
    measured = Date.parse(report.checkedAt);
  criterion(
    Number.isFinite(date) && Number.isFinite(measured) && date < measured && measured <= now,
    "Threshold must be declared before measurement with valid dates.",
  );
  criterion(
    declaration.externalBlindHoldout === true && declaration.independentlyLabelled === true,
    "An independently labelled external blind holdout is required.",
  );
  criterion(
    Array.isArray(declaration.reviewers) &&
      new Set(declaration.reviewers.map((r) => r.id?.trim().toLowerCase()).filter(Boolean)).size >=
        2 &&
      declaration.reviewers.every(
        (r) => r.id?.trim() && r.credentials?.trim() && r.conflictDeclaration?.trim(),
      ),
    "Two separate reviewer declarations are required.",
  );
  criterion(
    declaration.coordinator?.trim(),
    "Coordinator verification of reviewer identity/independence is required.",
  );
  const threshold = declaration.threshold;
  criterion(
    Number.isFinite(threshold) && threshold >= 0.7 && threshold <= 1,
    "Missing predeclared threshold.",
  );
  const cases = corpus.cases || [],
    rows = report.results || [];
  criterion(
    cases.length > 0 && new Set(cases.map((c) => c.id)).size === cases.length,
    "Missing or duplicate corpus cases.",
  );
  criterion(
    rows.length === cases.length && new Set(rows.map((r) => r.id)).size === cases.length,
    "Missing or duplicate measured rows.",
  );
  for (const c of cases) {
    const row = rows.find((r) => r.id === c.id);
    criterion(
      Boolean(
        row &&
        row.a === c.a &&
        row.b === c.b &&
        row.domain === c.domain &&
        row.proposedLabel === c.proposedLabel,
      ),
      `Measured case mismatch: ${c.id}`,
    );
    criterion(
      c.reviewState === "independently-reviewed" && c.domain?.trim(),
      `Case lacks independent label/domain: ${c.id}`,
    );
  }
  // Fixed threshold only: this acceptance check never chooses it from the holdout.
  let overall = null;
  const domains = [];
  if (Number.isFinite(threshold) && threshold >= 0.7 && threshold <= 1) {
    try {
      overall = metrics(rows, threshold);
      for (const domain of [...new Set(cases.map((c) => c.domain))]) {
        const score = metrics(
          rows.filter((r) => r.domain === domain),
          threshold,
        );
        domains.push({ domain, ...score });
        criterion(
          score.precision >= 0.95 &&
            score.recall >= 0.95 &&
            score.precision !== null &&
            score.recall !== null,
          `Domain precision/recall below 95% or missing classes: ${domain}`,
        );
      }
      criterion(
        overall.precision >= 0.95 &&
          overall.recall >= 0.95 &&
          overall.precision !== null &&
          overall.recall !== null,
        "Overall precision/recall below 95%.",
      );
    } catch (error) {
      errors.push(error.message);
    }
  }
  return {
    status: errors.length
      ? "not-qualified"
      : "numerical-criteria-met-needs-independent-verification",
    errors,
    threshold,
    overall,
    domains,
    independentlyVerified: false,
    scientificCertification: false,
    limitations:
      "Supplied reviewer identities, independence and blinding are declarations, not authenticated facts. Coordinator must verify them. Metrics concern repetition candidates, not contradiction detection or factual accuracy. No app threshold is changed.",
  };
}
