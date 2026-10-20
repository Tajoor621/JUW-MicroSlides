import assert from "node:assert/strict";
import { inflateRawSync } from "node:zlib";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";
const root = process.cwd();
const output = process.env.JUW_QA_OUTPUT || "/workspace/screenshots";
await mkdir(output, { recursive: true });
let legacyWorkerFixture = false;
const types = {
  ".json": "application/json",
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};
const server = createServer(async (req, res) => {
  try {
    const p =
      decodeURIComponent(new URL(req.url, "http://localhost").pathname).replace(
        /^\/JUW-MicroSlides\//,
        "",
      ) || "index.html";
    if (p === "sw.js" && legacyWorkerFixture) {
      const source = `const BASE=new URL("./",self.location.href).href;const CACHE="juw-pages-qa-legacy";
self.addEventListener("install",e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);const r=await fetch(new URL("index.html",BASE));const html=(await r.text()).replace('id="root"','id="root" data-legacy-shell="true"');await c.put(new URL("index.html",BASE),new Response(html,{headers:{"content-type":"text/html"}}));await self.skipWaiting();})()));
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",e=>{if(e.request.mode==="navigate"&&e.request.url.startsWith(BASE))e.respondWith(caches.open(CACHE).then(c=>c.match(new URL("index.html",BASE))));});`;
      res.setHeader("Content-Type", "text/javascript");
      res.end(source);
      return;
    }
    const path = resolve(root, "dist-pages", p);
    if (!path.startsWith(resolve(root, "dist-pages") + "/")) throw Error();
    const data = await readFile(path);
    res.setHeader("Content-Type", types[extname(p)] || "application/octet-stream");
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end("not found");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const address = server.address();
const url = `http://127.0.0.1:${address.port}/JUW-MicroSlides/`;
const executablePath = process.env.JUW_CHROMIUM;
const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--no-zygote",
  ],
});
const errors = [],
  results = [];
function slideCountInPptx(buffer) {
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end--;
  assert(end >= 0, "PowerPoint must be a valid ZIP package");
  let offset = buffer.readUInt32LE(end + 16),
    count = 0;
  const entries = buffer.readUInt16LE(end + 10);
  for (let i = 0; i < entries; i++) {
    assert.equal(buffer.readUInt32LE(offset), 0x02014b50);
    const nameLength = buffer.readUInt16LE(offset + 28),
      extra = buffer.readUInt16LE(offset + 30),
      comment = buffer.readUInt16LE(offset + 32);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString();
    if (/^ppt\/slides\/slide\d+\.xml$/.test(name)) count++;
    offset += 46 + nameLength + extra + comment;
  }
  return count;
}
async function saved(page) {
  await page.waitForFunction(() => document.body.textContent.includes("Saved on this device"));
  await page.waitForTimeout(150);
}
function pptxXmlFiles(buffer) {
  const files = {};
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end--;
  let offset = buffer.readUInt32LE(end + 16);
  for (let i = 0; i < buffer.readUInt16LE(end + 10); i++) {
    const method = buffer.readUInt16LE(offset + 10),
      size = buffer.readUInt32LE(offset + 20);
    const n = buffer.readUInt16LE(offset + 28),
      extra = buffer.readUInt16LE(offset + 30),
      comment = buffer.readUInt16LE(offset + 32);
    const name = buffer.subarray(offset + 46, offset + 46 + n).toString();
    const local = buffer.readUInt32LE(offset + 42);
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    if (name.endsWith(".xml") || name.endsWith(".rels") || name.endsWith(".png") || name.endsWith(".svg")) {
      const data = buffer.subarray(start, start + size);
      const uncompressed = method === 8 ? inflateRawSync(data) : data;
      files[name] = uncompressed.toString(name.endsWith(".png") ? "base64" : "utf8");
    }
    offset += 46 + n + extra + comment;
  }
  return files;
}

