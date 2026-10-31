import assert from "node:assert/strict";
import { test } from "node:test";
import { sourceConceptHeading as heading } from "../src/lib/source-headings.ts";
const topic = "Bacterial chromosome segregation";
test("separates provider-glued section boundaries without damaging organism abbreviations", () => {
  const source =
    "We estimate the effective reproduction number.ResultsThe incubation period was measured.";
  const title = heading([source], "Transmission dynamics", new Set());
  assert.equal(title, "effective reproduction number");
  assert(source.includes(title));
  assert.equal(
    heading(["ResultsThe incubation period was measured."], topic, new Set()),
    "incubation period",
  );
  assert.equal(
    heading(["S. aureus virulence factors were investigated."], topic, new Set()),
    "S. aureus virulence factors",
  );
});
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
test("paper table/figure locators are not teaching concepts", () => {
  for (const locator of ["Table S1", "Figure 2A", "Supplementary Table IV"]) {
    const title = heading(
      [`Results are in ${locator}. Bacterial plasmid maintenance was investigated.`],
      topic,
      new Set(),
    );
    assert(!title.includes(locator));
    assert.equal(title, "Bacterial plasmid maintenance");
  }
});

// Wording observed in a real live source retrieval; headings remain source spans.
test("natural-competence headings avoid infinitive verbs and dangling using clauses", () => {
  const source =
    "Natural competence is a useful tool for researchers to manipulate bacterial genotypes.";
  assert.equal(
    heading([source], "Natural competence in bacteria", new Set()),
    "Natural competence",
  );
  const second = "They also conferred streptomycin resistance to susceptible strains using DNA.";
  const label = heading([second], "Natural competence in bacteria", new Set());
  assert.equal(label, "streptomycin resistance");
  assert(second.includes(label));
});

test("study extension headings prefer concepts to a repeated single drug name", () => {
  const source = [
    "An inhibitory effect of pravastatin, hesperetin, and dinoprost was observed on the conjugation frequency of plasmid R388.",
  ];
  const title = heading(
    source,
    "Bacterial conjugation",
    new Set(["inhibitory effect", "conjugation frequency", "plasmid r388"]),
  );
  assert.notEqual(title, "pravastatin");
  assert(title.split(/\s+/).length >= 2);
});
