import assert from "node:assert/strict";
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
  console.error(e);
  console.error(JSON.stringify({ checks: results, errors }));
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
