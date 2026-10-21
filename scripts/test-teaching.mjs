import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { teachingFixture } from "./teaching-fixture.mjs";
const vite = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true },
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  logLevel: "error",
});
try {
  const { deck, slide, review } = await teachingFixture(vite);
  const {
    teachingFindings,
    citationMatchesUrl,
    quantitativeCandidate,
    mergeCitationCandidates,
    teachingResearchContext,
  } = await vite.ssrLoadModule("/src/lib/teaching.ts");
  const { teachingReleaseFindings, teachingReady } = await vite.ssrLoadModule(
    "/src/lib/teaching-readiness.ts",
  );
  const { deckSchema } = await vite.ssrLoadModule("/src/lib/backup.ts");
  assert.equal(quantitativeCandidate(deck).value, "80");
  assert.equal(quantitativeCandidate(deck).conditions, "");
  assert.deepEqual(teachingReleaseFindings(deck), [], "Synthetic fixture clears the software gate");
  assert.deepEqual(
    deckSchema.parse(deck).slides[0].teaching,
    slide.teaching,
    "Backup round-trip retains structured teaching data",
  );
  assert(teachingReady(deckSchema.parse(deck)), "Backups preserve the named verification snapshot");
  const copied = structuredClone(deck);
  copied.id = "copy";
  assert(teachingReady(copied), "Copy identity does not change scientific content");
  const prior = deck.slides[0].citations[0],
    candidate = {
      ...prior,
      id: "new-provider-id",
      evidenceKind: undefined,
      publicationCheck: undefined,
    };
  const merged = mergeCitationCandidates([prior], [candidate]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0], prior, "Discovery preserves reviewed metadata");
  assert.equal(
    mergeCitationCandidates(
      [{ ...prior, pmid: undefined, doi: "https://doi.org/10.1/TEST" }],
      [{ ...candidate, doi: "10.1/test" }],
    ).length,
    1,
    "DOI aliases do not erase existing records",
  );
  const context = teachingResearchContext(deck, slide),
    changedContext = structuredClone(deck);
  changedContext.slides[0].title = "Different research context";
  assert.notEqual(context, teachingResearchContext(changedContext, changedContext.slides[0]));
  const extraRef = structuredClone(deck);
  extraRef.slides[0].citations.push({
    id: "unverified-extra",
    title: "Unverified extra record",
    authors: "Unknown",
    year: "2026",
    journal: "Unknown",
  });
  assert(teachingFindings(extraRef).some((f) => /every attached reference/.test(f.message)));
  const unsigned = structuredClone(deck);
  delete unsigned.teachingVerification;
  assert(!teachingReady(unsigned));
  assert.equal(citationMatchesUrl({ pmid: "123" }, "https://pubmed.ncbi.nlm.nih.gov/1234/"), false);
  assert.equal(
    citationMatchesUrl({ doi: "10.1/test" }, "https://untrusted.example/10.1/test"),
    false,
  );
  assert.equal(citationMatchesUrl({ doi: "10.1/test" }, "https://doi.org/10.1/test"), true);
  for (const [name, mutate] of [
    [
      "visual",
      (s) => {
        s.teaching.diagram = undefined;
      },
    ],
    [
      "primary reference",
      (s) => {
        s.citations[0].evidenceKind = "review";
      },
    ],
    [
      "publication status",
      (s) => {
        s.citations[0].publicationCheck.complete = false;
      },
    ],
    [
      "source quotation",
      (s) => {
        s.teaching.quantitative[0].quote = "A fabricated quotation missing from the saved source.";
      },
    ],
    [
      "alt text",
      (s) => {
        s.teaching.altText = "";
      },
    ],
    [
      "definition",
      (s) => {
        s.teaching.definition = "";
      },
    ],
    [
      "takeaway",
      (s) => {
        s.teaching.takeaway = "";
      },
    ],
    [
      "universal claim",
      (s) => {
        s.teaching.advantage = "Immobilization always increases stability";
      },
    ],
    [
      "density",
      (s) => {
        s.bullets = Array(6).fill("Too many points");
      },
    ],
    [
      "scale calibration",
      (s) => {
        s.teaching.scaleBar = {
          pixels: 100,
          physicalLength: 10,
          unit: "µm",
          calibrationSource: "",
        };
      },
    ],
  ]) {
    const copy = structuredClone(deck);
    mutate(copy.slides[0]);
    assert(teachingFindings(copy).length, `${name} must block`);
  }
  slide.teaching.definition += " Edited.";
  assert(!teachingReady(deck), "Teaching edits invalidate field decisions");
  review();
  assert(teachingReady(deck));
  const ungrounded = structuredClone(deck);
  ungrounded.slides[0].surfaceReviews.find((r) => r.field === "teaching.definition").verdict =
    "not-factual";
  assert(!teachingReady(ungrounded));
  const legacy = structuredClone(deck);
  legacy.slides = Array(51).fill(legacy.slides[0]);
  assert(teachingReleaseFindings(legacy).some((f) => /1–50/.test(f.message)));
  const phd = structuredClone(deck);
  phd.level = "PhD / research seminar";
  assert(teachingFindings(phd).some((f) => /equation/.test(f.message)));
  const old = structuredClone(deck);
  delete old.slides[0].teaching;
  assert.doesNotThrow(() => deckSchema.parse(old), "Legacy projects remain readable");
  assert(!teachingReady(old));
  const { audienceFrame } = await vite.ssrLoadModule("/src/lib/audience-frame.ts");
  const frame = audienceFrame(deck, 0, deck.citationStyle);
  assert.equal(frame.slide.notes, "");
  assert.equal(frame.slide.teaching.quantitative[0].quote, "");
  assert.equal(frame.slide.teaching.diagram, "adsorption");
  const blocked = structuredClone(deck);
  blocked.slides[0].teaching.altText = "";
  const { exportPptx } = await vite.ssrLoadModule("/src/lib/export-pptx.ts");
  await assert.rejects(() => exportPptx(blocked), /Teaching export blocked/);
  const { teachingPdfBytes, exportTeachingPack } = await vite.ssrLoadModule(
    "/src/lib/export-teaching.ts",
  );
  await assert.rejects(() => teachingPdfBytes(blocked), /Teaching export blocked/);
  await assert.rejects(() => exportTeachingPack(blocked), /Teaching export blocked/);
  console.log(
    "PASS teaching gates, primary citation identity, draft source preservation, level depth, density, review invalidation, audience privacy, and all export-entry blockers",
  );
} finally {
  await vite.close();
}
