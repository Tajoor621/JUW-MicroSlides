import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  optimizeDeps: { noDiscovery: true, entries: [] },
  logLevel: "error",
});
try {
  const { generateLocalDeck, sampleDeck } = await server.ssrLoadModule("/src/lib/generate-deck.ts");
  const { replacementSnapshot, inspectedReplacement } = await server.ssrLoadModule(
    "/src/lib/slide-replacement.ts",
  );
  const { deckEvidenceSummary } = await server.ssrLoadModule("/src/lib/deck-evidence-summary.ts");
  const { useDeckStore } = await server.ssrLoadModule("/src/lib/deck-store.ts");
  const seed = sampleDeck();
  assert.deepEqual(sampleDeck(), seed, "Fresh sample claim IDs must be deterministic");
  const savedSeed = structuredClone(seed);
  savedSeed.slides[1].notes += " Preserved legacy annotation";
  const merge = useDeckStore.persist.getOptions().merge;
  const recovered = merge(
    { library: [savedSeed], activeId: savedSeed.id },
    useDeckStore.getState(),
  );
  assert.deepEqual(
    recovered.library,
    [savedSeed],
    "Hydration must never regenerate saved sample content or identifiers",
  );
  assert.equal(recovered.activeId, savedSeed.id);
  const twice = merge({ library: recovered.library, activeId: recovered.activeId }, recovered);
  assert.deepEqual(twice.library, [savedSeed], "Repeated hydration preserves review pack identity");
  console.log("PASS fresh sample IDs and saved sample/review identity survive repeated hydration");
  const deck = generateLocalDeck({
    topic: "Bacterial genome architecture",
    discipline: "Bacteriology",
    level: "Undergraduate",
    count: 5,
    notes: "",
    mode: "manual",
  });
  const s = deck.slides[1];
  const figure = {
    id: "fig",
    title: "Software fixture figure",
    src: "data:image/png;base64,iVBORw0KGgo=",
    credit: "Software fixture",
    source: "https://example.org/figure",
    license: "CC0",
    kind: "diagram",
    keywords: [],
  };
  s.media = [figure];
  s.citations = [
    {
      id: "r",
      title: "Software fixture paper",
      authors: "Fixture",
      journal: "Fixture",
      year: "2026",
      doi: "10.1/fixture",
    },
  ];
  const before = JSON.stringify(deck),
    snapshot = replacementSnapshot(deck, s);
  const p = {
    title: "A distinct replacement concept",
    bullets: [
      "Distinct synthetic teaching material for transaction testing, not scientific content.",
    ],
    notes: "Review supporting evidence before teaching.",
  };
  const result = inspectedReplacement(deck, s.id, p, snapshot, false);
  assert.equal(JSON.stringify(deck), before);
  assert.equal(result.slides.length, deck.slides.length);
  assert.equal(result.slides[1].media.length, 0);
  assert.equal(result.mediaPool[0].id, figure.id);
  assert.equal(result.slides[1].citations.length, 0);
  assert(
    result.slides[1].claims.every((c) => c.status === "unreviewed" && c.evidence.length === 0),
  );
  assert.equal(inspectedReplacement(deck, s.id, p, snapshot, true).slides[1].media.length, 1);
  assert.throws(() => inspectedReplacement(deck, s.id, { ...p, title: " " }, snapshot, false));
  const changed = structuredClone(deck);
  changed.slides[1].notes += " New edit";
  assert.throws(
    () => inspectedReplacement(changed, s.id, p, snapshot, false),
    /changed after drafting/,
  );
  const locked = structuredClone(deck);
  locked.slides[1].locked = true;
  assert.throws(
    () =>
      inspectedReplacement(locked, s.id, p, replacementSnapshot(locked, locked.slides[1]), false),
    /unlocked/,
  );
  assert.throws(
    () =>
      inspectedReplacement(deck, s.id, { ...p, bullets: deck.slides[2].bullets }, snapshot, false),
    /overlaps/,
  );
  useDeckStore.setState({ library: [deck], activeId: deck.id, selectedIndex: 1 });
  useDeckStore.getState().applyInspectedReplacement(s.id, p, snapshot, false);
  assert.equal(useDeckStore.getState().selectedIndex, 1);
  assert.equal(useDeckStore.getState().deck().mediaPool[0].id, figure.id);
  assert.equal(useDeckStore.getState().deck().slides[1].title, p.title);
  console.log(
    "PASS replacements reject stale/locked/duplicate content and atomically preserve removed media and slide count",
  );
  const coverage = structuredClone(deck);
  for (const slide of coverage.slides) for (const claim of slide.claims || []) claim.evidence = [];
  const c = coverage.slides[1].claims[0];
  c.status = "lecturer-reviewed";
  c.evidence = [
    {
      sourceUrl: "https://example.org/paper",
      quote: c.text,
      locator: "Abstract",
      access: "abstract",
      checkedAt: Date.now(),
    },
    {
      sourceUrl: "https://example.org/paper",
      quote: "",
      locator: "",
      access: "full-text",
      checkedAt: Date.now(),
    },
  ];
  const stamp = {
    identifier: "10.1/fixture",
    checkedAt: Date.now(),
    status: "no-notice-found",
    complete: true,
    providers: ["fixture"],
    notices: [],
  };
  coverage.slides[1].citations[0].publicationCheck = stamp;
  coverage.slides[2].citations = [
    { ...coverage.slides[1].citations[0], publicationCheck: { ...stamp, status: "retracted" } },
  ];
  const summary = deckEvidenceSummary(coverage);
  assert.equal(summary.rows[1].lecturerReviewed, 1);
  assert.equal(summary.rows[1].abstractOnly, 1);
  assert.equal(summary.rows[1].fullAccess, 0);
  assert.equal(summary.totals.adverseNotices, 1);
  assert.equal(summary.totals.currentArticleChecks, 0);
  assert.deepEqual(summary.references[0].slides, [2, 3]);
  coverage.slides[1].title += " Changed context";
  assert.equal(deckEvidenceSummary(coverage).rows[1].lecturerReviewed, 0);
  console.log(
    "PASS evidence overview preserves stale-review, malformed-passage and conflicting-publication distinctions",
  );
} finally {
  await server.close();
}
