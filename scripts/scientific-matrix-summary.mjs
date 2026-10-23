export function summarizeMatrix(plan, reports, expectedCommit) {
  const expected = new Map(plan.jobs.map((job) => [job.id, job]));
  const seen = new Set(),
    failures = [],
    reasons = [];
  const commits = new Set(),
    fingerprints = new Set(),
    times = [];
  let completed = 0,
    claims = 0,
    traceableClaims = 0,
    unresolvedPublicationChecks = 0;
  for (const report of reports) {
    if (!report || !Array.isArray(report.results)) {
      reasons.push("Malformed or missing topic report");
      continue;
    }
    if (report.workingTreeDirty !== false)
      reasons.push("A topic report has an unclean source tree");
    if (
      !/^[a-f0-9]{40}$/i.test(report.commit || "") ||
      (expectedCommit && report.commit !== expectedCommit)
    )
      reasons.push("Topic report commit does not match the run");
    if (!/^[a-f0-9]{64}$/i.test(report.sourceFingerprint || ""))
      reasons.push("Missing source fingerprint");
    commits.add(report.commit);
    fingerprints.add(report.sourceFingerprint);
    for (const row of report.results) {
      const job = expected.get(row.id);
      if (!job || row.caseId !== job.caseId || row.requested !== job.requestedCount) {
        reasons.push(`Unexpected topic/count result: ${row.id}`);
        continue;
      }
      if (seen.has(row.id)) {
        reasons.push(`Duplicate result: ${row.id}`);
        continue;
      }
      seen.add(row.id);
      if (
        row.completed !== true ||
        row.actual !== job.requestedCount ||
        row.lexicalDuplicatePairs !== 0 ||
        !Number.isInteger(row.claims) ||
        row.claims < 1 ||
        row.claimsWithPassages !== row.claims ||
        !Number.isFinite(row.elapsedMs) ||
        row.elapsedMs < 0
      ) {
        failures.push({
          id: row.id,
          reason: row.reason || "Count, traceability, duplicate or timing contract failed",
        });
        continue;
      }
      completed++;
      claims += row.claims;
      traceableClaims += row.claimsWithPassages;
      times.push(row.elapsedMs);
      for (const check of row.publicationChecks || [])
        if (!check.complete || check.status !== "no-notice-found") unresolvedPublicationChecks++;
    }
  }
  if (commits.size !== 1 || fingerprints.size !== 1)
    reasons.push("Topic reports do not share one source identity");
  const missing = [...expected.keys()].filter((id) => !seen.has(id));
  times.sort((a, b) => a - b);
  return {
    appVersion: "V6.2.1",
    status:
      missing.length || failures.length || reasons.length
        ? "failed-or-incomplete"
        : "generation-contracts-complete",
    planned: expected.size,
    attempted: seen.size,
    completed,
    completionRate: completed / expected.size,
    claims,
    traceableClaims,
    unresolvedPublicationChecks,
    failures,
    missing,
    reasons: [...new Set(reasons)],
    commit: commits.size === 1 ? [...commits][0] : null,
    p95RetrievalMs: times.length ? times[Math.ceil(times.length * 0.95) - 1] : null,
    scientificVerdict: "needs-independent-review",
    semanticVerdict: "not-qualified-by-this-benchmark",
    classroomQualified: false,
    limitations:
      "Live generation contracts and source traceability only. Publication checks may remain unresolved. Retrieval timing does not establish reviewed-deck speed on Windows. Scientific review, semantic calibration, licensed PowerPoint, physical hardware and signed distribution require separate evidence.",
  };
}
