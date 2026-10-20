import test from "node:test";
import assert from "node:assert/strict";
import { scientificPlainText, coherentSourcePassages } from "../src/lib/source-passages.ts";
test("scientific comparisons survive literal text and publisher markup", () => {
  assert.equal(
    scientificPlainText(
      "<p>Activity < 0.05; concentration > 2 &#x3bc;g; <italic>in vitro</italic>.</p>",
    ),
    "Activity < 0.05; concentration > 2 μg; in vitro.",
  );
  assert.match(scientificPlainText("Values &lt; 2 &amp; greater than 1."), /Values < 2 & greater/);
  assert.doesNotThrow(() => scientificPlainText("&#9999999999999; &#xD800;"));
});
test("extraction never joins different source paragraphs into a study claim", () => {
  const a = "Bacterial nitrogenase activity was measured in a defined comparison.";
  const b = "Bacterial nitrogenase activity depends on the stated assay conditions.";
  assert.deepEqual(
    coherentSourcePassages(`${a}\n\n${b}`, true, () => true),
    [],
  );
  const rows = coherentSourcePassages(
    `${a} ${b}\n\nUnrelated title\n\n${a} ${b}`,
    true,
    () => true,
  );
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((r) => r.paragraph),
    [1, 3],
  );
});
test("a qualification without the topic keyword stays with its finding", () => {
  const finding = "Bacterial nitrogenase activity increased in the tested cultivars.";
  const qualification =
    "However, these observations cannot establish responses in other soil compartments.";
  const rows = coherentSourcePassages(`${finding} ${qualification}`, true, (s) =>
    s.includes("nitrogenase"),
  );
  assert.deepEqual(rows[0].sentences, [finding, qualification]);
});
test("discarded intervening sentences break adjacency instead of implying a connection", () => {
  const a = "Fungal isolates were compared under carefully specified assay conditions.";
  const b = "Fungal growth was recorded over the entire specified observation window.";
  assert.deepEqual(
    coherentSourcePassages(`${a} Copyright all rights reserved. ${b}`, true, () => true),
    [],
  );
  assert.deepEqual(
    coherentSourcePassages(`<p>${a}</p><p>${b}</p>`, false, () => true),
    [],
  );
});
