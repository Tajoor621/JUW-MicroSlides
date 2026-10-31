import { test } from "node:test";
import assert from "node:assert/strict";
import { digest } from "./scientific-evaluation.mjs";
import { semanticAcceptance } from "./semantic-acceptance.mjs";
test("synthetic development results cannot substitute for a blind holdout", () => {
  const { raw, report } = fixture();
  const corpus = JSON.parse(raw);
  corpus.holdoutDeclaration.externalBlindHoldout = false;
  const development = JSON.stringify(corpus);
  report.corpusSha256 = digest(development);
  const result = semanticAcceptance(development, report);
  assert.equal(result.status, "not-qualified");
  assert.equal(result.scientificCertification, false);
  assert(result.errors.some((e) => /external blind holdout/.test(e)));
});
function fixture() {
  const corpus = {
    holdoutDeclaration: {
      threshold: 0.9,
      thresholdDeclaredAt: "2026-10-01T00:00:00Z",
      externalBlindHoldout: true,
      independentlyLabelled: true,
      coordinator: "Synthetic coordinator declaration",
      reviewers: ["A", "B"].map((id) => ({
        id,
        credentials: "Synthetic declaration only",
        conflictDeclaration: "Synthetic declaration only",
      })),
    },
    cases: [
      {
        id: "a",
        domain: "Test domain",
        a: "First exact teaching statement",
        b: "Paraphrased teaching statement",
        proposedLabel: "repetition",
        reviewState: "independently-reviewed",
      },
      {
        id: "b",
        domain: "Test domain",
        a: "Another statement",
        b: "Different concept",
        proposedLabel: "distinct",
        reviewState: "independently-reviewed",
      },
    ],
  };
  const raw = JSON.stringify(corpus);
  return {
    raw,
    report: {
      corpusSha256: digest(raw),
      dirtyWorktree: false,
      commit: "a".repeat(40),
      modelDigest: "b".repeat(64),
      status: "exploratory-development-evaluation",
      checkedAt: "2026-10-02T00:00:00Z",
      results: corpus.cases.map((c, i) => ({ ...c, score: i ? 0.2 : 0.99 })),
    },
  };
}
test("numerical criteria never authenticate reviewers or certify scientific accuracy", () => {
  const { raw, report } = fixture();
  const result = semanticAcceptance(raw, report);
  assert.equal(result.status, "numerical-criteria-met-needs-independent-verification");
  assert.equal(result.independentlyVerified, false);
  assert.equal(result.scientificCertification, false);
});
test("replayed, partial and altered results cannot pass", () => {
  const { raw, report } = fixture();
  for (const mutation of [
    (r) => r.results.pop(),
    (r) => (r.results[0].a = "Changed text"),
    (r) => (r.corpusSha256 = "wrong"),
    (r) => (r.dirtyWorktree = true),
    (r) => (r.results[0].score = 0.1),
    (r) => (r.results[1].domain = "Different domain"),
  ]) {
    const copy = structuredClone(report);
    mutation(copy);
    assert.equal(semanticAcceptance(raw, copy).status, "not-qualified");
  }
});
