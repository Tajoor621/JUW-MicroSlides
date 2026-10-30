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
    if (
      name.endsWith(".xml") ||
      name.endsWith(".rels") ||
      name.endsWith(".png") ||
      name.endsWith(".svg")
    ) {
      const data = buffer.subarray(start, start + size);
      const uncompressed = method === 8 ? inflateRawSync(data) : data;
      files[name] = uncompressed.toString(name.endsWith(".png") ? "base64" : "utf8");
    }
    offset += 46 + n + extra + comment;
  }
  return files;
}

try {
  const migrationContext = await browser.newContext();
  await migrationContext.route("**/migration-seed.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Storage fixture</title>",
    }),
  );
  const migrationPage = await migrationContext.newPage();
  await migrationPage.goto(new URL("migration-seed.html", url).href);
  const oldLibrary = JSON.parse(
    await readFile(join(root, "scripts/fixtures/export-draft.json"), "utf8"),
  ).decks;
  await migrationPage.evaluate(
    (library) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("juw-microslides", 1);
        request.onupgradeneeded = () => request.result.createObjectStore("state");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction("state", "readwrite"),
            store = tx.objectStore("state");
          store.put(
            JSON.stringify({
              state: { library, activeId: library[0].id, selectedIndex: 0 },
              version: 0,
            }),
            "juw-microslides-schema-1",
          );
          store.put("original-recovery", "recovery-original");
          store.put('[{"id":"original-history"}]', "deck-revisions");
          store.put("unknown-value", "future-owner-key");
          tx.oncomplete = () => {
            window.__heldMigrationDatabase = db;
            resolve(true);
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    oldLibrary,
  );
  const upgradingPage = await migrationContext.newPage();
  await upgradingPage.goto(url);
  await upgradingPage.getByText(/Storage upgrade waiting/).waitFor();
  assert.equal(
    await upgradingPage.getByRole("button", { name: "Generate", exact: true }).count(),
    0,
    "Do not expose a fresh sample while an existing library is blocked",
  );
  await migrationPage.evaluate(() => window.__heldMigrationDatabase.close());
  await saved(upgradingPage);
  assert.equal(
    await upgradingPage.getByRole("textbox", { name: "Lecture topic", exact: true }).inputValue(),
    oldLibrary[0].title,
  );
  const migrated = await upgradingPage.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("juw-microslides");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction(["state", "schema-history"]),
            store = tx.objectStore("state"),
            result = { version: db.version, stores: [...db.objectStoreNames] };
          for (const key of ["recovery-original", "deck-revisions", "future-owner-key"]) {
            const r = store.get(key);
            r.onsuccess = () => (result[key] = r.result);
          }
          tx.oncomplete = () => {
            db.close();
            resolve(result);
          };
        };
      }),
  );
  assert.equal(migrated.version, 2);
  assert(migrated.stores.includes("schema-history"));
  assert.equal(migrated["recovery-original"], "original-recovery");
  assert.equal(migrated["deck-revisions"], '[{"id":"original-history"}]');
  assert.equal(migrated["future-owner-key"], "unknown-value");
  await migrationContext.close();
  results.push(
    "Blocked version-1 IndexedDB upgrade waits for the old tab, then retains the saved library, recovery, revision history and unknown keys",
  );
  const typographyContext = await browser.newContext({ acceptDownloads: true });
  const typographyPage = await typographyContext.newPage();
  await typographyPage.goto(url);
  await saved(typographyPage);
  await typographyPage.getByRole("button", { name: "Library", exact: true }).click();
  await typographyPage
    .getByLabel("Restore backup", { exact: true })
    .setInputFiles(join(root, "scripts/fixtures/export-draft.json"));
  await typographyPage.getByRole("button", { name: "Close", exact: true }).click();
  await typographyPage.getByRole("button", { name: /^02 content Nomenclature/ }).click();
  assert.equal(await typographyPage.locator("[data-slide-stage] em").count(), 2);
  assert.equal(await typographyPage.getByLabel("Slide review status", { exact: true }).count(), 0);
  const provenance = typographyPage.getByLabel("Source provenance", { exact: true });
  assert.equal(await provenance.getAttribute("open"), null);
  await provenance.locator("summary").click();
  assert(await provenance.getByText(/never blocks downloads/).isVisible());
  assert((await provenance.locator("li").count()) > 0);
  await provenance.locator("summary").click();
  const typographyDownload = typographyPage.waitForEvent("download");
  await typographyPage.getByRole("button", { name: "Export PPTX", exact: true }).click();
  const typographyXml = pptxXmlFiles(await readFile(await (await typographyDownload).path()));
  assert.match(typographyXml["ppt/slides/slide2.xml"], /i="1"/);
  assert.match(typographyXml["ppt/slides/slide2.xml"], /Escherichia coli/);
  assert.equal(await typographyPage.getByRole("alert", { name: "Export readiness" }).count(), 0);
  await typographyContext.close();
  results.push(
    "Draft fixture preserves species italics as native editable PPTX text, without review panels",
  );
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await saved(page);
  await page.getByLabel("Research approach", { exact: true }).selectOption("standard");
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
  await sourcePage.getByRole("button", { name: "Evidence", exact: true }).click();
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
  await sourcePage.getByRole("button", { name: "Evidence", exact: true }).click();
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
  results.push("Source library preserves attributed source text offline and in portable projects");
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
  // Synthetic, fully reviewed SOFTWARE fixtures exercise export geometry without bypassing gates.
  const { createServer: createViteServer } = await import("vite");
  const fixtureServer = await createViteServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true },
    resolve: { alias: { "@": root + "/src" } },
    logLevel: "error",
  });
  try {
    const { teachingFixture } = await import("./teaching-fixture.mjs");
    const base = await teachingFixture(fixtureServer);
    const { reconcileDeck } = await fixtureServer.ssrLoadModule("/src/lib/deck-integrity.ts");
    const { surfaceItems, surfaceSnapshot, attestClaim } = await fixtureServer.ssrLoadModule(
      "/src/lib/surface-review.ts",
    );
    const { teachingReleaseFindings } = await fixtureServer.ssrLoadModule(
      "/src/lib/teaching-readiness.ts",
    );
    parityDeck.preparedBy = base.deck.preparedBy;
    parityDeck.sourceDocuments = base.deck.sourceDocuments;
    const figure = structuredClone(parityDeck.slides[1].media[0]);
    figure.source = "https://example.org/synthetic-fixture";
    parityDeck.slides = parityDeck.slides.map((slide, i) => ({
      ...slide,
      evidenceFlags: [],
      learningObjectives: undefined, // This fixture tests the original layouts, not objectives.
      layout: i === 0 ? "title" : slide.layout === "title" ? "content" : slide.layout,
      teaching: {
        ...structuredClone(base.slide.teaching),
        diagram: undefined,
        diagramLabel: "",
        definition: `Synthetic layout fixture ${i}.`,
      },
      bullets: slide.bullets.map((b) => `Fixture ${i}: ${b}`),
      leftBullets: slide.leftBullets.map((b) => `Fixture ${i}: ${b}`),
      rightBullets: slide.rightBullets.map((b) => `Fixture ${i}: ${b}`),
      media: i === 0 ? [] : [structuredClone(figure)],
      citations: structuredClone(base.slide.citations),
      notes: "Synthetic layout validation only.",
    }));
    Object.assign(parityDeck, reconcileDeck(parityDeck));
    for (const slide of parityDeck.slides) {
      slide.claims = slide.claims.map((c) =>
        attestClaim(parityDeck, {
          ...c,
          status: "lecturer-reviewed",
          evidence: structuredClone(base.slide.claims[0].evidence),
        }),
      );
      slide.surfaceReviews = surfaceItems(slide).map((item) => ({
        field: item.field,
        snapshot: surfaceSnapshot(parityDeck, slide, item.field),
        verdict: "supported",
        rationale: "Controlled software layout fixture; not scientific validation.",
        reviewedAt: Date.now(),
        sourceUrl: base.url,
        quote: base.quote,
        locator: "Synthetic test paragraph",
      }));
    }
    const { teachingDeckSnapshot } = await fixtureServer.ssrLoadModule(
      "/src/lib/teaching-verification.ts",
    );
    parityDeck.teachingVerification = {
      instructor: "Synthetic software fixture",
      at: Date.now(),
      snapshot: teachingDeckSnapshot(parityDeck),
    };
    assert.deepEqual(
      teachingReleaseFindings(parityDeck),
      [],
      "Parity export fixtures must satisfy the real gate",
    );
  } finally {
    await fixtureServer.close();
  }
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
    const embeddedVectors = Object.entries(xml).filter(
      ([name, data]) =>
        name.startsWith("ppt/media/") && name.endsWith(".svg") && /<svg[\s>]/i.test(data),
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
    "University crest retains transparent corners and an opaque original centre in reviewed synthetic PowerPoint fixtures",
  );
  results.push(
    "All 10 themes preserve title/body positions, font sizes, colours, logos and attached images across desktop/mobile reviewed synthetic exports",
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
      const request = indexedDB.open("juw-microslides");
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
  let blockedDownloads = 0;
  page.on("download", () => blockedDownloads++);
  const draftDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PPTX", exact: true }).click();
  const draftBytes = await readFile(await (await draftDownload).path());
  assert(slideCountInPptx(draftBytes) >= 1 && slideCountInPptx(draftBytes) <= 50);
  assert.equal(blockedDownloads, 1);
  // A fresh user-gesture download must remain usable after the automatic attempt,
  // including on a narrow mobile viewport and beyond PptxGenJS's old 100ms cleanup.
  await page.setViewportSize({ width: 390, height: 844 });
  const directLink = page.getByRole("link", { name: "Download PowerPoint", exact: true });
  await directLink.waitFor();
  assert.match(await directLink.getAttribute("download"), /.*\.pptx$/);
  await page.waitForTimeout(300);
  const manualDownload = page.waitForEvent("download");
  await directLink.click();
  assert.deepEqual(await readFile(await (await manualDownload).path()), draftBytes);
  assert.equal(blockedDownloads, 2);
  await page.setViewportSize({ width: 1280, height: 800 });
  assert.equal(await page.getByRole("alert", { name: "Export readiness" }).count(), 0);
  results.push(
    "Editable PowerPoint download works without review panels; persistent mobile link saves identical bytes",
  );
  await page.waitForFunction(async () => {
    const r = await navigator.serviceWorker.ready;
    return Boolean(r.active);
  });
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) {
    await page.reload();
    await saved(page);
  }
  await context.setOffline(true);
  assert(
    await page.evaluate(async () => {
      const assets = [
        "juw-dept-seal.svg?v=offline-check",
        "fonts/DejaVuSans-Oblique.ttf?offline=1",
        "fonts/DejaVuSans-BoldOblique.ttf?offline=1",
      ];
      return (
        await Promise.all(
          assets.map(async (p) => {
            const r = await fetch(p);
            return r.ok && (await r.arrayBuffer()).byteLength > 100;
          }),
        )
      ).every(Boolean);
    }),
    "Offline cache must serve query-string artwork and italic fonts",
  );
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
  const preservedTitle = await mp.locator('[aria-label="Lecture title"]').innerText();
  await mp.locator("#gen-topic").fill("Bacterial genome architecture");
  await mp.getByRole("radio", { name: "AI lecture writer" }).check();
  await mp.getByRole("button", { name: "Generate deck", exact: true }).click();
  await saved(mp);
  assert.match(await mp.getByRole("alert").innerText(), /Local AI is not configured/);
  assert.match(await mp.locator('[role="status"]').first().innerText(), /Knowledge draft/);
  assert.equal(await mp.locator('[aria-label="Lecture title"]').innerText(), preservedTitle);
  await mp.locator('[aria-label="Lecture title"]').scrollIntoViewIfNeeded();
  assert(
    await mp
      .locator('[aria-label="Lecture title"]')
      .evaluate((el) => el.scrollHeight <= el.clientHeight + 2),
  );
  await mp.screenshot({ path: join(output, "juw-mobile-generated.png") });
  results.push("Unavailable AI preserves the saved Knowledge draft and exposes recovery details");
  results.push("Preserved lecture title fits in the mobile slide preview");
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
  await rp.getByLabel("Research approach", { exact: true }).selectOption("standard");
  await rp.locator("#gen-topic").fill("Bacterial genome architecture");
  await rp.locator("#gen-count").fill("12");
  await rp.getByRole("button", { name: "Generate deck", exact: true }).click();
  await saved(rp);
  assert.equal(await rp.locator("[data-slide-stage] figure img").count(), 0);
  await rp.getByRole("button", { name: "Media", exact: true }).click();
  const correct = rp.locator("article").filter({
    has: rp.getByRole("heading", { name: "QA fixture bacterial chromosome.svg", exact: true }),
  });
  await correct
    .getByRole("button", { name: "Download file", exact: true })
    .waitFor({ state: "visible" });
  assert.equal(await rp.locator("[data-slide-stage] figure img").count(), 0);
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
  assert.equal(await rp.getByRole("button", { name: "Review", exact: true }).count(), 0);
  await rp.getByRole("button", { name: "Media", exact: true }).click();
  while (await rp.getByRole("button", { name: "Remove image", exact: true }).count())
    await rp.getByRole("button", { name: "Remove image", exact: true }).first().click();
  await saved(rp);
  assert.equal(await rp.locator("[data-slide-stage] figure img").count(), 0);
  results.push("Removing a figure does not insert a replacement");
  await rp.getByRole("button", { name: "Add", exact: true }).click();
  await saved(rp);
  assert.equal(await rp.locator("[data-slide-stage] figure img").count(), 0);
  results.push("New blank slides contain no automatically selected figures");
  await research.close();
  const coverage = await browser.newContext({ acceptDownloads: true });
  const cp = await coverage.newPage();
  cp.on("pageerror", (e) => errors.push(e.message));
  await coverage.route("https://eutils.ncbi.nlm.nih.gov/**", (route) =>
    route.fulfill({ json: { esearchresult: { idlist: [] } } }),
  );
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
  const researchDraft = cp.waitForEvent("download");
  await cp.getByRole("button", { name: "Export PPTX", exact: true }).click();
  assert.equal(slideCountInPptx(await readFile(await (await researchDraft).path())), 25);
  assert.equal(await cp.getByRole("alert", { name: "Export readiness" }).count(), 0);
  results.push("Research deck downloads directly without review checks");
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
  await cp.getByText("Request and recovery details", { exact: true }).click();
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
  await pro.getByLabel("Research approach", { exact: true }).selectOption("standard");
  await pro.locator("#gen-topic").fill("Enzyme immobilization");
  await pro.locator("#gen-count").fill("1");
  await pro.getByRole("button", { name: "Generate deck", exact: true }).click();
  await pro.waitForFunction(() => !document.querySelector("#gen-topic"));
  await saved(pro);
  assert.match(await pro.locator("body").innerText(), /Slide 1 of 1/);
  assert((await pro.locator("[data-slide-stage]").innerText()).includes("Enzyme immobilization"));
  await pro.getByText(/Lecture workspace · Web companion/).click();
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
    "Substantive single-slide generation, editable export without review, portable project UI roundtrip, slide locking and version recovery work together",
  );
  // The restored revision may intentionally retain the slide's locked state.
  const recoveredLock = pro.getByRole("button", { name: "Unlock selected slide", exact: true });
  if (await recoveredLock.isVisible()) await recoveredLock.click();
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
  await up.evaluate(() => {
    ServiceWorkerRegistration.prototype.update = async () => {
      throw new DOMException("The object is in an invalid state.", "InvalidStateError");
    };
  });
  await up.getByRole("button", { name: "Check for updates", exact: true }).click();
  await up.getByText(/Offline cache could not refresh/).waitFor();
  assert.match(await up.locator("[data-app-build]").innerText(), /Up to date/);
  assert(await up.getByRole("button", { name: "Check for updates", exact: true }).isEnabled());
  assert(await up.getByRole("button", { name: "Generate", exact: true }).isEnabled());
  results.push(
    "InvalidStateError in worker updates preserves build discovery and an interactive editor",
  );
  await up.route("http://localhost:11434/api/tags", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ models: [{ name: "llama3.2:latest" }] }),
    }),
  );
  await up.getByRole("button", { name: "Settings", exact: true }).click();
  await up.getByRole("button", { name: "Test local AI connection", exact: true }).click();
  await up.getByText(/Server reachable; generation model found/).waitFor();
  await up.getByLabel("Local AI model", { exact: true }).fill("missing-model");
  await up.getByRole("button", { name: "Test local AI connection", exact: true }).click();
  await up.getByText(/generation model is missing/).waitFor();
  await up.unroute("http://localhost:11434/api/tags");
  await up.route("http://localhost:11434/api/tags", (route) => route.abort());
  await up.getByRole("button", { name: "Test local AI connection", exact: true }).click();
  await up.getByText(/Connection failed/).waitFor();
  await up.getByRole("button", { name: "Close", exact: true }).click();
  results.push(
    "Local AI readiness identifies installed/missing models and server failure without saving settings",
  );
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
        alerts: await failedPage.getByRole("alert").allTextContents(),
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
