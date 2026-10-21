import assert from "node:assert/strict";
import { createServer } from "vite";
import JSZip from "jszip";
import { fileURLToPath } from "node:url";
const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true },
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  logLevel: "error",
});
try {
  const { generateLocalDeck } = await server.ssrLoadModule("/src/lib/generate-deck.ts");
  const { reconcileDeck, classroomReady, integrityAudit } = await server.ssrLoadModule(
    "/src/lib/deck-integrity.ts",
  );
  const { surfaceItems, surfaceSnapshot, attestClaim } = await server.ssrLoadModule(
    "/src/lib/surface-review.ts",
  );
  const { deckEvidenceSummary } = await server.ssrLoadModule("/src/lib/deck-evidence-summary.ts");
  const { packProject, readProjectAsset } = await server.ssrLoadModule(
    "/src/lib/project-format.ts",
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
  slide.citations = [];
  slide.media = [];
  const quote = "A source sentence retained for a synthetic software regression fixture.";
  deck.sourceDocuments = [
    {
      id: "source",
      title: "Fixture",
      url: "https://openstax.org/books/microbiology/pages/1-introduction",
      publisher: "Fixture",
      access: "textbook",
      text: quote + " Original qualification A.",
      locator: "Chapter 1",
      license: "CC0",
      retrievedAt: Date.now(),
      publishedDate: "2026",
      jurisdiction: "",
      acquisition: "lecturer-import",
    },
  ];
  slide.claims = slide.claims.map((c) =>
    attestClaim(deck, {
      ...c,
      status: "lecturer-reviewed",
      evidence: [
        {
          sourceUrl: deck.sourceDocuments[0].url,
          quote,
          locator: "Chapter 1",
          access: "textbook",
          checkedAt: Date.now(),
        },
      ],
    }),
  );
  const reviewFields = () => {
    slide.surfaceReviews = surfaceItems(slide).map((i) => ({
      field: i.field,
      snapshot: surfaceSnapshot(deck, slide, i.field),
      verdict: "supported",
      rationale: "Controlled software fixture; not scientific validation.",
      reviewedAt: Date.now(),
      sourceUrl: deck.sourceDocuments[0].url,
      quote,
      locator: "Chapter 1",
    }));
  };
  reviewFields();
  assert(classroomReady(deck));
  assert(classroomReady(deckSchema.parse(deck)), "Schema preserves source-bound claim reviews");
  deck.sourceDocuments[0].text = quote + " Context B contradicts the previous qualification.";
  assert(!classroomReady(deck), "Changed source context invalidates existing reviews");
  reviewFields();
  assert(
    integrityAudit(deck).some((f) => f.category === "Source review changed"),
    "Rereviewing headings cannot clear stale claim provenance",
  );
  slide.claims = slide.claims.map((c) => attestClaim(deck, c));
  assert(classroomReady(deck));
  const ref = {
    id: "ref",
    authors: "Fixture",
    title: "Study A",
    journal: "Fixture",
    year: "2026",
    doi: "10.1234/test",
    publicationCheck: {
      identifier: "10.1234/test",
      checkedAt: Date.now(),
      status: "no-notice-found",
      complete: true,
      metadataMatch: true,
      metadataTitle: "Study A",
      providers: [],
      notices: [],
    },
  };
  slide.citations = [ref];
  reviewFields();
  assert.equal(deckEvidenceSummary(deck).totals.currentArticleChecks, 1);
  ref.publicationCheck.metadataMatch = undefined;
  assert.equal(deckEvidenceSummary(deck).totals.currentArticleChecks, 0);
  assert(!classroomReady(deck));
  ref.publicationCheck.metadataMatch = true;
  ref.title = "Study B";
  assert.equal(deckEvidenceSummary(deck).totals.currentArticleChecks, 0);
  const media = {
    id: "m",
    kind: "diagram",
    title: "Fixture",
    src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
    credit: "Fixture",
    source: "https://example.org/figure",
    license: "CC0",
    keywords: [],
  };
  slide.media = [media];
  deck.mediaPool = [media, { ...media, id: "duplicate" }];
  const zip = await JSZip.loadAsync(await packProject(deck));
  const packed = JSON.parse(await zip.file("deck.json").async("string"));
  assert.match(packed.slides[0].media[0].src, /^asset:/);
  assert.equal(packed.mediaPool[0].src, packed.slides[0].media[0].src);
  assert.equal(packed.mediaPool[1].src, packed.slides[0].media[0].src);
  assert.equal(zip.file(/^assets\//).length, 1);
  assert(media.src.startsWith("data:"), "Packing never rewrites the editor input");
  let cancelled = false;
  const oversized = new Response(
    new ReadableStream({
      pull(c) {
        c.enqueue(new Uint8Array(8));
      },
      cancel() {
        cancelled = true;
      },
    }),
  );
  await assert.rejects(readProjectAsset(oversized, 10), /size limit/);
  assert(cancelled, "Over-budget stream is cancelled without reading all bytes");
  const known = new Response(new Uint8Array(20), { headers: { "content-length": "20" } });
  await assert.rejects(readProjectAsset(known, 10), /size limit/);
  assert.deepEqual(
    await readProjectAsset(new Response(new Uint8Array([1, 2, 3])), 3),
    new Uint8Array([1, 2, 3]),
  );
  const { requirePaidAiAccess } = await server.ssrLoadModule("/src/lib/paid-ai-access.server.ts");
  const previous = process.env.JUW_ENABLE_PAID_CLOUD_AI;
  delete process.env.JUW_ENABLE_PAID_CLOUD_AI;
  try {
    assert.equal(
      await requirePaidAiAccess(),
      false,
      "A present owner key cannot implicitly enable paid requests",
    );
  } finally {
    if (previous === undefined) delete process.env.JUW_ENABLE_PAID_CLOUD_AI;
    else process.env.JUW_ENABLE_PAID_CLOUD_AI = previous;
  }
  console.log(
    "PASS audit regressions: source context, claim provenance, publication summaries, shared-media packing, bounded streams and paid-AI opt-in",
  );
} finally {
  await server.close();
}
