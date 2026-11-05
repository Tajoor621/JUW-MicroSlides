import test from "node:test";
import assert from "node:assert/strict";
import { cloneSlide } from "../src/lib/clone-slide.ts";

test("duplicated slides keep teaching text and drop prior review identity", () => {
  const source = {
    id: "s-original",
    layout: "content",
    theme: "classic",
    title: "Gram-positive cell wall",
    subtitle: "Peptidoglycan",
    bullets: ["Teichoic acids are in the wall."],
    leftBullets: [],
    rightBullets: [],
    notes: "Speaker note",
    citations: [{ id: "c1", authors: "A", title: "T", journal: "J", year: "2020" }],
    media: [
      {
        id: "m1",
        kind: "diagram",
        title: "Wall",
        src: "wall.svg",
        credit: "Lecturer",
        source: "Local",
        license: "CC BY",
        keywords: [],
      },
    ],
    locked: true,
    claims: [
      {
        id: "claim-1",
        text: "Teichoic acids are in the wall.",
        status: "lecturer-reviewed",
        teachingPurpose: "Gram-positive cell wall",
        classification: "foundational",
        evidence: [],
      },
    ],
    surfaceReviews: [{ field: "title", status: "current" }],
    assessment: [
      {
        kind: "image",
        question: "Identify the figure",
        options: [],
        answer: "Wall",
        rationale: "See the attached figure",
        mediaId: "m1",
      },
    ],
  };
  let n = 0;
  const copy = cloneSlide(source, {
    slide: "s-copy",
    next: (prefix) => `${prefix}-${++n}`,
  });
  assert.equal(copy.id, "s-copy");
  assert.equal(copy.title, source.title);
  assert.equal(copy.bullets[0], source.bullets[0]);
  assert.equal(copy.notes, source.notes);
  assert.equal(copy.locked, false);
  assert.equal(copy.claims, undefined);
  assert.equal(copy.surfaceReviews, undefined);
  assert.equal(copy.citations[0].title, "T");
  assert.notEqual(copy.citations[0].id, "c1");
  assert.equal(copy.media[0].src, "wall.svg");
  assert.notEqual(copy.media[0].id, "m1");
  assert.equal(copy.assessment[0].mediaId, copy.media[0].id);
  assert.equal(source.id, "s-original");
  assert.equal(source.locked, true);
  assert.equal(source.media[0].id, "m1");
  assert.equal(source.claims[0].status, "lecturer-reviewed");
});
