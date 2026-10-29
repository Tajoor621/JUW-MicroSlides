import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
const topics = [
  "Gram staining",
  "Staphylococcus aureus",
  "Bacterial growth curve",
  "MIC testing",
  "Phage therapy",
  "Biofilms",
  "Clostridioides difficile",
  "Bacterial conjugation mechanism",
  "Escherichia coli",
  "Streptococcus pneumoniae",
  "Influenza virus replication",
  "HIV replication",
  "Adenovirus",
  "Rabies virus",
  "Candida albicans",
  "Aspergillus fumigatus",
  "Cryptococcus neoformans",
  "Plasmodium life cycle",
  "Giardia intestinalis",
  "Toxoplasma gondii",
];
test("20-topic source retrieval contracts: count, distinct content, provenance and failure", async () => {
  const server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true },
    logLevel: "error",
  });
  const old = globalThis.fetch;
  try {
    const { enrichTopicEvidence } = await server.ssrLoadModule("/src/lib/topic-evidence.ts");
    const { generateLocalDeck } = await server.ssrLoadModule("/src/lib/generate-deck.ts");
    const { assertCompleteDeck } = await server.ssrLoadModule("/src/lib/deck-completion.ts");
    const { supportedSlideSentences } = await server.ssrLoadModule("/src/lib/source-grounding.ts");
    const { validResearchCheckpoint } = await server.ssrLoadModule(
      "/src/lib/research-checkpoint.ts",
    );
    const { RESEARCH_CONFIG } = await server.ssrLoadModule("/src/lib/research-config.ts");
    assert.equal(RESEARCH_CONFIG.defaultBudgetMs, 1800000);
    for (const topic of topics) {
      const input = {
        topic,
        discipline: "General Microbiology",
        level: "Undergraduate",
        count: 3,
        notes: "",
        mode: "manual",
        researchDepth: "quick",
        includeObjectives: false,
        includeAssessment: false,
      };
      const generated = generateLocalDeck(input);
      const draft = { ...generated, slides: generated.slides.slice(0, 1) };
      const snapshot = JSON.stringify(draft);
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            resultList: {
              result: [
                {
                  id: "synthetic-fixture",
                  source: "TEST",
                  title: `${topic} — artificial software test fixture`,
                  abstractText: `This synthetic ${topic} fixture describes an artificial observation for software checks and is not teaching evidence. Its purpose is to test whether the retrieval contract preserves contiguous source wording without inventing scientific results.\n\nA separate synthetic ${topic} fixture compares artificial classification labels within this test dataset only. The comparison illustrates a different test pathway and does not describe biological findings or recommendations.`,
                  sourceDocument: {
                    id: "fixture",
                    title: "Synthetic software fixture",
                    url: "https://example.invalid/test-fixture",
                    publisher: "Software test",
                    access: "full-text",
                    text: "",
                    locator: "Synthetic fixture only",
                    license: "Synthetic test text",
                    retrievedAt: 1,
                    publishedDate: "2026",
                    jurisdiction: "",
                    acquisition: "provider-xml",
                  },
                },
              ],
            },
          }),
          { headers: { "content-type": "application/json" } },
        );
      const deck = assertCompleteDeck(await enrichTopicEvidence(draft, input), 3);
      assert.equal(deck.slides.length, 3, topic);
      const body = deck.slides.slice(1);
      assert.equal(new Set(body.map((s) => s.bullets.join(" "))).size, 2, topic);
      for (const s of body) {
        assert(s.citations.length, topic);
        assert(supportedSlideSentences(s).length, topic);
      }
      assert.equal(JSON.stringify(draft), snapshot, "retrieval must not mutate active draft");
      const checkpoint = {
        input,
        round: 1,
        work: [{ query: topic, cursor: "next" }],
        completedSlides: body,
        papers: [],
        savedAt: 1,
      };
      assert(validResearchCheckpoint(JSON.stringify(checkpoint), input));
      assert.equal(
        validResearchCheckpoint(JSON.stringify(checkpoint), { ...input, count: 4 }),
        null,
      );
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            resultList: { result: [] },
            results: [],
            esearchresult: { idlist: [] },
          }),
          { headers: { "content-type": "application/json" } },
        );
      await assert.rejects(enrichTopicEvidence(draft, input), /not complete yet/);
      assert.equal(JSON.stringify(draft), snapshot);
    }
  } finally {
    globalThis.fetch = old;
    await server.close();
  }
});
