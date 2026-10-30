import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
async function run(fn) {
  const v = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true },
    logLevel: "error",
  });
  try {
    await fn(v);
  } finally {
    await v.close();
  }
}
// Deliberately synthetic wording, not article quotations. Bibliographic identity is real.
const citation = {
  id: "fixture-reference",
  title: "Real-time visualisation of the intracellular dynamics of conjugative plasmid transfer",
  authors: "Couturier et al.",
  journal: "Nature Communications",
  year: "2023",
  doi: "10.1038/s41467-023-35978-3",
  pmid: "36653393",
  url: "https://pubmed.ncbi.nlm.nih.gov/36653393/",
};
const facts = [
  "This synthetic fixture does not establish a biological finding.",
  "This second software fixture statement exercises passage provenance.",
  "The third fixture sentence checks an independently labelled section.",
  "The final fixture sentence concerns software validation only.",
];
function source() {
  const slide = (id, bullets) => ({
    id,
    title: "Source section",
    subtitle: "",
    layout: "content",
    theme: "molecular",
    notes: "",
    bullets,
    leftBullets: [],
    rightBullets: [],
    citations: [citation],
    media: [],
    claims: bullets.map((text, i) => ({
      id: `${id}-${i}`,
      text,
      teachingPurpose: "Source section",
      classification: "study-result",
      status: "supported-excerpt",
      evidence: [
        {
          citationId: citation.id,
          sourceUrl: citation.url,
          quote: bullets.join(" "),
          locator: "Artificial fixture",
          access: "abstract",
          checkedAt: 1,
        },
      ],
    })),
  });
  return {
    id: "deck",
    title: "Software fixture",
    topic: "Software fixture",
    discipline: "General Microbiology",
    level: "Undergraduate",
    citationStyle: "Vancouver",
    course: "QA",
    courseCode: "QA",
    preparedBy: "QA",
    department: "QA",
    mediaPool: [],
    updatedAt: 1,
    slides: [
      { ...slide("title", []), layout: "title" },
      slide("editorial-body", facts.slice(0, 2)),
      slide("model-body", facts.slice(2)),
    ],
  };
}
test("whole statements retain negation, qualifiers, sentence boundaries and source identity", () =>
  run(async (v) => {
    const { passageContainsStatement: f, sourcePassages } = await v.ssrLoadModule(
      "/src/lib/generation-grounding.ts",
    );
    assert(f(facts.slice(0, 2).join(" "), facts[1]));
    assert(!f("This method does not increase stability.", "increase stability."));
    assert(!f("In these conditions, transfer was observed.", "transfer was observed."));
    assert(!f("Examples include e.g. A response was recorded.", "A response was recorded."));
    assert(!f("E. coli was studied.", "coli was studied."));
    assert(f("One statement. A final unpunctuated statement", "A final unpunctuated statement"));
    const d = source();
    assert.equal(sourcePassages(d).length, 2);
    d.slides[1].claims[0].evidence[0].sourceUrl = "https://example.invalid/foreign";
    assert(sourcePassages(d).every((p) => p.sourceUrl !== "https://example.invalid/foreign"));
    d.sourceDocuments = [{ url: citation.url, text: "Different source text" }];
    assert.equal(sourcePassages(d).length, 0);
  }));
test("structured model proposals cannot drop negation or reuse unrelated timing and table numbers", () =>
  run(async (v) => {
    const { groundedModelFields } = await v.ssrLoadModule("/src/lib/lecture-extraction.ts");
    const base = source().slides[1];
    const candidate = structuredClone(base);
    candidate.protocol = {
      materials: [],
      steps: [
        {
          action: "This synthetic action lasts 10 minutes.",
          timing: "20 minutes",
          sourceUrl: citation.url,
        },
      ],
      interpretation: "",
      qc: "",
      biosafety: "",
      troubleshooting: "",
    };
    candidate.scientificTable = { caption: "Data", headers: ["A", "B"], rows: [["10", "20"]] };
    const passage = `Data A B. This synthetic action lasts 10 minutes. A different action lasts 20 minutes. ${citation.url}`;
    const result = groundedModelFields(base, candidate, passage);
    assert.equal(result.protocol, undefined);
    assert.equal(result.scientificTable, undefined);
    candidate.protocol.steps = [];
    candidate.protocol.interpretation = "increase stability.";
    assert.equal(
      groundedModelFields(base, candidate, "This method does not increase stability.").protocol,
      undefined,
    );
  }));
