import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

test("conjugation teaching sequence, draft provenance, assessments and backup survive together", async () => {
  const server = await createServer({
    configFile: false,
    logLevel: "error",
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true, include: [] },
    resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  });
  try {
    const { generateLocalDeck } = await server.ssrLoadModule("/src/lib/generate-deck.ts");
    const { applyStandardPedagogy } = await server.ssrLoadModule("/src/lib/lecture-modes.ts");
    const { assertCompleteDeck } = await server.ssrLoadModule("/src/lib/deck-completion.ts");
    const { conjugationTopic } = await server.ssrLoadModule("/src/lib/conjugation-curriculum.ts");
    const { inferFocus } = await server.ssrLoadModule("/src/lib/topic-engine.ts");
    const { lectureSpeakerNotes } = await server.ssrLoadModule("/src/lib/lecture-notes.ts");
    const input = {
      topic: "Bacterial conjugation",
      count: 18,
      level: "Undergraduate",
      discipline: "Microbial Genetics & Molecular Biology",
      notes: "",
      mode: "manual",
      generationMode: "standard",
      includeObjectives: true,
      includeAssessment: true,
    };
    for (let count = 2; count <= 15; count++) {
      const deck = generateLocalDeck({ ...input, count });
      assertCompleteDeck(deck, count);
      assert.equal(new Set(deck.slides.map((s) => s.title)).size, count);
    }
    const deck = assertCompleteDeck(
      applyStandardPedagogy(generateLocalDeck({ ...input, count: 15 }), input),
      18,
    );
    for (let count = 7; count <= 18; count++) {
      const request = { ...input, count };
      const small = applyStandardPedagogy(
        generateLocalDeck({ ...request, count: count - 3 }),
        request,
      );
      assertCompleteDeck(small, count);
      assert.equal(small.slides.find((s) => s.layout === "assessment").assessment.length, 3);
    }
    const content = deck.slides.filter((s) => s.teachingPurpose === "conjugation-core/v1");
    assert.equal(content.length, 14);
    const hfr = content.find((s) => s.title.includes("Hfr"));
    assert(
      hfr.citations.some((c) => c.pmid === "7768428" && c.doi === "10.1093/genetics/139.3.1123"),
    );
    assert(
      hfr.citations.some((c) => c.pmid === "13433587"),
      "Keep the original historical reference",
    );
    for (const slide of content) {
      assert(
        slide.teaching.definition &&
          slide.teaching.mechanism &&
          slide.teaching.pitfall &&
          slide.teaching.takeaway,
      );
      assert.equal(slide.teaching.steps.length, 4);
      assert.equal(slide.media.length, 0, "discovery never silently attaches third-party media");
      assert(slide.citations.every((c) => c.pmid && c.doi && c.evidenceKind === "primary"));
      assert(slide.claims.every((c) => c.status === "unreviewed"));
      assert.equal(slide.bullets.length, 2);
      assert.match(lectureSpeakerNotes(slide), /Common misconceptions/);
      assert.doesNotMatch(slide.title, /Table S1|Since multiple|et al|raised against/);
    }
    const sequence = content.map((s) => s.title).join("\n");
    assert(sequence.indexOf("origin of transfer") < sequence.indexOf("Relaxase"));
    assert(sequence.indexOf("One DNA strand") < sequence.indexOf("Incoming DNA"));
    const mcqs = deck.slides.find((s) => s.layout === "assessment").assessment;
    assert.equal(mcqs.length, 3);
    for (const q of mcqs) {
      assert(q.question.length <= 120, "Questions remain concise enough for a shared slide");
      assert(
        q.options.every((o) => o.length <= 60),
        "Options avoid multi-line paragraph density",
      );
      assert.equal(new Set(q.options).size, 4);
      assert(q.options.includes(q.answer));
      assert(q.sourceUrl && q.rationale.length > 60);
      assert.doesNotMatch(q.question, /Which teaching section|source passage/);
      assert(!q.options.some((answer) => content.some((s) => s.title === answer)));
    }
    assert.equal(inferFocus(input.topic).discipline, input.discipline);
    assert(!conjugationTopic("Conjugation in Mycoplasma agalactiae"));
    assert(!conjugationTopic("Transduction and natural competence in Bacillus"));
    const custom = generateLocalDeck({ ...input, count: 15, notes: "Use my instructor notes" });
    assert(!custom.slides.some((s) => s.teachingPurpose === "conjugation-core/v1"));
    const over = generateLocalDeck({ ...input, count: 25 });
    assert.equal(
      over.slides.length,
      15,
      "larger requests need additional research, never repeated core slides",
    );
    assert.throws(() => assertCompleteDeck(over, 25), /not complete/);
    const roundTrip = JSON.parse(JSON.stringify(deck));
    assert.deepEqual(roundTrip.slides, deck.slides);
  } finally {
    await server.close();
  }
});
