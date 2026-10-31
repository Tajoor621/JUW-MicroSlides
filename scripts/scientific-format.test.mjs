import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  scientificRuns,
  unitTypography,
  doiSyntax,
  scientificPreflight,
} from "../src/lib/scientific-format.ts";
import { protocolSafetyProblem, assertGeneratedBiosafety } from "../src/lib/biosafety.ts";
test("nomenclature runs preserve exact scientific strings and avoid ambiguous general prose", () => {
  const text = "Escherichia coli, Candida albicans and Candida species. E. coli remains ambiguous.";
  const runs = scientificRuns(text);
  assert.equal(runs.map((r) => r.text).join(""), text);
  assert.deepEqual(
    runs.filter((r) => r.italic).map((r) => r.text),
    ["Escherichia coli", "Candida albicans", "Candida", "E. coli"],
  );
  assert(!scientificRuns("Research methods and Unknownus species").some((r) => r.italic));
});
test("unit/DOI checks do not rescale numbers, certify claims or mutate a draft", async () => {
  assert.equal(unitTypography("10 uL, 2 mg/ml at 37°C"), "10 µL, 2 mg/mL at 37 °C");
  assert.equal(doiSyntax("https://doi.org/10.1000/example"), "10.1000/example");
  assert.equal(doiSyntax("10.bad/not a DOI"), null);
  const fixture = JSON.parse(
    await readFile(new URL("./fixtures/export-draft.json", import.meta.url), "utf8"),
  ).decks[0];
  const before = JSON.stringify(fixture);
  assert(scientificPreflight(fixture).some((n) => /Unit typography/.test(n.message)));
  assert.equal(JSON.stringify(fixture), before);
});
test("high-containment protocol screening preserves non-operational education", () => {
  assert(
    protocolSafetyProblem({
      topic: "High-containment culture workflow",
      notes: "",
      generationMode: "laboratory",
    }),
  );
  assert.equal(
    protocolSafetyProblem({
      topic: "High-containment laboratory governance",
      notes: "",
      generationMode: "standard",
    }),
    null,
  );
  assert.equal(
    protocolSafetyProblem({
      topic: "Gram stain interpretation",
      notes: "",
      generationMode: "laboratory",
    }),
    null,
  );
  assert.throws(
    () =>
      assertGeneratedBiosafety({
        topic: "High-containment overview",
        title: "Teaching draft",
        slides: [{ layout: "lab-protocol" }],
      }),
    /withheld/,
  );
});

test("slide decor follows specific section concepts before the general deck topic", async () => {
  const { slideArtworkTopic, topicArtKind } = await import("../src/lib/topic-artwork.ts");
  assert.equal(topicArtKind(slideArtworkTopic("Bacterial genomes", "Gram staining")), "microscopy");
  assert.equal(
    topicArtKind(slideArtworkTopic("Bacterial genomes", "Culture and growth")),
    "culture",
  );
  assert.equal(
    topicArtKind(slideArtworkTopic("Bacterial genomes", "Learning objectives")),
    "genome",
  );
});
