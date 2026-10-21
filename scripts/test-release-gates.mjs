import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  logLevel: "error",
});
try {
  const { generateLocalDeck } = await server.ssrLoadModule("/src/lib/generate-deck.ts");
  const { reconcileDeck, integrityAudit, classroomReady } = await server.ssrLoadModule(
    "/src/lib/deck-integrity.ts",
  );
  const { surfaceItems, surfaceSnapshot, surfaceReviewProblem } = await server.ssrLoadModule(
    "/src/lib/surface-review.ts",
  );
  const { deckSchema } = await server.ssrLoadModule("/src/lib/backup.ts");
  const deck = reconcileDeck(
    generateLocalDeck({
      topic: "Enzyme immobilization",
      discipline: "Industrial microbiology",
      level: "Undergraduate",
      mode: "manual",
      notes: "",
      count: 1,
    }),
  );
  const slide = deck.slides[0];
  slide.media = [];
  slide.citations = [];
  const passage = "A permitted source passage with scientific context and sufficient detail.";
  for (const c of slide.claims) {
    c.status = "lecturer-reviewed";
    c.evidence = [
      {
        sourceUrl: "https://example.org/textbook",
        locator: "Chapter 1",
        quote: passage,
        access: "textbook",
        checkedAt: Date.now(),
      },
    ];
  }
  const reviewFields = () => {
    slide.surfaceReviews = surfaceItems(slide).map((i) => ({
      field: i.field,
      snapshot: surfaceSnapshot(deck, slide, i.field),
      verdict: "supported",
      rationale: "Checked exact wording, qualifiers and source context.",
      reviewedAt: Date.now(),
      sourceUrl: "https://example.org/textbook",
      quote: passage,
      locator: "Chapter 1",
    }));
  };
  assert(!classroomReady(deck), "Reviewed bullets cannot bypass heading/notes review");
  reviewFields();
  assert(classroomReady(deck));
  assert.deepEqual(
    deckSchema.parse(deck).slides[0].surfaceReviews,
    slide.surfaceReviews,
    "Backups retain decisions",
  );
  slide.notes += " New claim not reviewed.";
  assert(!classroomReady(deck));
  reviewFields();
  const { packProject, unpackProject } = await server.ssrLoadModule("/src/lib/project-format.ts");
  const reopened = await unpackProject(await packProject(deck));
  assert(classroomReady(reopened), "Portable reopening retains valid current field reviews");
  const { generateAiDeck } = await server.ssrLoadModule("/src/lib/browser-services.ts");
  const cancelled = new AbortController();
  cancelled.abort();
  await assert.rejects(
    generateAiDeck({
      data: {
        topic: "Abort fixture",
        discipline: "General microbiology",
        level: "Undergraduate",
        mode: "ai",
        notes: "",
        count: 1,
      },
      signal: cancelled.signal,
    }),
    (e) => e.name === "AbortError",
  );
  const nonfactual = {
    ...slide.surfaceReviews[0],
    verdict: "not-factual",
    sourceUrl: undefined,
    quote: undefined,
    locator: undefined,
  };
  assert.equal(surfaceReviewProblem(deck, slide, nonfactual.field, nonfactual), null);
  assert(surfaceReviewProblem(deck, slide, nonfactual.field, { ...nonfactual, rationale: "ok" }));
  slide.citations.push({
    id: "ref",
    authors: "A",
    title: "Original study",
    journal: "Journal",
    year: "2026",
    doi: "10.1234/test",
  });
  reviewFields();
  const incomplete = () =>
    integrityAudit(deck).some(
      (f) => f.category === "Publication status incomplete" && f.severity === "critical",
    );
  assert(incomplete());
  slide.citations[0].publicationCheck = {
    identifier: "10.1234/test",
    checkedAt: Date.now(),
    status: "no-notice-found",
    providers: ["Europe PMC", "Crossref incoming updates"],
    notices: [],
    complete: true,
    metadataMatch: true,
    metadataTitle: "Original study",
  };
  assert(!incomplete());
  assert(classroomReady(deck));
  assert(
    classroomReady(await unpackProject(await packProject(deck))),
    "Schema property ordering cannot invalidate unchanged bibliographic review context",
  );
  const retitled = structuredClone(deck);
  retitled.slides[0].citations[0].title = "Different article";
  assert(!classroomReady(retitled), "A changed citation title needs a new metadata check");
  for (const changes of [
    { complete: false },
    { status: "unknown" },
    { checkedAt: Date.now() - 8 * 86400000 },
    { checkedAt: Date.now() + 86400000 },
    { metadataMatch: undefined },
  ]) {
    const copy = structuredClone(deck);
    Object.assign(copy.slides[0].citations[0].publicationCheck, changes);
    assert(!classroomReady(copy), JSON.stringify(changes));
  }
  slide.media = [
    {
      id: "m",
      kind: "diagram",
      title: "Scientific figure",
      src: "data:image/png;base64,aW1hZ2U=",
      originalSrc: "https://example.org/figure.png",
      credit: "Unknown",
      source: "https://example.org/figure",
      license: "Unknown",
      keywords: [],
    },
  ];
  reviewFields();
  assert(!classroomReady(deck), "Unknown figure rights must block reviewed export");
  slide.media[0].credit = "Original Author";
  slide.media[0].license = "CC BY 4.0";
  reviewFields();
  assert(classroomReady(deck));
  const changedPixels = structuredClone(deck);
  changedPixels.slides[0].media[0].src = "data:image/png;base64,ZGlmZmVyZW50";
  assert(
    !classroomReady(changedPixels),
    "Keeping the same original URL cannot hide changed image data",
  );
  slide.media[0].title = "Changed biological caption";
  assert(!classroomReady(deck));
  console.log(
    "PASS reviewed-export gates: stale/partial/unknown citations, full-surface decisions, mutation invalidation, backup preservation and media provenance",
  );
  const { generateLocalAiDeck } = await server.ssrLoadModule("/src/lib/local-ai.ts");
  const previousFetch = globalThis.fetch,
    previousStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => JSON.stringify({ url: "http://localhost:11434", model: "test" }),
  };
  let requested;
  const entered = new Promise((resolve) => {
    requested = resolve;
  });
  globalThis.fetch = (_url, options) =>
    new Promise((_resolve, reject) => {
      requested();
      options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
    });
  try {
    const controller = new AbortController();
    const running = generateLocalAiDeck(
      {
        topic: "Cancellation fixture",
        discipline: "General microbiology",
        level: "Undergraduate",
        mode: "ai",
        notes: "",
        count: 2,
      },
      controller.signal,
    );
    await entered;
    controller.abort();
    await assert.rejects(running, (e) => e.name === "AbortError");
    console.log("PASS cancellation aborts an in-flight local model request");
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.localStorage = previousStorage;
  }
} finally {
  await server.close();
}
