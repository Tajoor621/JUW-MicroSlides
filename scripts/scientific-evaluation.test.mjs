import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  metrics,
  splitCases,
  evaluateScores,
  reviewItems,
  assessReviews,
  digest,
} from "./scientific-evaluation.mjs";
test("raw subthreshold scores contribute false negatives and Wilson uncertainty", () => {
  const m = metrics(
    [
      { score: 0.8, proposedLabel: "repetition" },
      { score: 0.99, proposedLabel: "contradiction" },
    ],
    0.9,
  );
  assert.deepEqual([m.tp, m.fp, m.fn, m.tn], [0, 1, 1, 0]);
  assert.equal(m.contradictionFalsePositiveRate, 1);
  assert(m.recall95[1] > 0);
  assert.throws(() => metrics([{ score: null, proposedLabel: "distinct" }], 0.9));
  assert.throws(() => metrics([], NaN));
});
test("domain partitions prevent anchor leakage and reject duplicated cases", async () => {
  const corpus = JSON.parse(await readFile("benchmarks/semantic-pairs.json", "utf8"));
  const rows = splitCases(corpus.cases);
  for (const c of rows)
    assert(rows.filter((x) => x.domain === c.domain).every((x) => x.partition === c.partition));
  assert.throws(() => splitCases([...corpus.cases, corpus.cases[0]]));
  assert.throws(() =>
    splitCases([
      { id: "1", domain: "a", a: "shared", b: "one" },
      { id: "2", domain: "b", a: "two", b: "three" },
      { id: "3", domain: "c", a: "shared", b: "four" },
    ]),
  );
});
test("evaluation labels cannot influence calibration threshold selection", () => {
  const calibration = [
    { partition: "calibration", score: 0.85, proposedLabel: "repetition" },
    { partition: "calibration", score: 0.84, proposedLabel: "distinct" },
  ];
  const held = [
    { partition: "evaluation", score: 0.99, proposedLabel: "repetition" },
    { partition: "evaluation", score: 0.98, proposedLabel: "distinct" },
  ];
  const a = evaluateScores([...calibration, ...held]);
  const b = evaluateScores([...calibration, ...held.map((r) => ({ ...r, score: 0.1 }))]);
  assert.equal(a.selectedThreshold, 0.85);
  assert.equal(a.selectedThreshold, b.selectedThreshold);
  assert.notDeepEqual(a.evaluation, b.evaluation);
});
const deck = {
  slides: [
    {
      title: "Study result",
      subtitle: "In vitro",
      notes: "Does not establish clinical benefit",
      bullets: ["Claim"],
      claims: [{ text: "Claim", evidence: [{ quote: "Claim", access: "full-text" }] }],
      media: [{ title: "Figure", credit: "Author" }],
    },
  ],
};
const pack = { createdAt: "2026-01-01T00:00:00Z", packHash: "pack", items: reviewItems(deck) };
function completed(id) {
  return {
    packHash: "pack",
    reviewer: {
      id,
      credentials: "Microbiology educator",
      independent: true,
      conflictDeclaration: "None declared",
    },
    completedAt: "2026-01-02T00:00:00Z",
    decisions: pack.items.map((i) => ({
      id: i.id,
      contentHash: i.contentHash,
      verdict: "supported",
      rationale: "Reviewed context",
      sourceUrls: ["https://example.org/paper"],
      redundantWith: [],
    })),
  };
}
test("review scope includes titles, notes, passages and figures; edits change hashes", () => {
  assert.equal(pack.items.length, 5);
  const changed = structuredClone(deck);
  changed.slides[0].notes += ".";
  assert.notEqual(digest(reviewItems(changed)), digest(pack.items));
  assert.equal(
    pack.items.find((i) => i.field === "bullets.0").claims[0].evidence[0].quote,
    "Claim",
  );
});
test("independent review remains incomplete with missing, stale or duplicate attestations", () => {
  for (const reviews of [[], [completed("A")], [completed("A"), completed("A")]])
    assert.equal(assessReviews(pack, reviews).status, "incomplete");
  const a = completed("A"),
    b = completed("B");
  a.packHash = "old";
  assert.equal(assessReviews(pack, [a, b]).status, "incomplete");
  a.packHash = "pack";
  a.decisions.pop();
  assert.equal(assessReviews(pack, [a, b]).status, "incomplete");
});
test("disagreement and redundancy require correction; self-attestation never certifies truth", () => {
  const a = completed("A"),
    b = completed("B");
  const clean = assessReviews(pack, [a, b]);
  assert.equal(clean.status, "two-reviewer-attestations-complete");
  assert.equal(clean.independentlyVerified, false);
  assert.equal(clean.scientificCertification, false);
  b.decisions[0].verdict = "revise";
  assert.equal(assessReviews(pack, [a, b]).status, "corrections-or-adjudication-required");
  b.decisions[0].verdict = "supported";
  b.decisions[0].redundantWith = [pack.items[1].id];
  assert.equal(assessReviews(pack, [a, b]).status, "corrections-or-adjudication-required");
});

test("returned forms reject tampered packs, notes and evidence changes", async () => {
  const { makeScientificReviewPack } = await import("../src/lib/scientific-review-pack.ts");
  const { validateScientificReviewReturns } =
    await import("../src/lib/scientific-review-assessment.ts");
  const currentDeck = { ...deck, topic: "Study context" };
  const reviewPack = await makeScientificReviewPack(currentDeck);
  const forms = ["A", "B"].map((id) => ({
    ...completed(id),
    packHash: reviewPack.packHash,
    completedAt: new Date().toISOString(),
    decisions: reviewPack.items.map((i) => ({
      id: i.id,
      contentHash: i.contentHash,
      verdict: "supported",
      rationale: "Software fixture only",
      sourceUrls: ["https://example.org/study"],
      redundantWith: [],
    })),
  }));
  const result = await validateScientificReviewReturns(
    currentDeck,
    JSON.stringify(reviewPack),
    forms.map((r) => JSON.stringify(r)),
  );
  assert.equal(result.status, "two-reviewer-attestations-complete");
  assert.equal(result.scientificCertification, false);
  const tampered = structuredClone(reviewPack);
  tampered.items[0].text += " Changed";
  await assert.rejects(
    () => validateScientificReviewReturns(currentDeck, JSON.stringify(tampered), []),
    /hash mismatch/,
  );
  const changed = structuredClone(currentDeck);
  changed.slides[0].notes += " Changed";
  await assert.rejects(
    () => validateScientificReviewReturns(changed, JSON.stringify(reviewPack), []),
    /changed after/,
  );
});