test("all slide IDs and structured surfaces are covered without approving references or bare numbers", () =>
  run(async (v) => {
    const { slideGrounding, scientificFields } = await v.ssrLoadModule(
      "/src/lib/generation-grounding.ts",
    );
    const d = source(),
      s = d.slides[1];
    s.teaching = {
      definition: facts[0],
      mechanism: "An unsupported mechanism.",
      steps: ["An unsupported step."],
      quantitative: [
        {
          metric: "Recovery",
          value: "5",
          units: "%",
          conditions: "in bacteria",
          sourceUrl: citation.url,
          quote: "5",
        },
      ],
      labels: [{ text: "Unsupported label", x: 1, y: 1 }],
      comparison: [{ criterion: "X", left: "Y", right: "Z" }],
      scaleBar: { pixels: 5, physicalLength: 1, unit: "µm", calibrationSource: "Unknown" },
    };
    s.protocol = {
      materials: ["A reagent"],
      steps: [
        {
          action: "Incubate the fixture for 10 minutes.",
          timing: "20 minutes",
          sourceUrl: citation.url,
        },
      ],
      interpretation: "An interpretation.",
      qc: "A control.",
      biosafety: "A safety claim.",
      troubleshooting: "An error.",
    };
    s.caseData = {
      caseNumber: 1,
      vignette: "A vignette.",
      differential: "A differential.",
      workup: "A work-up.",
      results: "A result.",
      diagnosis: "A diagnosis.",
      management: "A management claim.",
      questions: ["Explain the evidence."],
      phase: "presentation",
    };
    s.scientificTable = { caption: "Data", headers: ["X", "Y"], rows: [["5", "10"]] };
    s.chart = {
      title: "Chart",
      xLabel: "time",
      yLabel: "recovery",
      points: [{ x: 5, y: 10 }],
      sourceUrl: citation.url,
    };
    s.taxonomy = [{ label: "Taxon", parent: -1 }];
    s.assessment = [
      {
        kind: "mcq",
        question: "What follows?",
        options: ["An option"],
        answer: "An answer.",
        rationale: "A rationale.",
      },
    ];
    const fields = scientificFields(s);
    for (const key of [
      "teaching.steps.0",
      "teaching.quantitative.0",
      "teaching.scaleBar",
      "protocol.steps.0",
      "caseData.management",
      "scientificTable.rows.0",
      "chart.points.0",
      "taxonomy.0",
      "assessment.0.answer",
      "assessment.0.rationale",
    ])
      assert(
        fields.some((f) => f.field === key),
        key,
      );
    const checked = slideGrounding(d, s);
    assert.equal(checked.find((f) => f.field === "teaching.definition").status, "exact-passage");
    for (const field of [
      "teaching.mechanism",
      "teaching.quantitative.0",
      "chart.points.0",
      "caseData.management",
    ])
      assert.equal(checked.find((f) => f.field === field).status, "reference-only");
    const copy = structuredClone(d);
    copy.slides[1].citations = [];
    assert(slideGrounding(copy, copy.slides[1]).some((f) => f.status === "source-needed"));
  }));
test("model text cannot fabricate citations, change quantities or inject structured facts; source fallback keeps exact count", () =>
  run(async (v) => {
    const { groundModelDeck } = await v.ssrLoadModule("/src/lib/source-grounded-ai.ts");
    const { supportedSlideSentences } = await v.ssrLoadModule("/src/lib/source-grounding.ts");
    const { deckSchema } = await v.ssrLoadModule("/src/lib/backup.ts");
    const src = source(),
      snapshot = JSON.stringify(src),
      model = structuredClone(src);
    model.slides[1].bullets = [facts[0], "A fabricated quantitative finding of 99%."];
    model.slides[1].notes = "An unsupported speaker-note claim.";
    model.slides[1].teaching = { mechanism: "An unsupported mechanism." };
    model.slides[1].chart = {
      title: "Forged",
      xLabel: "x",
      yLabel: "y",
      points: [{ x: 99, y: 100 }],
      sourceUrl: "https://example.invalid",
    };
    model.slides[1].citations = [{ ...citation, id: "invented", doi: "invented" }];
    model.slides[2].bullets = ["A completely unsupported model claim."];
    const made = groundModelDeck(model, src);
    assert.equal(made.slides.length, 3);
    assert.equal(JSON.stringify(src), snapshot);
    assert.deepEqual(made.slides[1].bullets, [facts[0]]);
    assert.equal(made.slides[1].notes, "");
    assert.equal(made.slides[1].chart, undefined);
    assert(!JSON.stringify(made).includes("99%"));
    assert.deepEqual(made.slides[2].bullets, src.slides[2].bullets);
    assert(made.slides[1].citations.every((c) => c.id === citation.id));
    assert(made.slides[1].claims.every((c) => c.status === "unreviewed"));
    assert.equal(supportedSlideSentences(made.slides[1]).length, 1);
    assert.equal(deckSchema.parse(made).slides.length, 3);
    const rejected = structuredClone(model);
    rejected.slides[1].bullets = ["Unsupported first body."];
    rejected.slides[2].bullets = ["Unsupported second body."];
    const retained = groundModelDeck(rejected, src);
    assert.equal(
      retained.generationSource,
      "knowledge",
      "Rejected model bodies must not imply AI authorship",
    );
    assert.deepEqual(retained.slides[1].bullets, src.slides[1].bullets);
    const bad = structuredClone(model);
    bad.slides.pop();
    assert.throws(() => groundModelDeck(bad, src), /slide count/);
  }));
