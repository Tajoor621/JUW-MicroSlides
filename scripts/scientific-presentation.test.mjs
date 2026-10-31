import test from "node:test";
import assert from "node:assert/strict";
import {
  defensibleExport,
  sourcePresentation,
  needsGuideline,
} from "../src/lib/scientific-presentation.ts";
test("dated guidelines cannot lend support to unrelated clinical statements; originals survive export sanitation", () => {
  const statement = "This synthetic dose is 5 mg.";
  const slide = {
    id: "s",
    title: "Software fixture",
    layout: "content",
    bullets: [statement, "An unrelated MIC is 8 mg/L."],
    leftBullets: [],
    rightBullets: [],
    notes: "",
    media: [],
    citations: [
      {
        id: "g",
        title: "Synthetic CDC guideline fixture",
        authors: "Software fixture",
        year: "2026",
        journal: "Software test",
        url: "https://www.cdc.gov/example",
      },
    ],
    claims: [
      {
        id: "c",
        text: statement,
        classification: "guideline",
        status: "unreviewed",
        teachingPurpose: "Software test",
        evidence: [
          {
            citationId: "g",
            sourceUrl: "https://www.cdc.gov/example",
            locator: "Artificial test only",
            quote: statement,
            access: "guideline",
            checkedAt: 1,
          },
        ],
      },
    ],
  };
  const deck = { slides: [slide] };
  const before = JSON.stringify(deck);
  const result = defensibleExport(deck);
  assert.equal(result.slides[0].bullets[0], statement);
  assert.match(result.slides[0].bullets[1], /omitted/);
  assert.equal(JSON.stringify(deck), before);
  assert(needsGuideline("Incubate for 24 hours."));
  assert(!needsGuideline("A synthetic phage therapy fixture describes artificial software text."));
  assert(needsGuideline("This treatment is recommended for patients."));
  assert(!needsGuideline("A 16S rRNA sequence comparison."));
  assert.match(sourcePresentation(slide), /Guideline · 2026 · retrieved/);
  assert.match(
    sourcePresentation({ ...slide, citations: [{ ...slide.citations[0], year: "1996" }] }),
    /historical/,
  );
});
