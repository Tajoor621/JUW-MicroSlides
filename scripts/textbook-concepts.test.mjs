import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
test("eight provisional textbook topics support bounded counts, sourced notes, restore and explicit scarcity", async () => {
  const vite = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true },
    logLevel: "error",
  });
  const results = [];
  try {
    const { TEXTBOOK_CONCEPTS, textbookConceptDeck } = await vite.ssrLoadModule(
      "/src/lib/textbook-concepts.ts",
    );
    const { generateLocalDeck } = await vite.ssrLoadModule("/src/lib/generate-deck.ts");
    const { assertCompleteDeck } = await vite.ssrLoadModule("/src/lib/deck-completion.ts");
    const { educationalNotesFromDeck, assertNoteSources } = await vite.ssrLoadModule(
      "/src/lib/educational-notes.ts",
    );
    const { parseWorkspaceBackup } = await vite.ssrLoadModule("/src/lib/backup.ts");
    for (const c of TEXTBOOK_CONCEPTS) {
      const input = {
        topic: c.topic,
        discipline: c.discipline,
        count: c.concepts.length + 1,
        level: "Undergraduate",
        notes: "",
        mode: "manual",
      };
      assert.equal(c.educatorApproved, false);
      const deck = textbookConceptDeck(generateLocalDeck(input), input, true);
      assertCompleteDeck(deck, input.count);
      const content = deck.slides.filter((s) => s.layout !== "title");
      assert.equal(new Set(content.map((s) => s.bullets.join(" "))).size, content.length);
      assert(
        content.every((s) => s.citations.length && s.claims[0].evidence[0].access === "textbook"),
      );
      const note = educationalNotesFromDeck(deck);
      assertNoteSources(note);
      const summary = note.sections.find((s) => s.heading === "Key points");
      assert(summary.statements.length > 0, "Useful notes have sourced key points");
      assert(summary.statements.every((f) => note.sources.some((s) => s.id === f.sourceId)));
      assert.equal(note.sources[0].authors, c.source.authors);
      assert(note.sources[0].publication.includes(c.source.edition));
      assert(note.sources[0].locator.includes("Printed"));
      const restored = parseWorkspaceBackup(
        JSON.stringify({
          format: "juw-microslides",
          schemaVersion: 1,
          decks: [deck],
          notes: [note],
        }),
      );
      assert.equal(restored.notes[0].topic, c.topic);
      assert.equal(restored.notes[0].sources[0].authors, c.source.authors);
      assert.equal(
        restored.notes[0].sections.find((s) => s.heading === "Key points").statements.length,
        summary.statements.length,
      );
      assert.equal(restored.decks[0].slides.length, deck.slides.length);
      assert.throws(() => assertCompleteDeck(deck, 50), /not complete/);
      for (let count = 1; count <= input.count; count++)
        assertCompleteDeck(
          textbookConceptDeck(generateLocalDeck({ ...input, count }), { ...input, count }, true),
          count,
        );
      results.push({
        topic: c.topic,
        boundedCount: input.count,
        passed: true,
        scientificallyQualified: false,
        educatorApproved: false,
      });
    }
    await mkdir("qualification-results/concepts", { recursive: true });
    await writeFile(
      "qualification-results/concepts/coverage.json",
      JSON.stringify(
        {
          results,
          scope:
            "Eight provisional textbook extract contracts; not the department syllabus or universal live coverage.",
        },
        null,
        2,
      ),
    );
  } finally {
    await vite.close();
  }
});
