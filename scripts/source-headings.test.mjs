import assert from "node:assert/strict";
import { test } from "node:test";
import { sourceConceptHeading as heading } from "../src/lib/source-headings.ts";
const topic = "Bacterial chromosome segregation";
test("extracts source-contiguous concept labels instead of first-nine-word fragments", () => {
  for (const [source, expected] of [
    [
      "Hi-C-constrained polymer reconstructions have shown that experimentally derived contact maps describe chromosome organization.",
      "Hi-C-constrained polymer reconstructions",
    ],
    [
      "Precise chromosome segregation at each cell cycle is important for bacterial growth.",
      "Precise chromosome segregation",
    ],
    [
      "We propose that this ParB-stimulated ParA depolymerization activity moves the chromosome origin.",
      "ParB-stimulated ParA depolymerization activity",
    ],
  ]) {
    const input = [source];
    assert.equal(heading(input, topic, new Set()), expected);
    assert.deepEqual(input, [source], "Scientific source wording stays unchanged");
  }
});
test("preserves organism abbreviations, gene case and chemical charge", () => {
  for (const label of [
    "S. aureus virulence factors",
    "parA gene expression",
    "NAD+ dependent enzymes",
    "16S rRNA sequence analysis",
    "β-lactam resistance mechanisms",
  ]) {
    const source = `${label} were investigated in this study.`;
    assert.equal(heading([source], topic, new Set()), label);
  }
});
test("uses another sourced phrase before repeating a heading; never appends the full topic", () => {
  const input = ["Chromosome imaging reveals nucleoid organization during cell division."];
  const used = new Set();
  const first = heading(input, topic, used),
    second = heading(input, topic, used);
  assert.notEqual(first, second);
  assert(input[0].includes(first));
  assert(input[0].includes(second));
  assert(!second.includes(topic));
  const repeats = new Set();
  assert.equal(heading(["parA expression was measured."], topic, repeats), "parA expression");
  assert.equal(heading(["parA expression was measured."], topic, repeats), "parA expression (2)");
});
test("does not turn quantitative findings into unitless heading claims", () => {
  const source = "Activity recovery was 80% under controlled conditions.";
  const title = heading([source], "Enzyme immobilization", new Set());
  assert(!title.includes("80"));
  assert.equal(title, "Activity recovery");
  assert.equal(heading(["The and or."], topic, new Set()), "Source excerpt");
});
