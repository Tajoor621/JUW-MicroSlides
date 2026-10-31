import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, join, extname } from "node:path";
import { execFileSync } from "node:child_process";
import { cpus, totalmem } from "node:os";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import JSZip from "jszip";
const output = resolve(process.env.JUW_QA_OUTPUT || "qualification-results/note20-profile");
await mkdir(output, { recursive: true });
const root = resolve("dist-pages");
const server = createServer(async (req, res) => {
  try {
    const rel =
      decodeURIComponent(new URL(req.url, "http://localhost").pathname).replace(
        /^\/JUW-MicroSlides\//,
        "",
      ) || "index.html";
    const file = resolve(root, rel);
    assert(file.startsWith(root + "/"));
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpeg": "image/jpeg",
        ".webmanifest": "application/manifest+json",
        ".json": "application/json",
      }[extname(file)] || "application/octet-stream",
    );
    res.end(await readFile(file));
  } catch {
    res.statusCode = 404;
    res.end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  ...(process.env.JUW_CHROMIUM ? { executablePath: process.env.JUW_CHROMIUM } : {}),
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const report = {
  profile:
    "Note20 desktop workflow proxy: Chromium, 1280×720, touch, DPR 2; not physical hardware or Samsung Internet",
  browser: browser.version(),
  runner: { cpu: cpus()[0]?.model, memory: totalmem() },
  scientificQualification: false,
};
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
    hasTouch: true,
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const started = performance.now();
  await page.goto(`http://127.0.0.1:${server.address().port}/JUW-MicroSlides/`);
  await page.getByRole("button", { name: "Generate", exact: true }).waitFor();
  await page.getByText(/Saved on this device/).waitFor();
  await page.evaluate(() => document.fonts.ready);
  report.firstInteractiveMs = Math.round(performance.now() - started);
  const data = JSON.parse(await readFile("scripts/fixtures/export-draft.json", "utf8"));
  const deck = data.decks[0],
    title = deck.slides[0],
    body = deck.slides[1];
  deck.title = "Twenty-slide performance fixture";
  deck.topic = "Synthetic performance fixture";
  deck.slides = [
    { ...title, title: deck.title },
    ...Array.from({ length: 19 }, (_, i) => ({
      ...structuredClone(body),
      id: `performance-${i}`,
      title: `Synthetic visual workload ${i + 1}`,
      subtitle: "Software performance fixture; not teaching evidence",
      bullets: [
        `Artificial benchmark statement ${i + 1}: export rendering, not a biological claim.`,
        "Escherichia coli is used here only as a typography test string.",
      ],
      citations: [],
    })),
  ];
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await page.getByLabel("Restore backup", { exact: true }).setInputFiles({
    name: "performance-fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  const artwork = page.locator('[data-slide-stage] img[alt="Department of Microbiology, JUW"]');
  await artwork.waitFor();
  await artwork.evaluate((el) => el.decode());
  const geometry = await artwork.evaluate((el) => ({
    w: el.naturalWidth,
    h: el.naturalHeight,
    rect: el.getBoundingClientRect().toJSON(),
    stage: el.closest("[data-slide-stage]").getBoundingClientRect().toJSON(),
  }));
  // naturalWidth is density-corrected when srcset uses a width descriptor.
  // Verify actual encoded pixels independently, without changing preview hints.
  const bitmap = await artwork.evaluate(async (el) => {
    const decoded = await createImageBitmap(await (await fetch(el.currentSrc)).blob());
    const size = { width: decoded.width, height: decoded.height };
    decoded.close();
    return size;
  });
  assert.equal(bitmap.width, 1254);
  assert.equal(bitmap.height, 1254);
  report.artwork = { bitmap, densityAdjustedNaturalWidth: geometry.w };
  assert(geometry.rect.x > geometry.stage.x + geometry.stage.width / 2);
  await page.screenshot({ path: join(output, "title-1280x720.png") });
  for (const [button, name] of [
    ["Export PPTX", "twenty-slide-profile.pptx"],
    ["Export PDF", "twenty-slide-profile.pdf"],
  ]) {
    const start = performance.now();
    const event = page.waitForEvent("download", { timeout: 120000 });
    await page.getByRole("button", { name: button, exact: true }).click();
    const download = await event;
    const path = join(output, name);
    await download.saveAs(path);
    report[button === "Export PPTX" ? "pptxMs" : "pdfMs"] = Math.round(performance.now() - start);
    const bytes = await readFile(path);
    if (button === "Export PPTX") {
      const zip = await JSZip.loadAsync(bytes);
      const slides = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
      assert.equal(slides.length, 20);
      for (const name of slides) {
        const xml = await zip.file(name).async("string");
        assert.match(xml, /Unverified AI-assisted draft/);
        assert.match(xml, /Not yet expert-reviewed/);
        assert.match(xml, /<a:t>/);
      }
      const expected = createHash("sha256")
        .update(await readFile("public/juw-department-microscope-1254.jpeg"))
        .digest("hex");
      const media = await Promise.all(
        Object.keys(zip.files)
          .filter((n) => /^ppt\/media\//.test(n) && !zip.files[n].dir)
          .map(async (n) =>
            createHash("sha256")
              .update(await zip.file(n).async("nodebuffer"))
              .digest("hex"),
          ),
      );
      assert(media.includes(expected), "PPTX retains every supplied artwork pixel");
    } else {
      const info = execFileSync("pdfinfo", [path], { encoding: "utf8" });
      assert.match(info, /Pages:\s+20\b/);
      const text = execFileSync("pdftotext", [path, "-"], { encoding: "utf8" });
      for (const pageText of text.split("\f").filter((s) => s.trim())) {
        assert.match(pageText, /Unverified AI-assisted draft/);
        assert.match(pageText, /Not yet expert-reviewed/);
      }
    }
  }
  // Inspect actual rendered body size, not merely a source class.
  await page.getByRole("button", { name: /02\s+content\s+Synthetic visual workload 1$/i }).click();
  report.renderedBodyFontPx = await page
    .locator("[data-slide-stage] .slide-bullets li")
    .first()
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  assert(report.renderedBodyFontPx >= 20);
  await page
    .getByRole("button", { name: /01\s+title\s+Twenty-slide performance fixture/i })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(output, "title-portrait-390.png") });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Generate", exact: true }).waitFor();
  await page.getByRole("button", { name: "Writing Notes", exact: true }).click();
  await page.getByLabel("Notes topic", { exact: true }).fill("Gram staining");
  await page.getByRole("button", { name: "Generate notes", exact: true }).click();
  const link = page.getByRole("link", { name: "Download notes PDF (A4 portrait)", exact: true });
  await link.waitFor({ timeout: 60000 });
  await page.getByRole("article", { name: "Generated educational notes" }).waitFor();
  const event = page.waitForEvent("download");
  await link.click();
  const notePath = join(output, "offline-gram-staining-notes.pdf");
  await (await event).saveAs(notePath);
  const noteInfo = execFileSync("pdfinfo", [notePath], { encoding: "utf8" });
  assert.match(noteInfo, /Page size:\s+595\.2\d* x 841\.8\d* pts \(A4\)/);
  const renderedNotes = join(output, "book-note-pages");
  await mkdir(renderedNotes, { recursive: true });
  execFileSync("pdftoppm", [
    "-scale-to",
    "1280",
    "-png",
    notePath,
    join(renderedNotes, "notes-page"),
  ]);
  execFileSync("python3", ["scripts/check-note-watermark.py", renderedNotes], { stdio: "inherit" });
  const text = execFileSync("pdftotext", [notePath, "-"], { encoding: "utf8" });
  for (const notePage of text.split("\f").filter((s) => s.trim())) {
    assert.match(notePage, /Unverified AI-assisted draft/);
    assert.match(notePage, /Not yet expert-reviewed/);
  }
  assert.match(text, /Staining Microscopic Specimens/);
  assert.match(text, /Download for free/);
  assert.doesNotMatch(text, /PMID: undefined/);
  await page.reload();
  await page.getByRole("button", { name: "Writing Notes", exact: true }).click();
  await page
    .getByRole("link", { name: "Download notes PDF (A4 portrait)", exact: true })
    .waitFor({ timeout: 60000 });
  await page.getByRole("button", { name: "Refresh workspace", exact: true }).click();
  await page.locator("#gen-topic").fill("Gram staining");
  await page.getByLabel("Research approach", { exact: true }).selectOption("standard");
  await page.locator("#gen-count").fill("3");
  await page.getByRole("button", { name: "Generate deck", exact: true }).click();
  await page.getByRole("button", { name: "Open generator", exact: true }).waitFor();
  assert.match(await page.locator("main").innerText(), /Slide 1 of 3/);
  const threeSlides = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PPTX", exact: true }).click();
  const threePath = join(output, "gram-staining-3.pptx");
  await (await threeSlides).saveAs(threePath);
  const threeZip = await JSZip.loadAsync(await readFile(threePath));
  assert.equal(
    Object.keys(threeZip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length,
    3,
  );
  const scientificText = await threeZip.file("ppt/slides/slide2.xml").async("string");
  assert.match(scientificText, /Textbook/);
  assert.match(scientificText, /2016/);
  report.offlineThreeSlideDeck = true;
  report.offlineNotes = true;
  report.savedNotesDownloadAfterReload = true;
  assert.equal(errors.length, 0, errors.join("\n"));
  await page.screenshot({ path: join(output, "offline-notes-download.png") });
  report.passed = true;
  console.log(
    "PASS desktop workflow proxy: twenty-slide native exports, full-resolution artwork, rendered body size, portrait preview and automatic offline notes download.",
  );
} finally {
  await writeFile(join(output, "note20-profile.json"), JSON.stringify(report, null, 2));
  await browser.close();
  await new Promise((r) => server.close(r));
}
