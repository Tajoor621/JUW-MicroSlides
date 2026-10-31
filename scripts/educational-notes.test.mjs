import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
test("notes reject unsupported claims and undated treatment; backups retain traceable notes", async () => {
  const server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true },
    logLevel: "error",
  });
  try {
    const { assertNoteSources, educationalNotesFromDeck, NOTES_LABEL } = await server.ssrLoadModule(
      "/src/lib/educational-notes.ts",
    );
    const { parseWorkspaceBackup } = await server.ssrLoadModule("/src/lib/backup.ts");
    const source = {
      id: "software-fixture",
      title:
        "Real-time visualisation of the intracellular dynamics of conjugative plasmid transfer",
      url: "https://pubmed.ncbi.nlm.nih.gov/36653393/",
      doi: "10.1038/s41467-023-35978-3",
      year: "2023",
      guideline: false,
    };
    const statement = {
      text: "This is synthetic software test wording.",
      quote: "This is synthetic software test wording.",
      sourceId: source.id,
      locator: "Fixture",
    };
    const note = {
      id: "test-note",
      topic: "Software fixture",
      level: "Undergraduate",
      date: "2026-10-29",
      label: NOTES_LABEL,
      sections: [
        { heading: "Definition", statements: [statement, statement, statement, statement] },
      ],
      sources: [source],
      questions: [],
      glossary: [],
    };
    assertNoteSources(note);
    const raw = JSON.stringify({
      format: "juw-microslides",
      schemaVersion: 1,
      decks: [],
      notes: [note],
    });
    assert.equal(parseWorkspaceBackup(raw).notes[0].id, note.id);
    const noteDraft = {
      topic: "Legacy draft",
      body: "Retained user text",
      sources: "",
      level: "Undergraduate",
      mode: "manual",
    };
    assert.equal(
      parseWorkspaceBackup(
        JSON.stringify({ format: "juw-microslides", schemaVersion: 1, decks: [], noteDraft }),
      ).noteDraft.body,
      "Retained user text",
    );
    assert.throws(
      () =>
        assertNoteSources({
          ...note,
          sections: [
            {
              heading: "Definition",
              statements: Array(4).fill({ ...statement, text: "Unsupported extra conclusion." }),
            },
          ],
        }),
      /traceable/,
    );
    const treatment = {
      ...statement,
      text: "This treatment is recommended.",
      quote: "This treatment is recommended.",
    };
    assert.throws(
      () =>
        assertNoteSources({
          ...note,
          sections: [{ heading: "Treatment", statements: Array(4).fill(treatment) }],
        }),
      /dated guideline/,
    );
    assertNoteSources({
      ...note,
      sources: [{ ...source, title: "Synthetic guideline fixture", guideline: true }],
      sections: [{ heading: "Treatment", statements: Array(4).fill(treatment) }],
    });
    for (const text of [
      "Synthetic incubation lasts 12 hours.",
      "A synthetic MIC breakpoint is 4 mg/L.",
    ]) {
      const numerical = { ...statement, text, quote: text };
      assert.throws(
        () =>
          assertNoteSources({
            ...note,
            sections: [{ heading: "Diagnosis", statements: Array(4).fill(numerical) }],
          }),
        /dated guideline/,
      );
      assert.throws(
        () =>
          assertNoteSources({
            ...note,
            sources: [{ ...source, guideline: true }],
            sections: [{ heading: "Diagnosis", statements: Array(4).fill(numerical) }],
          }),
        /named, dated guideline/,
      );
      assertNoteSources({
        ...note,
        sources: [{ ...source, title: "Synthetic guideline fixture", guideline: true }],
        sections: [{ heading: "Diagnosis", statements: Array(4).fill(numerical) }],
      });
    }
    // Generated notes need useful teaching breadth; legacy archives stay readable.
    const makeDeck = (facts) => ({
      topic: "Software fixture",
      level: "Undergraduate",
      slides: [
        {
          id: "not-a-research-id",
          title: "Fixture",
          layout: "content",
          bullets: facts,
          leftBullets: [],
          rightBullets: [],
          citations: [source],
          claims: facts.map((text, i) => ({
            id: `c${i}`,
            text,
            status: "supported-excerpt",
            evidence: [
              {
                citationId: source.id,
                sourceUrl: source.url,
                quote: facts.join(" "),
                locator: "Synthetic fixture",
                access: "abstract",
                checkedAt: 1,
              },
            ],
          })),
        },
      ],
    });
    assert.throws(
      () =>
        educationalNotesFromDeck(
          makeDeck([
            "We presented the fixture results.",
            "This phenomenon was observed.",
            "Our experiments used an artificial observation.",
            "These results concern software only.",
          ]),
        ),
      /cannot support a useful note/,
    );
    const useful = educationalNotesFromDeck(
      makeDeck([
        "A software fixture is defined as artificial application test data.",
        "The synthetic fixture structure contains two labelled passages.",
        "The synthetic process retains contiguous wording without asserting biological findings.",
        "Passage provenance does not establish scientific validity.",
      ]),
    );
    const original = useful.sections
      .filter((s) => s.heading !== "Key points")
      .flatMap((s) => s.statements);
    assert.equal(original.length, 4);
    assert.equal(new Set(original.map((s) => s.text)).size, 4);
    const summary = useful.sections.find((s) => s.heading === "Key points").statements;
    assert(summary.length > 0);
    assert(
      summary.every((s) =>
        original.some((v) => v.text === s.text && v.sourceId === s.sourceId && v.quote === s.quote),
      ),
    );
    assert.throws(
      () => educationalNotesFromDeck(makeDeck(Array(4).fill(original[0].text))),
      /cannot support a useful note/,
    );
    assert.equal(new Set(useful.questions.map((q) => q.question)).size, useful.questions.length);
  } finally {
    await server.close();
  }
});
