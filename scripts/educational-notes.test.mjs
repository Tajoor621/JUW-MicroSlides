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
    const { assertNoteSources, NOTES_LABEL } = await server.ssrLoadModule(
      "/src/lib/educational-notes.ts",
    );
    const { parseWorkspaceBackup } = await server.ssrLoadModule("/src/lib/backup.ts");
    const source = {
      id: "software-fixture",
      title:
        "Real-time visualisation of the intracellular dynamics of conjugative plasmid transfer",
      url: "https://pubmed.ncbi.nlm.nih.gov/36653393/",
      doi: "10.1038/s41467-023-35978-3",
      year: "2026",
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
      sources: [{ ...source, guideline: true }],
      sections: [{ heading: "Treatment", statements: Array(4).fill(treatment) }],
    });
  } finally {
    await server.close();
  }
});
