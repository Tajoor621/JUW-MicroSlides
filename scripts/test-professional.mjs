import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
const server = await createServer({
  optimizeDeps: { noDiscovery: true, include: [] },
  configFile: false,
  server: { middlewareMode: true },
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  logLevel: "error",
});
try {
  const { requestedCount, assertCompleteDeck } = await server.ssrLoadModule(
    "/src/lib/deck-completion.ts",
  );
  const { generateLocalDeck } = await server.ssrLoadModule("/src/lib/generate-deck.ts");
  const { reconcileDeck, integrityAudit, duplicateStatements } = await server.ssrLoadModule(
    "/src/lib/deck-integrity.ts",
  );
  const { packProject, unpackProject } = await server.ssrLoadModule("/src/lib/project-format.ts");
  const { generateWritingNotes } = await server.ssrLoadModule("/src/lib/writing-notes.ts");
  await assert.rejects(
    () =>
      generateWritingNotes(
        {
          topic: "Synthetic notes fixture",
          sources: Array.from(
            { length: 6 },
            (_, i) =>
              `## Synthetic concept ${i + 1}\nSoftware fixture ${["amber", "birch", "cobalt", "delta", "elm", "fern"][i]} distinguishes study-note section ${i + 1}. This supplied material tests note generation without making a scientific claim.`,
          ).join("\n\n"),
          level: "Undergraduate",
          mode: "manual",
        },
        new AbortController().signal,
        () => {},
      ),
    /Sources cannot support a useful note/,
  );
  await assert.rejects(
    () =>
      generateWritingNotes(
        { topic: "", sources: "", level: "Undergraduate", mode: "manual" },
        new AbortController().signal,
        () => {},
      ),
    /Enter a notes topic/,
  );
  const input = {
    topic: "Enzyme immobilization",
    discipline: "Industrial & Biotechnology Microbiology",
    level: "Undergraduate",
    notes: "",
    mode: "manual",
    count: 12,
  };
  for (let n = 1; n <= 50; n++) assert.equal(requestedCount(n), n);
  for (const n of [0, -1, 51, 400, 1.1, NaN, Infinity])
    assert.throws(() => requestedCount(n), /integer slide count/);
  const single = generateLocalDeck({ ...input, count: 1 });
  assertCompleteDeck(single, 1);
  assert(single.slides[0].bullets.length > 0);
  const d = reconcileDeck(generateLocalDeck(input));
  assertCompleteDeck(d, 12);
  assert(
    !d.slides.some((s) =>
      /^(Learning objectives|Key conclusions|Suggested reading)$/.test(s.title),
    ),
  );
  const placeholders = structuredClone(d);
  placeholders.slides[2] = {
    ...placeholders.slides[2],
    layout: "title",
    bullets: [],
    leftBullets: [],
    rightBullets: [],
  };
  assert.throws(() => assertCompleteDeck(placeholders, 12), /empty|title layout/);
  assert(
    integrityAudit(placeholders).some(
      (f) => f.category === "Empty teaching slide" && f.severity === "critical",
    ),
  );
  const copy = structuredClone(d);
  copy.slides[2].bullets = [copy.slides[1].bullets[0]];
  assert(duplicateStatements(copy.slides).length);
  assert.equal(
    assertCompleteDeck(copy, 12).slides.length,
    12,
    "Similarity screening no longer blocks generation",
  );
  assert(integrityAudit(d).some((i) => i.category === "Evidence"));
  const c = d.slides[1].claims[0];
  c.status = "lecturer-reviewed";
  c.evidence = [
    {
      sourceUrl: "https://example.org/chapter",
      quote: c.text,
      locator: "Chapter 2",
      access: "textbook",
      checkedAt: Date.now(),
    },
  ];
  const unchanged = reconcileDeck(d);
  assert.equal(unchanged.slides[1].claims[0].status, "lecturer-reviewed");
  d.slides[1].bullets[0] += " Changed statement.";
  assert.equal(reconcileDeck(d).slides[1].claims[0].status, "unreviewed");
  const bytes = await packProject(d);
  const restored = await unpackProject(bytes);
  assert.equal(restored.slides.length, 12);
  assert.deepEqual(
    restored.slides[1].claims,
    d.slides[1].claims?.map((c, i) => (i === 0 ? reconcileDeck(d).slides[1].claims[0] : c)),
  );
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(bytes);
  zip.file("deck.json", "{}");
  const damaged = await zip.generateAsync({ type: "uint8array" });
  await assert.rejects(() => unpackProject(damaged), /mismatch/);
  console.log(
    "PASS 1–50 boundaries, substantive single slide, no automatic filler, similarity no longer blocks generation, claim invalidation, portable project roundtrip and corruption rejection",
  );
} finally {
  await server.close();
}