try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await saved(page);
  await page.locator("#gen-topic").fill("Bacterial genome architecture");
  await page.locator("#gen-count").fill("12");
  await page.getByRole("button", { name: "Generate deck", exact: true }).click();
  await saved(page);
  await page.waitForFunction(() => !document.querySelector("#gen-topic"));
  assert.match(await page.locator("body").innerText(), /Bacterial genome architecture/);
  assert((await page.locator(".topic-artwork svg").count()) >= 1);
  results.push("Intro and research slides render topic-specific vector artwork");
  results.push("Generate a 12-slide knowledge deck");
  await page.screenshot({ path: join(output, "juw-desktop.png") });
  await page.getByRole("button", { name: "Library", exact: true }).click();
  let downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download editable backup" }).click();
  const backupDownload = await downloadEvent;
  const backup = JSON.parse(await readFile(await backupDownload.path(), "utf8"));
  assert.equal(backup.schemaVersion, 1);
  assert.equal(backup.decks[0].slides.length, 12);
  results.push("Editable backup includes slides and references");
  // Exercise each palette and layout on both viewports, then compare actual
  // exported native text coordinates to the scaled editor, not a second template.
  // Source-library flow, offline persistence and portable scientific provenance.
  const sourceContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    acceptDownloads: true,
  });
  await sourceContext.addInitScript(
    ({ deck }) =>
      localStorage.setItem(
        "juw-microslides-v661-intro-logo",
        JSON.stringify({
          state: { library: [deck], activeId: deck.id, selectedIndex: 1 },
          version: 0,
        }),
      ),
    {
      deck: {
        ...backup.decks[0],
        mediaPool: [],
        slides: backup.decks[0].slides.map((s) => ({ ...s, media: [] })),
      },
    },
  );
  const sourcePage = await sourceContext.newPage();
  sourcePage.on("pageerror", (e) => errors.push(e.message));
  const publisherUrl = "https://www.cdc.gov/juw-qualification-fixture";
  await sourcePage.route(publisherUrl, (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "<html><body><nav>Navigation excluded</nav><main><h1>Source fixture</h1><p>This is an attributed test passage for source preservation. It is a software fixture and makes no scientific assertion.</p><script>window.injectedSource=true</script></main></body></html>",
    }),
  );
  await sourcePage.goto(url);
  await saved(sourcePage);
  await sourcePage.getByRole("button", { name: "Review", exact: true }).click();
  await sourcePage.getByText("Authoritative source library", { exact: true }).click();
  await sourcePage.getByLabel("Source document URL", { exact: true }).fill(publisherUrl);
  await sourcePage.getByRole("button", { name: "Read open HTML page", exact: true }).click();
  await sourcePage.waitForFunction(() =>
    document
      .querySelector('[aria-label="Source document passage"]')
      .value.includes("attributed test passage"),
  );
  assert(!(await sourcePage.evaluate(() => window.injectedSource)));
  assert(
    !(
      await sourcePage.getByLabel("Source document passage", { exact: true }).inputValue()
    ).includes("Navigation excluded"),
  );
  await sourcePage
    .getByLabel("Source document title", { exact: true })
    .fill("Publisher source preservation fixture");
  await sourcePage.getByLabel("Source locator", { exact: true }).fill("Main paragraph 1");
  await sourcePage.getByLabel("Source reuse terms", { exact: true }).fill("Software fixture, CC0");
  await sourcePage.getByRole("button", { name: "Save attributed source", exact: true }).click();
  await saved(sourcePage);
  await sourcePage
    .getByRole("link", { name: "Publisher source preservation fixture", exact: true })
    .waitFor();
  await sourcePage.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await sourcePage.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await sourceContext.setOffline(true);
  await sourcePage.reload();
  await saved(sourcePage);
  await sourcePage.getByRole("button", { name: "Review", exact: true }).click();
  await sourcePage.getByText("Authoritative source library", { exact: true }).click();
  await sourcePage
    .getByRole("link", { name: "Publisher source preservation fixture", exact: true })
    .waitFor();
  await sourcePage.getByText(/Lecture workspace · Web companion/).click();
  const sourceDownloadEvent = sourcePage.waitForEvent("download");
  await sourcePage.getByRole("button", { name: "Save portable project", exact: true }).click();
  const sourceDownload = await sourceDownloadEvent;
  const { default: SourceZip } = await import("jszip");
  const sourceZip = await SourceZip.loadAsync(await readFile(await sourceDownload.path()));
  const sourceProject = JSON.parse(await sourceZip.file("deck.json").async("string"));
  assert.equal(sourceProject.sourceDocuments[0].url, publisherUrl);
  assert.equal(sourceProject.sourceDocuments[0].acquisition, "publisher-html");
  assert.match(sourceProject.sourceDocuments[0].text, /attributed test passage/);
  assert.equal(sourceProject.sourceDocuments[0].license, "Software fixture, CC0");
  await sourcePage.getByRole("button", { name: "Screen semantic overlap", exact: true }).click();
  await sourcePage.getByText(/Choose an installed embedding model in Settings/).waitFor();
  const reviewPackEvent = sourcePage.waitForEvent("download");
  await sourcePage
    .getByRole("button", { name: "Download independent review pack", exact: true })
    .click();
  const reviewPackDownload = await reviewPackEvent;
  const reviewZip = await SourceZip.loadAsync(await readFile(await reviewPackDownload.path()));
  const reviewPack = JSON.parse(await reviewZip.file("pack.json").async("string"));
  const { digest, assessReviews } = await import("./scientific-evaluation.mjs");
  const { packHash, ...reviewContent } = reviewPack;
  assert.equal(packHash, digest(reviewContent));
  assert(reviewPack.items.some((i) => i.field === "title"));
  assert.equal(reviewPack.sourceSnapshotHashes[0].sha256, digest(sourceProject.sourceDocuments[0]));
  const externalForms = await Promise.all(
    ["reviewer-A", "reviewer-B"].map(async (id) =>
      JSON.parse(await reviewZip.file(`${id}.json`).async("string")),
    ),
  );
  assert.equal(assessReviews(reviewPack, externalForms).status, "incomplete");
  assert(
    externalForms.every(
      (f) => f.reviewer.independent === false && f.decisions.every((d) => d.verdict === "pending"),
    ),
  );
  results.push(
    "Offline independent review ZIP preserves content hashes and separate blank reviewer forms without certifying science",
  );
  await sourcePage.getByRole("button", { name: "Open evidence overview", exact: true }).click();
  const overview = sourcePage.getByRole("dialog", { name: "Lecture evidence overview" });
  await overview.getByLabel("Evidence filter", { exact: true }).selectOption("missing");
  assert((await overview.getByLabel("Slide evidence coverage").getByRole("button").count()) > 0);
  const overviewFileEvent = sourcePage.waitForEvent("download");
  await overview.getByRole("button", { name: "Download evidence overview", exact: true }).click();
  const overviewReport = JSON.parse(await readFile(await (await overviewFileEvent).path(), "utf8"));
  assert.equal(overviewReport.totals.slides, sourceProject.slides.length);
  assert(overviewReport.totals.withoutPassages > 0);
  assert.equal(overviewReport.totals.lecturerReviewed, 0);
  await overview.screenshot({ path: join(output, "juw-evidence-overview.png") });
  await overview.getByLabel("Slide evidence coverage").getByRole("button").first().click();
  await sourcePage.getByRole("button", { name: "Review", exact: true }).click();
  results.push(
    "Live evidence overview filters missing passages, exports honest coverage and opens the corresponding slide evidence",
  );
  await sourcePage
    .getByRole("button", { name: "Complete an external review", exact: true })
    .click();
  let reviewer = sourcePage.getByRole("dialog", { name: "Scientific reviewer workspace" });
  await reviewer.getByLabel("Open scientific review pack", { exact: true }).setInputFiles({
    name: "pack.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(reviewPack)),
  });
  await reviewer.getByLabel("Review item", { exact: true }).waitFor();
  await sourcePage.keyboard.press("Alt+ArrowRight");
  assert.equal(
    await reviewer.getByLabel("Review item", { exact: true }).inputValue(),
    reviewPack.items[1].id,
  );
  await sourcePage.keyboard.press("Alt+ArrowLeft");
  await reviewer
    .getByLabel("Scientific rationale", { exact: true })
    .fill("Private draft rationale retained through offline restart. Software fixture only.");
  const reviewerDraftEvent = sourcePage.waitForEvent("download");
  await sourcePage.keyboard.press("Control+s");
  const reviewerDraftDownload = await reviewerDraftEvent;
  assert.equal(reviewerDraftDownload.suggestedFilename(), "reviewer-draft.json");
  const reviewerDraft = JSON.parse(await readFile(await reviewerDraftDownload.path(), "utf8"));
  assert.equal(reviewerDraft.packHash, reviewPack.packHash);
  assert.match(reviewerDraft.decisions[0].rationale, /retained through offline/);
  await reviewer
    .getByRole("button", { name: "Export completed reviewer form", exact: true })
    .click();
  await reviewer.getByText(/Complete every decision, rationale, source link/).waitFor();
  await reviewer.getByText(/Review draft saved on this device/).waitFor();
  await sourcePage.reload();
  await saved(sourcePage);
  await sourcePage.getByRole("button", { name: "Review", exact: true }).click();
  await sourcePage
    .getByRole("button", { name: "Complete an external review", exact: true })
    .click();
  reviewer = sourcePage.getByRole("dialog", { name: "Scientific reviewer workspace" });
  await reviewer.getByLabel("Open scientific review pack", { exact: true }).setInputFiles({
    name: "pack.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(reviewPack)),
  });
  await reviewer.getByText("Restore my saved review draft", { exact: true }).click();
  assert.equal(await reviewer.getByLabel("Scientific rationale", { exact: true }).inputValue(), "");
  await reviewer
    .getByRole("button", { name: /^Restore / })
    .first()
    .click();
  assert.match(
    await reviewer.getByLabel("Scientific rationale", { exact: true }).inputValue(),
    /retained through offline/,
  );
  await reviewer
    .getByLabel("Resume my review file", { exact: true })
    .setInputFiles(await reviewerDraftDownload.path());
  assert.match(
    await reviewer.getByLabel("Scientific rationale", { exact: true }).inputValue(),
    /retained through offline/,
  );
  await reviewer.evaluate((el) => {
    el.scrollTop = 0;
  });
  await sourcePage.screenshot({ path: join(output, "juw-reviewer-workspace.png") });
  await sourcePage.setViewportSize({ width: 390, height: 844 });
  assert.equal(await reviewer.evaluate((el) => el.scrollWidth > el.clientWidth + 2), false);
  await sourcePage.screenshot({ path: join(output, "juw-reviewer-mobile.png") });
  await sourcePage.setViewportSize({ width: 1280, height: 800 });
  const completedFixture = structuredClone(externalForms[0]);
  completedFixture.reviewer = {
    id: "Guided fixture reviewer",
    credentials: "Software fixture, not human qualification",
    independent: true,
    conflictDeclaration: "Synthetic test",
  };
  completedFixture.decisions.forEach((d) => {
    d.verdict = "supported";
    d.rationale = "Synthetic software fixture, not scientific review";
    d.sourceUrls = ["https://example.org/fixture"];
  });
  await reviewer.getByLabel("Resume my review file", { exact: true }).setInputFiles({
    name: "completed-fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(completedFixture)),
  });
  await reviewer.getByRole("button", { name: "Check review completion", exact: true }).click();
  await reviewer.getByText(/All decisions and declarations are complete/).waitFor();
  const completedReviewEvent = sourcePage.waitForEvent("download");
  await reviewer
    .getByRole("button", { name: "Export completed reviewer form", exact: true })
    .click();
  const completedReview = JSON.parse(
    await readFile(await (await completedReviewEvent).path(), "utf8"),
  );
  assert.equal(completedReview.decisions.length, reviewPack.items.length);
  assert(Number.isFinite(Date.parse(completedReview.completedAt)));
  assert.equal(completedReview.packHash, reviewPack.packHash);
  await reviewer.getByRole("button", { name: "Remove saved draft copies", exact: true }).click();
  await reviewer.getByText(/Saved draft copies removed for this pack/).waitFor();
  assert.match(
    await reviewer.getByLabel("Scientific rationale", { exact: true }).inputValue(),
    /Synthetic software fixture/,
  );
  const tampered = structuredClone(reviewPack);
  tampered.items[0].text += " changed";
  await reviewer.getByLabel("Open scientific review pack", { exact: true }).setInputFiles({
    name: "tampered.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(tampered)),
  });
  await reviewer.getByText(/Review pack hash mismatch/).waitFor();
  await reviewer
    .getByLabel("Open scientific review pack", { exact: true })
    .setInputFiles({
      name: "pack.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(reviewPack)),
    });
  await reviewer.getByLabel("Review item", { exact: true }).waitFor();
  assert.equal(
    await reviewer.getByText("Restore my saved review draft", { exact: true }).count(),
    0,
  );
  await sourcePage.keyboard.press("F5");
  assert(await reviewer.isVisible());
  await reviewer.getByRole("button", { name: "Close", exact: true }).click();
  await sourcePage.getByText(/Lecture workspace · Web companion/).click();
  const unchangedEvent = sourcePage.waitForEvent("download");
  await sourcePage.getByRole("button", { name: "Save portable project", exact: true }).click();
  const unchangedZip = await SourceZip.loadAsync(
    await readFile(await (await unchangedEvent).path()),
  );
  const unchangedDeck = JSON.parse(await unchangedZip.file("deck.json").async("string"));
  assert.deepEqual(unchangedDeck.slides, sourceProject.slides);
  assert.deepEqual(unchangedDeck.sourceDocuments, sourceProject.sourceDocuments);
  results.push(
    "Guided external review works offline, restores saved drafts, exports compatible forms, rejects tampering and never changes the lecturer deck",
  );
  await sourcePage.getByText("Assess returned reviewer forms", { exact: true }).click();
  await sourcePage.getByLabel("Original review pack", { exact: true }).setInputFiles({
    name: "pack.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(reviewPack)),
  });
  for (const [index, label] of ["Reviewer A form", "Reviewer B form"].entries()) {
    const form = externalForms[index];
    form.reviewer.credentials = "Software test fixture, not a human qualification";
    form.reviewer.independent = true;
    form.reviewer.conflictDeclaration = "Synthetic software fixture";
    form.completedAt = new Date().toISOString();
    form.decisions.forEach((d) => {
      d.verdict = "supported";
      d.rationale = "Software fixture, not a scientific assessment";
      d.sourceUrls = ["https://example.org/fixture"];
    });
    await sourcePage.getByLabel(label, { exact: true }).setInputFiles({
      name: `reviewer-${index}.json`,
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(form)),
    });
  }
  await sourcePage.getByRole("button", { name: "Assess returned forms", exact: true }).click();
  await sourcePage
    .getByText("Two reviewer attestations complete — identity and independence unverified", {
      exact: true,
    })
    .waitFor();
  assert(
    await sourcePage
      .getByRole("button", { name: "Export reviewed PPTX", exact: true })
      .isDisabled(),
  );
  const assessedDownload = sourcePage.waitForEvent("download");
  await sourcePage.getByRole("button", { name: "Download assessment", exact: true }).click();
  const assessed = JSON.parse(await readFile(await (await assessedDownload).path(), "utf8"));
  assert.equal(assessed.scientificCertification, false);
  assert.equal(assessed.independentlyVerified, false);
  results.push(
    "Offline returned-form assessment checks content hashes and preserves the scientific-review gate even with complete self-attestations",
  );
  await sourcePage.screenshot({ path: join(output, "juw-source-review-offline.png") });
  await sourcePage.getByRole("button", { name: /^02/ }).click();
  await sourcePage.getByText("Review / apply a replacement slide", { exact: true }).click();
  await sourcePage
    .getByLabel("Replacement title", { exact: true })
    .fill("Inspected replacement fixture");
  await sourcePage
    .getByLabel("Replacement teaching points", { exact: true })
    .fill("A unique synthetic fixture statement used to test inspected replacement safety.");
  await sourcePage.getByRole("button", { name: "Edit", exact: true }).click();
  await sourcePage
    .getByLabel("Speaker notes", { exact: true })
    .fill("A newer manual edit must invalidate a pending replacement proposal.");
  assert(
    await sourcePage
      .getByRole("button", { name: "Apply inspected replacement", exact: true })
      .isDisabled(),
  );
  await sourcePage
    .getByText(/The slide or research context changed. Discard this proposal/)
    .waitFor();
  await sourcePage
    .getByRole("button", { name: "Discard replacement proposal", exact: true })
    .click();
  await sourcePage
    .getByLabel("Replacement title", { exact: true })
    .fill("Inspected replacement fixture");
  await sourcePage
    .getByLabel("Replacement teaching points", { exact: true })
    .fill("A unique synthetic fixture statement used to test inspected replacement safety.");
  await sourcePage
    .getByRole("button", { name: "Apply inspected replacement", exact: true })
    .click();
  await saved(sourcePage);
  assert.equal(
    await sourcePage.getByRole("textbox", { name: "Title", exact: true }).inputValue(),
    "Inspected replacement fixture",
  );
  const replacedEvent = sourcePage.waitForEvent("download");
  await sourcePage.getByRole("button", { name: "Save portable project", exact: true }).click();
  const replacedZip = await SourceZip.loadAsync(await readFile(await (await replacedEvent).path()));
  const replaced = JSON.parse(await replacedZip.file("deck.json").async("string"));
  assert.equal(replaced.slides.length, sourceProject.slides.length);
  assert.equal(replaced.slides[1].title, "Inspected replacement fixture");
  assert(
    replaced.slides[1].claims.every((c) => c.status === "unreviewed" && c.evidence.length === 0),
  );
  results.push(
    "Replacement editor blocks stale proposals and preserves exact count while resetting new claims for review",
  );
  await sourceContext.close();
  results.push(
    "Publisher HTML is inert, attributed source text survives offline reopening and portable export, and missing embeddings cannot produce a semantic pass",
  );
  const parityThemes = [
    "classic",
    "gram",
    "culture",
    "fluorescence",
    "molecular",
    "clinical",
    "mycology",
    "outbreak",
    "parasitology",
    "phycology",
  ];
  const parityLayouts = ["title", "content", "two-column", "full-image", "blank"];
  const parityDeck = {
    ...backup.decks[0],
    id: "qa-parity",
    title: "Export parity",
    discipline: "Industrial & Biotechnology Microbiology",
    topic: "Enzyme immobilization",
    requestedCount: 50,
    slides: parityThemes.flatMap((theme, t) =>
      parityLayouts.map((layout, l) => ({
        ...backup.decks[0].slides[1],
        id: `parity-${t}-${l}`,
        title: `Parity${t * 5 + l} subject title`,
        theme,
        layout,
        subtitle: "Matching preview and PowerPoint",
        bullets: [
          "A teaching point that remains native editable text.",
          "A second scientific explanation to check spacing and colour.",
        ],
        leftBullets: ["Left column teaching point"],
        rightBullets: ["Right column teaching point"],
        media:
          layout === "title"
            ? []
            : [
                {
                  id: "qa-figure",
                  kind: "diagram",
                  title: "QA attachment",
                  src:
                    "data:image/svg+xml;charset=utf-8," +
                    encodeURIComponent(
                      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="#88aabb"/><circle cx="200" cy="100" r="60" fill="#335577"/></svg>',
                    ),
                  credit: "QA",
                  source: "fixture",
                  license: "CC0",
                  keywords: [],
                },
              ],
        citations: [],
      })),
    ),
  };
  const parityByViewport = [];
  for (const width of [1280, 390]) {
    const pc = await browser.newContext({
      viewport: { width, height: 844 },
      acceptDownloads: true,
    });
    await pc.addInitScript(
      ({ deck }) =>
        localStorage.setItem(
          "juw-microslides-v661-intro-logo",
          JSON.stringify({
            state: { library: [deck], activeId: deck.id, selectedIndex: 0 },
            version: 0,
          }),
        ),
      { deck: parityDeck },
    );
    const pp = await pc.newPage();
    pp.on("pageerror", (e) => errors.push(e.message));
    await pp.goto(url);
    await saved(pp);
    const metrics = [];
    for (let i = 0; i < 50; i++) {
      const heading = pp.locator(
        "[data-slide-stage] .slide-title-text, [data-slide-stage] .slide-content-heading",
      );
      await heading.waitFor();
      await pp.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          [...document.querySelectorAll("[data-slide-stage] img")].map((img) => img.decode()),
        );
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      assert.match(await heading.innerText(), new RegExp(`Parity${i} subject title`, "i"));
      metrics.push(
        await heading.evaluate((el) => {
          const stage = el.closest("[data-slide-stage]"),
            origin = stage.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(el);
          const rect = range.getClientRects()[0],
            css = getComputedStyle(el),
            scale = origin.width / 1280;
          return {
            x: (rect.left - origin.left) / scale,
            y: (rect.top - origin.top) / scale,
            size: parseFloat(css.fontSize) * 0.75,
            color: css.color,
            body: (() => {
              const bullet = stage.querySelector(".slide-bullets [role=textbox]");
              if (!bullet) return null;
              const r = document.createRange();
              r.selectNodeContents(bullet);
              const b = r.getClientRects()[0];
              return {
                x: (b.left - origin.left) / scale,
                y: (b.top - origin.top) / scale,
                size: parseFloat(getComputedStyle(bullet).fontSize) * 0.75,
              };
            })(),
            images: [...stage.querySelectorAll("img")].map((img) => {
              const r = img.getBoundingClientRect();
              return {
                x: (r.left - origin.left) / scale,
                y: (r.top - origin.top) / scale,
                w: r.width / scale,
                h: r.height / scale,
              };
            }),
          };
        }),
      );
      if (width === 1280 && process.env.JUW_QUALIFY_PPTX === "1") {
        await pp.evaluate(() => {
          const clone = document.querySelector("[data-slide-stage]").cloneNode(true);
          clone.id = "qualification-baseline";
          Object.assign(clone.style, {
            position: "fixed",
            left: "0",
            top: "0",
            transform: "none",
            width: "1280px",
            height: "720px",
            zIndex: "2147483647",
            boxShadow: "none",
          });
          document.body.append(clone);
        });
        await pp.locator("#qualification-baseline").screenshot({
          path: join(output, `preview-slide-${String(i + 1).padStart(3, "0")}.png`),
        });
        await pp.locator("#qualification-baseline").evaluate((el) => el.remove());
      }
      if (i < 49) await pp.keyboard.press("ArrowRight");
    }
    const download = pp.waitForEvent("download");
    await pp.getByRole("button", { name: "Export PPTX", exact: true }).click();
    const file = await download;
    const bytes = await readFile(await file.path());
    assert.equal(slideCountInPptx(bytes), 50);
    const xml = pptxXmlFiles(bytes);
    const embeddedVectors = Object.entries(xml).filter(([name, data]) =>
      name.startsWith("ppt/media/") && name.endsWith(".svg") && /<svg[\s>]/i.test(data)
    );
    assert(embeddedVectors.length > 0, "PPTX must retain genuine SVG vector artwork");
    const firstSlide = xml["ppt/slides/slide1.xml"];
    const logoBox = metrics[0].images[0];
    const logoPic = [...firstSlide.matchAll(/<p:pic>.*?<\/p:pic>/gs)]
      .map((m) => m[0])
      .find((pic) => {
        const off = pic.match(/<a:off x="(\d+)" y="(\d+)"/);
        return (
          off &&
          Math.abs(Number(off[1]) / 9525 - logoBox.x) < 1 &&
          Math.abs(Number(off[2]) / 9525 - logoBox.y) < 1
        );
      });
    const logoId = logoPic.match(/r:embed="([^"]+)"/)[1];
    const rel = [...xml["ppt/slides/_rels/slide1.xml.rels"].matchAll(/<Relationship\s[^>]+\/>/g)]
      .map((m) => m[0])
      .find((r) => r.includes(`Id="${logoId}"`));
    const target = rel.match(/Target="([^"]+)"/)[1].replace(/^\.\.\//, "ppt/");
    assert(xml[target], "Export must embed the university crest");
    const alpha = await pp.evaluate(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      return [
        [0, 0],
        [c.width - 1, 0],
        [0, c.height - 1],
        [c.width - 1, c.height - 1],
        [Math.floor(c.width / 2), Math.floor(c.height / 2)],
      ].map(([x, y]) => ctx.getImageData(x, y, 1, 1).data[3]);
    }, `data:image/png;base64,${xml[target]}`);
    assert.deepEqual(
      alpha,
      [0, 0, 0, 0, 255],
      "University crest must have transparent exterior and an intact opaque centre in PowerPoint",
    );

    for (let i = 0; i < 50; i++) {
      const slideXml = xml[`ppt/slides/slide${i + 1}.xml`];
      const shape = [...slideXml.matchAll(/<p:sp>.*?<\/p:sp>/gs)]
        .map((m) => m[0])
        .find((sp) => new RegExp(`Parity${i} subject title`, "i").test(sp));
      assert(shape, `Slide ${i + 1} title must remain editable text`);
      const off = shape.match(/<a:off x="(\d+)" y="(\d+)"/);
      assert(off, "Native title must have coordinates");
      assert(
        Math.abs(Number(off[1]) / 9525 - metrics[i].x) < 1,
        `Slide ${i + 1} horizontal placement`,
      );
      assert(
        Math.abs(Number(off[2]) / 9525 - metrics[i].y) < 1,
        `Slide ${i + 1} vertical placement`,
      );
      assert(
        shape.includes(`sz="${Math.round(metrics[i].size * 100)}"`),
        `Slide ${i + 1} font size`,
      );
      assert(shape.includes('typeface="Georgia"'), "Shared heading font");
      const hex = metrics[i].color
        .match(/\d+/g)
        .slice(0, 3)
        .map((n) => Number(n).toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
      assert(shape.toUpperCase().includes(hex), "Export must preserve theme text colour");
      if (metrics[i].body) {
        const body = [...slideXml.matchAll(/<p:sp>.*?<\/p:sp>/gs)]
          .map((m) => m[0])
          .find((sp) => /Left column teaching point|A teaching point/.test(sp));
        assert(body, "Body must stay native editable text");
        const off = body.match(/<a:off x="(\d+)" y="(\d+)"/);
        assert(Math.abs(Number(off[1]) / 9525 - metrics[i].body.x) < 1, "Body horizontal position");
        assert(Math.abs(Number(off[2]) / 9525 - metrics[i].body.y) < 1, "Body vertical position");
        assert(body.includes(`sz="${Math.round(metrics[i].body.size * 100)}"`), "Body font size");
      }
      const pictures = [...slideXml.matchAll(/<p:pic>.*?<\/p:pic>/gs)].map((m) => m[0]);
      for (const img of metrics[i].images)
        assert(
          pictures.some((pic) => {
            const off = pic.match(/<a:off x="(\d+)" y="(\d+)"/),
              size = pic.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
            return (
              off &&
              size &&
              Math.abs(Number(off[1]) / 9525 - img.x) < 1 &&
              Math.abs(Number(off[2]) / 9525 - img.y) < 1 &&
              Math.abs(Number(size[1]) / 9525 - img.w) < 1 &&
              Math.abs(Number(size[2]) / 9525 - img.h) < 1
            );
          }),
          `Slide ${i + 1}: image placement must match the preview: ${JSON.stringify(img)}`,
        );

      assert(
        !/OUTBREAK \/ ONE HEALTH|>PARASITOLOGY<|>PHYCOLOGY</.test(slideXml),
        "Theme labels must not mislabel the research subject",
      );
    }
    await file.saveAs(join(output, `juw-parity-${width}.pptx`));
    if (width === 1280 && process.env.JUW_QUALIFY_PPTX === "1")
      await writeFile(
        join(output, "powerpoint-baseline.json"),
        JSON.stringify(
          {
            version: "V6.2.1",
            slides: 50,
            width: 1280,
            height: 720,
            metrics,
            draftMask: { x: 192, y: 16, w: 672, h: 24 },
          },
          null,
          2,
        ),
      );
    await pp.screenshot({ path: join(output, `juw-parity-${width}.png`) });
    parityByViewport.push(metrics);
    await pc.close();
  }
  for (let i = 0; i < 50; i++) {
    const a = parityByViewport[0][i],
      b = parityByViewport[1][i];
    assert.equal(a.size, b.size);
    assert.equal(a.color, b.color);
    assert(
      Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01,
      "Mobile and desktop share the same composition",
    );
    assert.equal(a.body?.size, b.body?.size);
    if (a.body)
      assert(Math.abs(a.body.x - b.body.x) < 0.01 && Math.abs(a.body.y - b.body.y) < 0.01);
  }
  results.push(
    "University crest retains transparent corners and an opaque original centre in desktop and mobile PowerPoint exports",
  );
  results.push(
    "All 10 themes and 5 layouts preserve title/body positions, font sizes, colours, logos and attached images in desktop and mobile exports",
  );

  const legacyContext = await browser.newContext();
  const legacyState = {
    state: {
      library: backup.decks.map((d) => ({ ...d, updatedAt: 1000 })),
      activeId: backup.decks[0].id,
      selectedIndex: 0,
    },
    version: 0,
  };
  await legacyContext.addInitScript(
    ({ legacyState }) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem("juw-microslides-v661-intro-logo", JSON.stringify(legacyState));
        sessionStorage.setItem("seeded", "true");
      }
    },
    { legacyState },
  );
  const legacyPage = await legacyContext.newPage();
  await legacyPage.goto(url);
  await saved(legacyPage);
  assert.equal(
    await legacyPage.getByRole("textbox", { name: "Lecture topic", exact: true }).inputValue(),
    backup.decks[0].title,
  );
  assert(
    await legacyPage.evaluate(() =>
      Boolean(localStorage.getItem("juw-microslides-v661-intro-logo")),
    ),
  );
  await legacyContext.close();
  results.push("Legacy saved decks migrate without a fresh sample replacing them");
  const recoveryContext = await browser.newContext();
  const recoveryPage = await recoveryContext.newPage();
  await recoveryPage.goto(url);
  await saved(recoveryPage);
  await recoveryPage.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("juw-microslides", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const transaction = db.transaction("state", "readwrite");
      transaction.objectStore("state").put("{damaged-original", "juw-microslides-schema-1");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await recoveryPage.reload();
  await recoveryPage.waitForFunction(() => document.body.textContent.includes("damaged save"));
  await recoveryPage.getByRole("button", { name: "Library", exact: true }).click();
  const recoveryEvent = recoveryPage.waitForEvent("download");
  await recoveryPage.getByRole("button", { name: "Download previous raw save" }).click();
  const recoveryDownload = await recoveryEvent;
  assert.equal(await readFile(await recoveryDownload.path(), "utf8"), "{damaged-original");
  await recoveryContext.close();
  results.push("Damaged saves are archived intact and recoverable without blocking the app");

  const initial = await page.getByRole("dialog").locator("li").count();
  for (let i = 0; i < 25; i++)
    await page.getByRole("button", { name: "Duplicate current", exact: true }).click();
  assert.equal(await page.getByRole("dialog").locator("li").count(), initial + 25);
  results.push("Creating more than 24 decks preserves existing decks");
  await page.getByLabel("Restore backup", { exact: true }).setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.waitForFunction(
    (n) => document.querySelectorAll('[role="dialog"] li').length === n,
    initial + 25 + backup.decks.length,
  );
  results.push("Backup restore adds copies without replacing saved decks");
  const restoredCount = await page.getByRole("dialog").locator("li").count();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  assert.equal(await page.getByRole("dialog").locator("li").count(), initial + 25);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  assert.equal(await page.getByRole("dialog").locator("li").count(), restoredCount);
  results.push("Undo and redo restore the deck library");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await saved(page);
  await page.reload();
  await saved(page);
  await page.getByRole("button", { name: "Library", exact: true }).click();
  assert.equal(await page.getByRole("dialog").locator("li").count(), restoredCount);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  results.push("IndexedDB library survives a full reload");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  assert(await page.getByLabel("Local AI server").isVisible());
  await page.getByRole("button", { name: "Close", exact: true }).click();
  results.push("Local AI settings are accessible");
  await page
    .locator('textarea[placeholder="What will you explain when presenting this slide?"]')
    .fill("QA speaker notes preserved in PowerPoint.");
  await saved(page);
  downloadEvent = page.waitForEvent("download", { timeout: 90000 });
  await page.getByRole("button", { name: "Export PPTX", exact: true }).click();
  const pptx = await downloadEvent;
  await pptx.saveAs(join(output, "juw-qa.pptx"));
  assert.equal(slideCountInPptx(await readFile(await pptx.path())), 12);
  results.push("PowerPoint downloads successfully with exactly the deck slide count");
  await page.waitForFunction(async () => {
    const r = await navigator.serviceWorker.ready;
    return Boolean(r.active);
  });
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) {
    await page.reload();
    await saved(page);
  }
  await context.setOffline(true);
  await page.reload();
  await saved(page);
  assert.match(await page.locator("body").innerText(), /Bacterial genome architecture/);
  results.push("Service worker reopens the saved app offline");
  await context.setOffline(false);
  await context.close();
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mp = await mobile.newPage();
  mp.on("pageerror", (e) => errors.push(e.message));
  await mp.goto(url);
  await saved(mp);
  assert(await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  assert((await mp.locator(".topic-artwork svg").count()) >= 1);
  await mp.screenshot({ path: join(output, "juw-mobile.png") });
  await mp.getByRole("button", { name: "Inspector", exact: true }).click();
  await mp.getByText("Help: edit", { exact: true }).click();
  assert(await mp.getByText(/Select a slide, then edit/).isVisible());
  results.push("Mobile layout fits and contextual Help opens");
  results.push("Mobile slide artwork and scalable typography render without image rasterization");
  await mp.getByRole("button", { name: "Close", exact: true }).click();
  await mp.getByRole("button", { name: "Library", exact: true }).click();
  assert(await mp.getByRole("button", { name: "Download editable backup" }).isVisible());
  await mp.screenshot({ path: join(output, "juw-mobile-library.png") });
  results.push("Mobile backup controls are accessible");
  await mp.getByRole("button", { name: "Close", exact: true }).click();
  await mp.locator("#gen-topic").fill("Bacterial genome architecture");
  await mp.getByRole("radio", { name: "AI lecture writer" }).check();
  await mp.getByRole("button", { name: "Generate deck", exact: true }).click();
  await saved(mp);
  assert(await mp.getByText(/Local AI is not configured/).isVisible());
  assert.match(await mp.locator('[role="status"]').first().innerText(), /Knowledge draft/);
  await mp.locator('[aria-label="Lecture title"]').scrollIntoViewIfNeeded();
  assert(
    await mp
      .locator('[aria-label="Lecture title"]')
      .evaluate((el) => el.scrollHeight <= el.clientHeight + 2),
  );
  await mp.screenshot({ path: join(output, "juw-mobile-generated.png") });
  results.push("Unavailable AI explicitly falls back to a labelled knowledge draft");
  results.push("Long lecture title fits in the mobile slide preview");
  assert(
    await mp
      .locator(".slide-course-meta")
      .evaluate(
        (el) =>
          el.getBoundingClientRect().bottom <= el.closest("article").getBoundingClientRect().bottom,
      ),
  );
  results.push("Course and instructor metadata fit inside the mobile title slide");

  await mobile.close();

  const research = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    acceptDownloads: true,
  });
  const rp = await research.newPage();
  rp.on("pageerror", (e) => errors.push(e.message));
  const fixtureSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="600" height="300" fill="white"/><ellipse cx="300" cy="150" rx="180" ry="85" fill="none" stroke="navy" stroke-width="6"/><text x="110" y="160" font-size="22">QA schematic fixture</text></svg>';
  await research.route("https://commons.wikimedia.org/w/api.php**", (route) => {
    const video = new URL(route.request().url()).searchParams
      .get("gsrsearch")
      ?.includes("filetype:video");
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        query: {
          pages: video
            ? {}
            : {
                1: {
                  pageid: 1,
                  title: "File:QA fixture bacterial chromosome.svg",
                  imageinfo: [
                    {
                      url: "https://upload.wikimedia.org/qa/chromosome.svg",
                      mime: "image/svg+xml",
                      descriptionurl: "https://commons.wikimedia.org/wiki/File:QA_fixture",
                      extmetadata: {
                        Artist: { value: "QA fixture author" },
                        LicenseShortName: { value: "CC0" },
                      },
                    },
                  ],
                },
                2: {
                  pageid: 2,
                  title: "File:QA fixture Plasmodium sporozoite.svg",
                  imageinfo: [
                    {
                      url: "https://upload.wikimedia.org/qa/sporozoite.svg",
                      mime: "image/svg+xml",
                      descriptionurl: "https://commons.wikimedia.org/wiki/File:QA_fixture_2",
                      extmetadata: {
                        Artist: { value: "QA fixture author" },
                        LicenseShortName: { value: "CC0" },
                      },
                    },
                  ],
                },
              },
        },
      }),
    });
  });
  await research.route("https://api.openverse.org/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ results: [] }),
    }),
  );
  await research.route("https://upload.wikimedia.org/qa/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/svg+xml", body: fixtureSvg }),
  );
  await rp.goto(url);
  await saved(rp);
  await rp.locator("#gen-topic").fill("Bacterial genome architecture");
  await rp.locator("#gen-count").fill("12");
  await rp.getByRole("button", { name: "Generate deck", exact: true }).click();
  await saved(rp);
  assert.equal(await rp.locator("[data-slide-stage] figure").count(), 0);
  await rp.getByRole("button", { name: "Media", exact: true }).click();
  const correct = rp.locator("article").filter({
    has: rp.getByRole("heading", { name: "QA fixture bacterial chromosome.svg", exact: true }),
  });
  await correct
    .getByRole("button", { name: "Download file", exact: true })
    .waitFor({ state: "visible" });
  assert.equal(await rp.locator("[data-slide-stage] figure").count(), 0);
  results.push("Media lookup collects files without attaching them");
  await rp.getByRole("button", { name: /Chromosomes and accessory replicons/ }).click();
  const fileEvent = rp.waitForEvent("download");
  await correct.getByRole("button", { name: "Download file", exact: true }).click();
  const file = await fileEvent;
  assert.match(await readFile(await file.path(), "utf8"), /QA schematic fixture/);
  results.push("Collected media downloads as a separate file");
  await correct.getByRole("button", { name: "Attach to selected slide", exact: true }).click();
  const wrong = rp.locator("article").filter({
    has: rp.getByRole("heading", { name: "QA fixture Plasmodium sporozoite.svg", exact: true }),
  });
  await wrong.getByRole("button", { name: "Attach to selected slide", exact: true }).click();
  await saved(rp);
  await rp.getByRole("button", { name: "Review", exact: true }).click();
  await rp.getByText(/The figure metadata suggests malaria parasite/).waitFor({ state: "visible" });
  results.push("Specialist reviewer flags an intentionally mismatched attached image");
  await rp.getByRole("button", { name: "Edit", exact: true }).click();
  await rp
    .getByLabel("Bullets (one per line)", { exact: true })
    .fill("Viruses have their own ribosomes.\nAll bacteria have a single circular chromosome.");
  await saved(rp);
  await rp.getByRole("button", { name: "Review", exact: true }).click();
  await rp
    .getByText("Viruses do not possess their own ribosomes.", { exact: false })
    .waitFor({ state: "visible" });
  const reportEvent = rp.waitForEvent("download");
  await rp.getByRole("button", { name: "Download review report", exact: true }).click();
  const reportFile = await reportEvent;
  const report = JSON.parse(await readFile(await reportFile.path(), "utf8"));
  assert(report.issues.some((i) => i.category === "Potential factual error"));
  assert(report.issues.some((i) => i.category === "Media mismatch"));
  results.push("Review report downloads exact passages and correction suggestions");
  await rp.getByRole("button", { name: "Check references online", exact: true }).click();
  await rp.getByText(/No attached bibliographic records/).waitFor({ state: "visible" });
  results.push("Reference checking distinguishes absent sources from verified records");
  await rp.getByRole("button", { name: "AI review selected slide", exact: true }).click();
  await rp.getByText(/Local AI is not configured/).waitFor({ state: "visible" });
  results.push("Specialist AI does not fabricate a report when no local model is configured");
  await rp.getByRole("button", { name: "Media", exact: true }).click();
  while (await rp.getByRole("button", { name: "Remove image", exact: true }).count())
    await rp.getByRole("button", { name: "Remove image", exact: true }).first().click();
  await saved(rp);
  assert.equal(await rp.locator("[data-slide-stage] figure").count(), 0);
  results.push("Removing a figure does not insert a replacement");
  await rp.getByRole("button", { name: "Add", exact: true }).click();
  await saved(rp);
  assert.equal(await rp.locator("[data-slide-stage] figure").count(), 0);
  results.push("New blank slides contain no automatically selected figures");
  await research.close();
  const coverage = await browser.newContext({ acceptDownloads: true });
  const cp = await coverage.newPage();
  cp.on("pageerror", (e) => errors.push(e.message));
  await coverage.route("https://www.ebi.ac.uk/europepmc/**", (route) => {
    const papers = Array.from({ length: 20 }, (_, i) => ({
      id: `fixture-${i}`,
      pmid: `90000${i}`,
      source: "MED",
      title: `Microbial fuel cells: QA source ${i}`,
      abstractText: `Microbial fuel cells in dataset ${i} were studied with defined electrode comparisons and a microbial community. The investigators in dataset ${i} measured electrical output under controlled experimental conditions. The microbial fuel cells in dataset ${i} showed a condition-dependent response in the reported measurements. The authors in dataset ${i} restricted their conclusions to the tested system and reported further validation needs.`,
      authorString: "QA Fixture Author",
      pubYear: "2025",
      journalInfo: { journal: { title: "QA fixture" } },
    }));
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ resultList: { result: papers } }),
    });
  });
  await cp.goto(url);
  await saved(cp);
  await cp.locator("#gen-topic").fill("Microbial fuel cells");
  await cp.locator("#gen-count").fill("25");
  await cp.getByRole("button", { name: "Generate deck", exact: true }).click();
  await cp.waitForFunction(() => !document.querySelector("#gen-topic"));
  await saved(cp);
  assert.match(await cp.locator("body").innerText(), /Slide 1 of 25/);
  results.push(
    "An uncatalogued microbiology topic generates exactly 25 slides from distinct source sections",
  );
  const exactExport = cp.waitForEvent("download", { timeout: 90000 });
  await cp.getByRole("button", { name: "Export PPTX", exact: true }).click();
  const exactPptx = await exactExport;
  assert.equal(slideCountInPptx(await readFile(await exactPptx.path())), 25);
  results.push(
    "Cited 25-slide research deck exports exactly 25 PowerPoint slides without appended pages",
  );
  await coverage.unroute("https://www.ebi.ac.uk/europepmc/**");
  await coverage.route("https://www.ebi.ac.uk/europepmc/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ resultList: { result: [] } }),
    }),
  );
  await cp.getByRole("button", { name: "Generate", exact: true }).click();
  await cp.locator("#gen-topic").fill("Uncatalogued isolate ZXQ-517 secretion system");
  await cp.locator("#gen-count").fill("25");
  await cp.getByRole("button", { name: "Generate deck", exact: true }).click();
  await cp
    .getByRole("alert")
    .filter({ hasText: /not complete yet/ })
    .waitFor();
  assert.match(await cp.locator("body").innerText(), /Microbial fuel cells/);
  results.push(
    "Incomplete research does not replace the active deck or report a short deck as success",
  );
  await coverage.close();
  const professional = await browser.newContext({ acceptDownloads: true });
  const pro = await professional.newPage();
  pro.on("pageerror", (e) => errors.push(e.message));
  await pro.goto(url);
  await saved(pro);
  await pro.locator("#gen-topic").fill("Enzyme immobilization");
  await pro.locator("#gen-count").fill("1");
  await pro.getByRole("button", { name: "Generate deck", exact: true }).click();
  await pro.waitForFunction(() => !document.querySelector("#gen-topic"));
  await saved(pro);
  assert.match(await pro.locator("body").innerText(), /Slide 1 of 1/);
  assert((await pro.locator("[data-slide-stage]").innerText()).includes("Enzyme immobilization"));
  await pro.getByText(/Lecture workspace · Web companion/).click();
  await pro.getByRole("button", { name: "Audit entire deck", exact: true }).click();
  assert.match(await pro.getByLabel("Integrity audit results").innerText(), /critical findings/);
  assert(await pro.getByRole("button", { name: "Export reviewed PPTX", exact: true }).isDisabled());
  const portableEvent = pro.waitForEvent("download");
  await pro.getByRole("button", { name: "Save portable project", exact: true }).click();
  const portable = await portableEvent;
  assert(portable.suggestedFilename().endsWith(".juwslides"));
  await pro.getByLabel("Open portable project").setInputFiles(await portable.path());
  await saved(pro);
  await pro.getByRole("button", { name: "Lock selected slide", exact: true }).click();
  assert(await pro.getByRole("button", { name: "Unlock selected slide", exact: true }).isVisible());
  await pro.getByRole("button", { name: "Revisions & storage", exact: true }).click();
  await pro.getByText(/recovery snapshots.*retained/).waitFor();
  await pro.getByRole("button", { name: "Unlock selected slide", exact: true }).click();
  await pro.getByRole("button", { name: "Revisions & storage", exact: true }).click();
  await pro.getByRole("button", { name: "Restore as copy", exact: true }).first().waitFor();
  await pro.getByRole("button", { name: "Restore as copy", exact: true }).first().click();
  await saved(pro);
  assert.match(
    await pro.getByRole("textbox", { name: "Lecture topic", exact: true }).inputValue(),
    /recovered/,
  );
  results.push(
    "Substantive single-slide generation, blocked unreviewed export, portable project UI roundtrip, slide locking and version recovery work together",
  );
  await professional.close();
  legacyWorkerFixture = true;
  const upgrade = await browser.newContext();
  const up = await upgrade.newPage();
  up.on("pageerror", (e) => errors.push(e.message));
  await up.goto(url);
  await saved(up);
  await up.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await up.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await up.reload();
  await saved(up);
  assert.equal(await up.locator("#root").getAttribute("data-legacy-shell"), "true");
  legacyWorkerFixture = false;
  await up.evaluate(async () => {
    const previous = navigator.serviceWorker.controller;
    const changed = new Promise((resolve) =>
      navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }),
    );
    const r = await navigator.serviceWorker.getRegistration();
    await r.update();
    if (navigator.serviceWorker.controller === previous) await changed;
  });
  await up.waitForFunction(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    const keys = await caches.keys();
    return (
      keys.some((k) => k.startsWith("juw-pages-") && k !== "juw-pages-qa-legacy") &&
      !r.installing &&
      !r.waiting &&
      r.active === navigator.serviceWorker.controller
    );
  });
  await up.reload();
  await saved(up);
  assert.equal(await up.locator("#root").getAttribute("data-legacy-shell"), null);
  assert(await up.locator("[data-app-build]").isVisible());
  results.push(
    "An open app activates its newer service worker and stops serving the legacy cached shell",
  );
  await up.getByRole("button", { name: "Check for updates", exact: true }).click();
  await up.getByText("Up to date", { exact: true }).waitFor();
  results.push("Visible build ID and update checking agree with fresh build metadata");
  await upgrade.setOffline(true);
  await up.reload();
  await saved(up);
  assert.equal(await up.locator("#root").getAttribute("data-legacy-shell"), null);
  results.push("The upgraded app reopens its current shell and saved decks offline");
  await upgrade.close();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, checks: results, uncaughtErrors: errors }, null, 2));
  await writeFile(
    join(output, "juw-qa.json"),
    JSON.stringify({ ok: true, checks: results, uncaughtErrors: errors }, null, 2),
  );
} catch (e) {
  const failedPage = browser.contexts().at(-1)?.pages().at(-1);
  if (failedPage) {
    await failedPage.screenshot({ path: join(output, "juw-qa-failure.png") }).catch(() => {});
    console.error(
      JSON.stringify({
        dialogs: (await failedPage.getByRole("dialog").allTextContents()).map((t) =>
          t.slice(0, 1600),
        ),
        selects: await failedPage.locator("select").evaluateAll((els) =>
          els.map((e) => ({
            aria: e.getAttribute("aria-label"),
            labels: [...e.labels].map((l) => l.textContent?.slice(0, 180)),
          })),
        ),
      }),
    );
  }
  console.error(e);
  console.error(JSON.stringify({ checks: results, errors }));
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
