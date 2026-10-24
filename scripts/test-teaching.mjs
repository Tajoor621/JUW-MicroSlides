import { readFile } from "node:fs/promises";
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
  const { improveDraft, completeSourcedTeaching } = await vite.ssrLoadModule(
    "/src/lib/draft-improvements.ts",
  );
  const { groupedReviewNotes } = await vite.ssrLoadModule("/src/lib/teaching-readiness.ts");
  const raw = structuredClone(slide);
  delete raw.teaching;
  const filled = completeSourcedTeaching(raw);
  if (filled.teaching?.takeaway)
    assert(
      raw.claims.some((c) => c.evidence.some((e) => e.quote.includes(filled.teaching.takeaway))),
    );
  assert.deepEqual(
    filled.claims,
    raw.claims,
    "Field completion cannot invent review approvals or alter original evidence",
  );
  const repeat = raw.bullets[0];
  const second = {
    ...structuredClone(raw),
    id: "duplicate-software-fixture",
    bullets: [repeat, "A distinct software fixture statement remains for editing."],
    leftBullets: [],
    rightBullets: [],
    claims: [],
  };
  const corrected = improveDraft({ ...deck, slides: [raw, second] });
  assert.equal(corrected.deck.slides.length, 2);
  assert.deepEqual(corrected.deck.slides[1].bullets, [
    "A distinct software fixture statement remains for editing.",
  ]);
  assert(
    corrected.deck.slides[1].notes.includes(repeat),
    "Removed duplicate wording is retained in notes",
  );
  assert.deepEqual(corrected.deck.slides[1].citations, second.citations);
  const differentStudy = {
    ...second,
    citations: second.citations.map((c) => ({
      ...c,
      id: "different-citation",
      doi: "10.0000/software-fixture-other-source",
      pmid: undefined,
      url: undefined,
    })),
  };
  assert.equal(
    improveDraft({ ...deck, slides: [raw, differentStudy] }).deck.slides[1].bullets.length,
    2,
    "Never deduplicate matching wording across different source identities",
  );
  assert.equal(corrected.deck.slides[1].claims[0].status, "unreviewed");
  const single = { ...second, bullets: [repeat] };
  assert.equal(
    improveDraft({ ...deck, slides: [raw, single] }).deck.slides[1].bullets.length,
    1,
    "Never empty a slide to hide repetition",
  );
  const unsupported = { ...raw, claims: [] };
  assert.equal(
    completeSourcedTeaching(unsupported),
    unsupported,
    "No unsupported scientific completion",
  );
  const grouped = groupedReviewNotes([
    { index: 0, message: "title: Record a decision and a specific rationale for this field." },
    { index: 0, message: "subtitle: Record a decision and a specific rationale for this field." },
    { index: 1, message: "notes: Record a decision and a specific rationale for this field." },
  ]);
  assert.equal(grouped.length, 1);
  assert.deepEqual(grouped[0].indices, [0, 1]);
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
  const { mergeResearchPaper } = await vite.ssrLoadModule("/src/lib/topic-evidence.ts");
  const refreshed = mergeResearchPaper(
    { title: "Synthetic prior record", fullBody: "Cached passage", isRetracted: "N" },
    { title: "Synthetic current record", isRetracted: "Y" },
  );
  assert.equal(
    refreshed.isRetracted,
    "Y",
    "Fresh retraction metadata cannot be hidden by cached sources",
  );
  assert.equal(refreshed.fullBody, "Cached passage");
  assert.equal(
    mergeResearchPaper(refreshed, { title: "Synthetic provider record", isRetracted: "N" })
      .isRetracted,
    "Y",
    "A different provider cannot silently clear an adverse notice",
  );
  const { criticalFindings } = await vite.ssrLoadModule("/src/lib/critical-review.ts");
  const { deckSchema, parseBackup } = await vite.ssrLoadModule("/src/lib/backup.ts");
  const { slideReviewStatus } = await vite.ssrLoadModule("/src/lib/slide-review-status.ts");
  const draftFixture = parseBackup(
    await readFile(new URL("./fixtures/export-draft.json", import.meta.url), "utf8"),
  )[0];
  assert.equal(slideReviewStatus(draftFixture, draftFixture.slides[1]), "draft");
  assert(
    !criticalFindings(draftFixture).some((f) =>
      /Missing claim-level support|Record a decision/.test(f.problem),
    ),
    "Pending attestations are not critical scientific findings",
  );
  assert.equal(slideReviewStatus(deck, slide), "reviewed");
  const changedSlide = { ...slide, title: "Changed title after review" };
  assert.equal(slideReviewStatus(deck, changedSlide), "draft");

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
      "numeric substring mismatch",
      (s) => {
        s.teaching.quantitative[0].value = "8";
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
  console.log(
    "PASS teaching gates, primary citation identity, draft source preservation, level depth, density, review invalidation, audience privacy, and archived explicit review API compatibility",
  );
} finally {
  await vite.close();
}
