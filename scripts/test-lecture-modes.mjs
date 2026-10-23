import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { teachingFixture } from "./teaching-fixture.mjs";
const vite = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true },
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  logLevel: "error",
});
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
try {
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { onLine: false } });
  const {
    generateModeDeck,
    generateCourseModule,
    modeMinimum,
    PATHOGEN_SECTIONS,
    LAB_SECTIONS,
    assessmentSlides,
    applyStandardPedagogy,
    sectionNotes,
  } = await vite.ssrLoadModule("/src/lib/lecture-modes.ts");
  const { assertCompleteDeck } = await vite.ssrLoadModule("/src/lib/deck-completion.ts");
  const { deckSchema, parseBackup } = await vite.ssrLoadModule("/src/lib/backup.ts");
  const { lectureMarkdown } = await vite.ssrLoadModule("/src/lib/export-lecture.ts");
  const { lectureFindings } = await vite.ssrLoadModule("/src/lib/lecture-readiness.ts");
  const { courseProblem, orderedCourse, restoredDeckCopies } = await vite.ssrLoadModule(
    "/src/lib/course-builder.ts",
  );
  const { audienceFrame } = await vite.ssrLoadModule("/src/lib/audience-frame.ts");
  const { surfaceItems, surfaceReviewProblem, surfaceSnapshot } = await vite.ssrLoadModule(
    "/src/lib/surface-review.ts",
  );
  const input = {
    topic: "Synthetic software fixture",
    discipline: "General Microbiology",
    count: 12,
    level: "Undergraduate",
    notes: "",
    mode: "manual",
    generationMode: "pathogen",
    includeObjectives: true,
  };
  const words = ["amber", "birch", "cedar", "delta", "elm", "fir", "garnet", "hazel"];
  const notes = PATHOGEN_SECTIONS.map(
    (s, i) =>
      `## ${s.title}\nFixture ${words[i]} sentence for testing this section only; it is not a scientific teaching claim.\nA distinct ${words[i]} observation is software test material, not an organism fact.`,
  ).join("\n\n");
  const deck = await generateModeDeck({ ...input, notes });
  assert.equal(deck.slides.length, 12);
  assert.equal(deck.slides[1].layout, "learning-objectives");
  assert.deepEqual(
    deck.slides.slice(2, 10).map((s) => s.sectionType),
    PATHOGEN_SECTIONS.map((s) => s.kind),
  );
  assert(deck.slides.slice(2, 10).every((s) => s.notes.includes("Common misconceptions")));
  assert(
    deck.slides.every((s) => !s.citations.some((c) => c.pmid)),
    "Notes never manufacture PMIDs",
  );
  assert.equal(assertCompleteDeck(deck, 12).slides.length, 12);
  assert.deepEqual(
    parseBackup(lectureMarkdown(deck))[0].slides,
    deckSchema.parse(deck).slides,
    "Markdown recovery preserves all structured fields",
  );
  assert(lectureFindings(deck).some((f) => /verification flag/.test(f.message)));
  await assert.rejects(() => generateModeDeck({ ...input, count: 11 }), /at least 12/);
  await assert.rejects(
    () =>
      generateModeDeck({
        ...input,
        notes: notes.replace("## Taxonomy & nomenclature", "## Unknown heading"),
      }),
    /No|complete|Storage|indexedDB|source|fetch|network|not defined/i,
  );
  assert.equal(modeMinimum({ ...input, generationMode: "clinical-cases", clinicalCases: 8 }), 20);
  const labNotes = LAB_SECTIONS.map(
    (s, i) =>
      `## ${s.title}\nSoftware fixture ${words[i]} stage with unique narrative ${i}. This is synthetic input for an editor test.\nThe fixture ${words[i]} variant requires human evidence review before any teaching use.`,
  ).join("\n\n");
  const lab = await generateModeDeck({
    ...input,
    generationMode: "laboratory",
    count: 10,
    notes: labNotes,
  });
  assert(lab.slides.some((s) => s.layout === "lab-protocol"));
  assert(lectureFindings(lab).some((f) => /timing/.test(f.message)));
  const { deck: reviewed } = await teachingFixture(vite);
  const assessmentDeck = structuredClone(reviewed);
  assessmentDeck.slides = Array.from({ length: 3 }, (_, i) => ({
    ...structuredClone(reviewed.slides[0]),
    id: `s${i}`,
    title: `Evidence section ${words[i]}`,
    bullets: [`${words[i]} synthetic fixture`],
    claims: [{ ...reviewed.slides[0].claims[0], text: `${words[i]} fixture claim` }],
  }));
  const assessment = assessmentSlides(assessmentDeck);
  assert.equal(assessment[0].assessment.length, 3);
  assert.equal(assessment[1].assessment.length, 2);
  const publicDeck = { ...reviewed, slides: [assessment[0]] };
  assert(
    audienceFrame(publicDeck, 0, "Vancouver").slide.assessment.every(
      (q) => !q.answer && !q.rationale,
    ),
  );
  const edited = structuredClone(reviewed);
  edited.slides[0].clinicalPearl = "Synthetic additional claim";
  const item = surfaceItems(edited.slides[0]).find((i) => i.field === "clinicalPearl");
  assert(item);
  const record = {
    field: item.field,
    snapshot: surfaceSnapshot(edited, edited.slides[0], item.field),
    verdict: "not-factual",
    rationale: "This synthetic record is deliberately invalid for the scientific content gate.",
    reviewedAt: Date.now(),
  };
  assert.match(
    surfaceReviewProblem(edited, edited.slides[0], item.field, record),
    /requires|requires a|Scientific/i,
  );
  const course = [
    {
      ...reviewed,
      id: "a",
      courseSeries: { id: "course", title: "Course", order: 1, prerequisites: [] },
    },
    {
      ...reviewed,
      id: "b",
      courseSeries: { id: "course", title: "Course", order: 2, prerequisites: ["a"] },
    },
  ];
  assert.match(courseProblem(course, "a", ["b"]), /cycle/);
  assert.equal(orderedCourse(course, "course")[0].id, "a");
  assert.deepEqual(sectionNotes("## One\nA\n## Two\nB", "Two"), "B");
  const standard = applyStandardPedagogy(
    { ...reviewed, slides: [{ ...reviewed.slides[0], layout: "title" }, ...assessmentDeck.slides] },
    { ...input, count: 5, generationMode: "standard" },
  );
  assert.equal(standard.slides.length, 5);
  const { parseTaxonomyXml } = await vite.ssrLoadModule("/src/lib/taxonomy-source.ts");
  const xml =
    "<TaxaSet><Taxon><TaxId>123</TaxId><ScientificName>Fixture species</ScientificName><Rank>species</Rank><LineageEx><Taxon><TaxId>12</TaxId><ScientificName>Fixture genus</ScientificName><Rank>genus</Rank></Taxon></LineageEx></Taxon></TaxaSet>";
  assert.deepEqual(
    parseTaxonomyXml(xml, "123").nodes.map((n) => n.parent),
    [-1, 0],
  );
  assert.throws(() => parseTaxonomyXml(xml, "456"), /identity/);
  assert.throws(() => parseTaxonomyXml('<!ENTITY unsafe "value">' + xml, "123"), /Invalid/);
  const { populateLabelledFields, groundedModelFields } = await vite.ssrLoadModule(
    "/src/lib/lecture-extraction.ts",
  );
  const caseSlide = {
    ...reviewed.slides[0],
    caseData: {
      caseNumber: 1,
      phase: "presentation",
      vignette: "",
      differential: "",
      workup: "",
      results: "",
      diagnosis: "",
      management: "",
      questions: [],
    },
  };
  const caseText =
    "Patient: Synthetic vignette\nDifferential: Synthetic alternative\nWork-up: Synthetic test\nResults: Synthetic observation\nDiagnosis: Synthetic diagnosis\nManagement: Synthetic management\nQuestions: Why?; How?";
  const extracted = populateLabelledFields(caseSlide, caseText);
  assert.equal(extracted.caseData.vignette, "Synthetic vignette");
  assert.equal(extracted.caseData.questions.length, 2);
  const { caseContinuityProblem } = await vite.ssrLoadModule("/src/lib/lecture-case-context.ts");
  const otherCase = structuredClone(extracted);
  otherCase.caseData.phase = "resolution";
  otherCase.claims = [
    {
      ...otherCase.claims[0],
      evidence: [
        { ...otherCase.claims[0].evidence[0], sourceUrl: "https://example.org/different-patient" },
      ],
    },
  ];
  assert.match(caseContinuityProblem([extracted, otherCase], [false, false]), /no shared source/);
  assert.match(caseContinuityProblem([extracted, otherCase], [true, false]), /mixes supplied/);
  assert.equal(caseContinuityProblem([extracted, otherCase], [true, true]), "");
  assert.equal(caseContinuityProblem([extracted, extracted], [false, false]), "");
  const publicCase=audienceFrame({...reviewed,slides:[{...extracted,caseData:{...extracted.caseData,diagnosis:"Hidden until resolution",management:"Private case resolution"}}]},0,"Vancouver").slide;
  assert.equal(publicCase.caseData.diagnosis,"");
  assert.equal(publicCase.caseData.management,"");
  const invented = structuredClone(extracted);
  invented.caseData.questions = ["Invented scientific assumption?"];
  assert.deepEqual(
    groundedModelFields(caseSlide, invented, caseText).caseData,
    caseSlide.caseData,
    "AI cannot introduce unsupported question assumptions",
  );
  const protocol = structuredClone(reviewed);
  protocol.slides[0].protocol = {
    materials: [],
    steps: [
      {
        action: "Synthetic action",
        timing: "999 minutes",
        sourceUrl: reviewed.sourceDocuments[0].url,
      },
    ],
    interpretation: "",
    qc: "",
    biosafety: "",
    troubleshooting: "",
  };
  const ps = protocol.slides[0];
  const pf = "protocol.steps.0";
  const pr = {
    field: pf,
    snapshot: surfaceSnapshot(protocol, ps, pf),
    verdict: "supported",
    rationale: "Synthetic software validation of source timing only.",
    reviewedAt: Date.now(),
    sourceUrl: reviewed.sourceDocuments[0].url,
    quote: reviewed.sourceDocuments[0].text,
    locator: "Test paragraph",
  };
  assert.match(surfaceReviewProblem(protocol, ps, pf, pr), /timing must occur/);
  const { lectureStructuredHtml } = await vite.ssrLoadModule("/src/lib/lecture-transcript.ts");
  const htmlQuestion = lectureStructuredHtml({
    ...assessment[0],
    assessment: [
      {
        ...assessment[0].assessment[0],
        question: "<script>Question</script>",
        answer: "PRIVATE ANSWER",
        rationale: "PRIVATE RATIONALE",
      },
    ],
  });
  assert(!htmlQuestion.includes("PRIVATE ANSWER") && !htmlQuestion.includes("PRIVATE RATIONALE"));
  assert(htmlQuestion.includes("&lt;script&gt;"));
  const oldSnapshot = surfaceSnapshot(protocol, ps, pf);
  ps.protocol.steps[0].timing = "controlled test condition";
  assert.notEqual(
    surfaceSnapshot(protocol, ps, pf),
    oldSnapshot,
    "Editing structured protocol invalidates previous review",
  );
  assert.equal(
    surfaceReviewProblem(protocol, ps, pf, { ...pr, snapshot: surfaceSnapshot(protocol, ps, pf) }),
    null,
  );
  const restored = restoredDeckCopies(course);
  assert.notEqual(restored[0].id, course[0].id);
  assert.equal(restored[1].courseSeries.prerequisites[0], restored[0].id);
  assert.equal(restored[0].courseSeries.id, restored[1].courseSeries.id);
  assert.notEqual(restored[0].courseSeries.id, course[0].courseSeries.id);
  const { generateLocalDeck } = await vite.ssrLoadModule("/src/lib/generate-deck.ts");
  for (const n of [1, 2]) {
    const brief = applyStandardPedagogy(
      generateLocalDeck({
        ...input,
        generationMode: "standard",
        topic: "Enzyme immobilization",
        count: n,
      }),
      { ...input, generationMode: "standard", count: n },
    );
    assert.equal(assertCompleteDeck(brief, n).slides.length, n);
    assert.equal(brief.slides.at(-1).learningObjectives.length, 1);
  }
  const module = await generateCourseModule(
    {
      ...input,
      count: 4,
      generationMode: "curriculum",
      moduleTopics: ["Fixture One", "Fixture Two"],
    },
    undefined,
    undefined,
    async (i) => generateLocalDeck({ ...i, topic: "Enzyme immobilization" }),
  );
  assert.equal(module.length, 2);
  assert(module.every((d) => d.slides.length === 4));
  assert.equal(module[1].courseSeries.prerequisites[0], module[0].id);
  await assert.rejects(
    () => generateCourseModule({ ...input, moduleTopics: ["Same", "same"] }),
    /distinct/,
  );
  await assert.rejects(() => generateCourseModule({...input,moduleTopics:["x".repeat(501),"Second"]}), /500 characters/);
  console.log(
    "PASS V6.2.1 mode allocation, offline source notes, objectives, assessment privacy, protocol gaps, review gates, Markdown recovery and course cycle rejection (synthetic software fixtures only)",
  );
} finally {
  if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
  else delete globalThis.navigator;
  await vite.close();
}
