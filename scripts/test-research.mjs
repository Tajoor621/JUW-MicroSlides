import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  logLevel: "error",
});
let checks = 0;
const check = (name, fn) => {
  fn();
  checks++;
  console.log(`PASS ${name}`);
};
try {
  const { parseEvidencePaste } = await server.ssrLoadModule("/src/lib/elicit.ts");
  const { formatCitation } = await server.ssrLoadModule("/src/lib/citations.ts");
  const { generateLocalDeck } = await server.ssrLoadModule("/src/lib/generate-deck.ts");
  const { parseBackup } = await server.ssrLoadModule("/src/lib/backup.ts");
  const { allowedImageUrl, safeImageFetch } = await server.ssrLoadModule(
    "/src/lib/safe-image-fetch.ts",
  );
  const { reserveAiRequest } = await server.ssrLoadModule("/src/lib/ai-limits.ts");
  const { validateLocalAiUrl } = await server.ssrLoadModule("/src/lib/local-ai.ts");
  check("multiline CSV and escaped quotes", () => {
    const result = parseEvidencePaste(
      'Title,Authors,Year,Journal\n"First line\nsecond ""quoted"" line",Smith J,2024,Science',
    );
    assert.equal(result.length, 1);
    assert.equal(result[0].title, 'First line\nsecond "quoted" line');
  });
  check("nested BibTeX title and structured author", () => {
    const result = parseEvidencePaste(
      "@article{x,title={A {DNA} study},author={Smith, John and Doe, Jane},year={2024},journal={Test Journal},doi={10.1000/test}}",
    );
    assert.equal(result.length, 1);
    assert.match(result[0].title, /DNA/);
    assert.equal(result[0].cslAuthors[0].family, "Smith");
  });
  check("malformed CSV is reported", () =>
    assert.throws(() => parseEvidencePaste('Title,Year\n"unclosed,2020')),
  );
  const input = {
    topic: "Bacterial genome architecture",
    discipline: "Bacteriology",
    level: "Undergraduate",
    count: 12,
    notes: "",
    mode: "manual",
  };
  const deck = generateLocalDeck(input);
  check("editable backup preserves slides, media, notes and references", () =>
    assert.deepEqual(
      parseBackup(
        JSON.stringify({ format: "juw-microslides", schemaVersion: 1, decks: [deck] }),
      )[0],
      deck,
    ),
  );
  check("unknown schema cannot overwrite saved work", () =>
    assert.throws(() =>
      parseBackup(JSON.stringify({ format: "juw-microslides", schemaVersion: 99, decks: [deck] })),
    ),
  );
  check("unsafe imported image URLs rejected", () => {
    const bad = structuredClone(deck);
    bad.slides[0].media = [
      {
        id: "x",
        title: "x",
        kind: "photo",
        src: "javascript:alert(1)",
        credit: "",
        license: "",
        source: "",
        keywords: [],
      },
    ];
    assert.throws(() =>
      parseBackup(JSON.stringify({ format: "juw-microslides", schemaVersion: 1, decks: [bad] })),
    );
  });
  check("image proxy rejects private and credentialed hosts", () => {
    for (const url of [
      "http://127.0.0.1/image",
      "https://169.254.169.254/image",
      "https://example.com/image",
      "https://upload.wikimedia.org.evil.test/x",
      "https://a:b@upload.wikimedia.org/x",
    ])
      assert.equal(allowedImageUrl(url), false);
    assert.equal(allowedImageUrl("https://upload.wikimedia.org/x"), true);
  });
  let requested = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    requested++;
    return new Response(null, { status: 302, headers: { location: "https://127.0.0.1/private" } });
  };
  assert.equal(
    await safeImageFetch("https://upload.wikimedia.org/x", AbortSignal.timeout(1000)),
    null,
  );
  assert.equal(requested, 1);
  checks++;
  console.log("PASS image redirects cannot reach private hosts");
  globalThis.fetch = originalFetch;
  check("local AI requires an explicit local address", () => {
    assert.equal(validateLocalAiUrl("http://192.168.1.10:11434"), "http://192.168.1.10:11434");
    assert.throws(() => validateLocalAiUrl("https://example.com"));
    assert.throws(() => validateLocalAiUrl("http://user:pass@localhost"));
  });
  check("AI per-instance quota resets", () => {
    for (let i = 0; i < 6; i++) assert.equal(reserveAiRequest("deck", 1000), true);
    assert.equal(reserveAiRequest("deck", 1001), false);
    assert.equal(reserveAiRequest("deck", 62000), true);
  });
  check("five CSL styles format a structured reference", () => {
    for (const style of ["APA", "Vancouver", "Harvard", "Nature", "AMA"]) {
      const formatted = formatCitation(
        {
          id: "x",
          title: "Genome structure",
          authors: "Smith J",
          cslAuthors: [{ family: "Smith", given: "John" }],
          year: "2024",
          journal: "Science",
          volume: "12",
          pages: "1–9",
          doi: "10.1000/test",
        },
        style,
      );
      assert.match(formatted, /Smith/);
      assert.match(formatted, /Genome structure/);
      assert.match(formatted, /2024/);
    }
  });
  console.log(`${checks} research integrity and data protection checks passed.`);
} finally {
  await server.close();
}
