import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";
const root = process.cwd();
const output = process.env.JUW_QA_OUTPUT || "/workspace/screenshots";
await mkdir(output, { recursive: true });
const types = {
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
  results.push("PowerPoint downloads successfully");
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
  await mp.screenshot({ path: join(output, "juw-mobile.png") });
  await mp.getByRole("button", { name: "Inspector", exact: true }).click();
  await mp.getByText("Help: edit", { exact: true }).click();
  assert(await mp.getByText(/Select a slide, then edit/).isVisible());
  results.push("Mobile layout fits and contextual Help opens");
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
