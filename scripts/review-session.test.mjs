import test from "node:test";
import assert from "node:assert/strict";
import { makeScientificReviewPack, sha256 } from "../src/lib/scientific-review-pack.ts";
import {
  openReviewerPack,
  newReviewerDraft,
  openReviewerDraft,
  reviewFormIssues,
  draftCheckpoints,
  reviewRasterPreview,
  reviewSourceUrl,
} from "../src/lib/review-session.ts";
async function pack() {
  return makeScientificReviewPack({
    topic: "Software review fixture",
    sourceDocuments: [],
    slides: [
      {
        title: "Study context",
        subtitle: "",
        notes: "Study-specific limitations must be checked.",
        bullets: ["A software fixture statement, not a scientific claim."],
        leftBullets: [],
        rightBullets: [],
        citations: [],
        media: [],
        claims: [],
      },
    ],
  });
}
test("review reader verifies every original field and hides prior approval metadata", async () => {
  const original = await pack();
  const reader = await openReviewerPack(JSON.stringify(original));
  assert.equal(reader.items.length, 3);
  const changed = structuredClone(original);
  changed.items[0].text += " changed";
  await assert.rejects(() => openReviewerPack(JSON.stringify(changed)), /hash mismatch/);
  const malformed = structuredClone(original);
  malformed.items[0].text = { injected: true };
  await assert.rejects(() => openReviewerPack(JSON.stringify(malformed)), /structure/);
  const { packHash: _hash, ...rest } = original;
  const duplicate = { ...rest, items: [rest.items[0], rest.items[0]] };
  await assert.rejects(
    async () =>
      openReviewerPack(JSON.stringify({ ...duplicate, packHash: await sha256(duplicate) })),
    /duplicate/,
  );
});
test("review drafts preserve decisions but cannot be imported into another pack", async () => {
  const reader = await openReviewerPack(JSON.stringify(await pack()));
  const form = newReviewerDraft(reader);
  form.decisions[0].rationale = "Preserve this draft rationale.";
  assert.equal(
    openReviewerDraft(reader, JSON.stringify(form)).decisions[0].rationale,
    form.decisions[0].rationale,
  );
  form.decisions[0].sourceUrls = Array.from({ length: 31 }, (_, i) => `https://example.org/${i}`);
  assert.equal(
    openReviewerDraft(reader, JSON.stringify(form)).decisions[0].sourceUrls.length,
    31,
    "Unfinished source lists must remain resumable even before completion validation",
  );
  form.packHash = "wrong";
  assert.throws(() => openReviewerDraft(reader, JSON.stringify(form)), /different or changed/);
  form.packHash = reader.packHash;
  form.decisions[1].id = form.decisions[0].id;
  assert.throws(() => openReviewerDraft(reader, JSON.stringify(form)), /different or changed/);
});
test("completed-review export requires all decisions, source links and declarations", async () => {
  const reader = await openReviewerPack(JSON.stringify(await pack()));
  const form = newReviewerDraft(reader);
  assert(reviewFormIssues(reader, form).length > 0);
  form.reviewer = {
    id: "Fixture reviewer",
    credentials: "Software fixture, not an actual qualification",
    conflictDeclaration: "Synthetic test",
    independent: true,
  };
  for (const d of form.decisions) {
    d.verdict = "supported";
    d.rationale = "Software fixture only";
    d.sourceUrls = ["https://example.org/fixture"];
  }
  assert.deepEqual(reviewFormIssues(reader, form), []);
  form.decisions[0].sourceUrls = ["https://example.org/fixture", "", "   "];
  assert.deepEqual(reviewFormIssues(reader, form), []);
  form.decisions[0].sourceUrls = ["https://example.org/fixture", "javascript:alert(1)"];
  assert(reviewFormIssues(reader, form).some((s) => s.includes("Invalid scientific source link")));
  form.decisions[0].sourceUrls = ["javascript:alert(1)"];
  assert(reviewFormIssues(reader, form).some((s) => s.includes("Missing scientific source")));
});
test("draft checkpoints are bounded, newest first and do not mutate previous versions", async () => {
  const reader = await openReviewerPack(JSON.stringify(await pack()));
  let history = [];
  for (let i = 0; i < 5; i++) {
    const form = newReviewerDraft(reader);
    form.decisions[0].rationale = String(i);
    history = draftCheckpoints(history, form, i);
  }
  assert.deepEqual(
    history.map((r) => r.savedAt),
    [4, 3, 2],
  );
  assert.equal(draftCheckpoints(history, history[0].form, 9).length, 3);
  assert.equal(history[0].form.decisions[0].rationale, "4");
});
test("review content cannot turn scripts or SVG into automatic previews or links", () => {
  assert.equal(reviewSourceUrl("javascript:alert(1)"), null);
  assert.equal(reviewSourceUrl("https://user:pass@example.org/"), null);
  assert.equal(reviewRasterPreview("data:image/svg+xml;base64,PHN2Zz4="), null);
  assert.equal(reviewRasterPreview("https://example.org/figure.png"), null);
  assert.equal(
    reviewRasterPreview("data:image/png;base64,iVBORw0KGgo="),
    "data:image/png;base64,iVBORw0KGgo=",
  );
});
