import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, join } from "node:path";
import { chromium } from "playwright";
const output = process.env.JUW_QA_OUTPUT || "/workspace/screenshots";
await mkdir(output, { recursive: true });
const root = resolve("dist-pages"),
  types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
  };
const server = createServer(async (req, res) => {
  try {
    const relative =
      new URL(req.url, "http://localhost").pathname.replace(/^\/JUW-MicroSlides\//, "") ||
      "index.html";
    const file = resolve(root, relative);
    if (!file.startsWith(root + "/")) throw Error();
    res.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
    res.end(await readFile(file));
  } catch {
    res.statusCode = 404;
    res.end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  executablePath: process.env.JUW_CHROMIUM,
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
  checks = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  let available = false,
    requests = 0;
  const topic = "Bacterial quorum signalling";
  const ids = Array.from({ length: 25 }, (_, i) => String(920100 + i));
  const xml = `<PubmedArticleSet>${ids.map((id, i) => `<PubmedArticle><MedlineCitation><PMID>${id}</PMID><Article><ArticleTitle>${topic} synthetic software dataset ${i}</ArticleTitle><Abstract><AbstractText>${topic} was investigated in synthetic software dataset ${i} using a defined experimental comparison. The researchers in dataset ${i} recorded a condition-specific response using controlled measurements. The reported ${topic} findings in dataset ${i} apply only to this synthetic software fixture. Authors in dataset ${i} noted that further independent observations were required before generalization.</AbstractText></Abstract><Journal><Title>Software test fixture</Title><JournalIssue><PubDate><Year>2026</Year></PubDate></JournalIssue></Journal></Article></MedlineCitation></PubmedArticle>`).join("")}</PubmedArticleSet>`;
  await context.route("https://www.ebi.ac.uk/europepmc/**", (route) => {
    requests++;
    return route.fulfill({ json: { resultList: { result: [] } } });
  });
  await context.route("https://eutils.ncbi.nlm.nih.gov/**", (route) => {
    requests++;
    return route.request().url().includes("esearch.fcgi")
      ? route.fulfill({ json: { esearchresult: { idlist: available ? ids : [] } } })
      : route.fulfill({ contentType: "application/xml", body: xml });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/JUW-MicroSlides/`);
  await page
    .getByLabel("Current deck", { exact: true })
    .getByText("Example deck:", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "MRSA virulence", exact: true }).click();
  assert.equal(requests, 0, "Topic chips must not start generation unexpectedly");
  assert.equal(await page.locator("#gen-topic").inputValue(), "MRSA virulence");
  const syllabus =
    "Genome architecture in bacteria, archaea and fungi. Differences between prokaryotic and eukaryotic microbial genomes. DNA packaging in microbes (nucleoid and chromatin). Organization of bacterial chromosome";
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#gen-topic").fill(syllabus);
  await page.locator("#gen-count").fill("24");
  await page.getByRole("button", { name: "Generate deck", exact: true }).click();
  const failure = page.getByRole("alert").filter({ hasText: "Generation stopped:" });
  await failure.waitFor({ timeout: 30000 });
  assert.match(await failure.innerText(), /Genome architecture/);
  assert.match(await failure.innerText(), /24 requested slides/);
  assert(
    (await failure.boundingBox()).height < 350,
    "Long-topic recovery alert must leave mobile controls reachable",
  );
  await failure.getByText("Request and recovery details", { exact: true }).click();
  assert.match(await failure.innerText(), /24-slide deck is not complete yet/);
  assert(!/23-slide deck is not complete yet/.test(await failure.innerText()));
  assert.match(await failure.innerText(), /Still displaying “Enzyme Immobilization”/);
  assert.equal(await page.getByLabel("Slide layout", { exact: true }).inputValue(), "title");
  checks.push(
    "Unavailable sources keep the saved example and show the attempted topic in a persistent inline recovery alert",
  );
  available = true;
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator("#gen-count").fill("23");
  await page.locator("#gen-topic").fill(topic);
  await page.getByRole("button", { name: "Generate deck", exact: true }).click();
  await page
    .getByRole("button", { name: "Open generator", exact: true })
    .waitFor({ timeout: 30000 });
  assert.equal(await failure.count(), 0);
  assert.equal(
    await page.getByRole("textbox", { name: "Lecture topic", exact: true }).inputValue(),
    topic,
  );
  await page.getByRole("button", { name: "Gram", exact: true }).click();
  assert.equal(await page.locator("[data-slide-stage]").getAttribute("data-slide-theme"), "gram");
  await page.getByRole("button", { name: "Library", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Current deck backup", exact: true }).click();
  const backup = JSON.parse(await readFile(await (await download).path(), "utf8"));
  assert.equal(backup.decks[0].slides.length, 23);
  assert(backup.decks[0].slides.every((s) => s.theme === "gram"));
  assert(backup.decks[0].slides.filter((s) => s.citations.length).length >= 20);
  assert(backup.decks[0].slides.every((s) => s.media.length === 0));
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByLabel("Theme applies to", { exact: true }).selectOption("slide");
  await page.getByLabel("Slide theme", { exact: true }).selectOption("fluorescence");
  assert.equal(
    await page.locator("[data-slide-stage]").getAttribute("data-slide-theme"),
    "fluorescence",
  );
  await page.getByRole("button", { name: /02 learning-objectives Learning objectives/ }).click();
  assert.equal(await page.locator("[data-slide-stage]").getAttribute("data-slide-theme"), "gram");
  const draftDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PPTX", exact: true }).click();
  assert(await (await draftDownload).path());
  const pdfDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  const pdfBytes = await readFile(await (await pdfDownload).path());
  assert.match(
    pdfBytes.toString("latin1"),
    /\/Count\s+23\b/,
    "Ordinary PDF retains all 23 slides despite review tasks",
  );
  if (
    (await page
      .getByText("Reviewed release options", { exact: true })
      .locator("..")
      .getAttribute("open")) === null
  )
    await page.getByText("Reviewed release options", { exact: true }).click();
  await page
    .getByRole("alert", { name: "Export readiness" })
    .getByRole("button", { name: "Export reviewed PPTX", exact: true })
    .click();
  await page
    .getByText(/Reviewed export needs review/)
    .first()
    .waitFor({ timeout: 10000 });
  checks.push(
    "PubMed fallback generates exactly 23 slides; ordinary PPTX/PDF download while reviewed export remains gated",
  );
  await page.getByText("Reviewed release options", { exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  const blockers = page.getByRole("alert", { name: "Export readiness" });
  assert((await blockers.boundingBox()).height < 350);
  await page.screenshot({ path: join(output, "topic-recovery-mobile.png") });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: join(output, "topic-recovery-desktop.png") });
  await page.getByRole("button", { name: "Dismiss export findings", exact: true }).click();
  const repeated =
    "Bacterial quorum signalling in dataset 51 is a deliberately repeated software fixture point.";
  await page.getByRole("button", { name: /^03 content / }).click();
  await page.getByRole("textbox", { name: "Bullets (one per line)", exact: true }).fill(repeated);
  await page.getByRole("button", { name: /^04 content / }).click();
  await page
    .getByRole("textbox", { name: "Bullets (one per line)", exact: true })
    .fill(
      repeated + "\nA distinct synthetic observation in dataset 52 remains after explicit removal.",
    );
  const correctedDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PPTX", exact: true }).click();
  assert(await (await correctedDownload).path());
  assert.equal(
    await page.getByRole("textbox", { name: "Bullets (one per line)", exact: true }).inputValue(),
    repeated + "\nA distinct synthetic observation in dataset 52 remains after explicit removal.",
    "Automatic cleanup must preserve identical wording when source identities differ",
  );
  if (
    (await page
      .getByText("Reviewed release options", { exact: true })
      .locator("..")
      .getAttribute("open")) === null
  )
    await page.getByText("Reviewed release options", { exact: true }).click();
  await page
    .getByRole("alert", { name: "Export readiness" })
    .getByRole("button", { name: "Export reviewed PPTX", exact: true })
    .click();
  await page.getByRole("button", { name: "Review slide 4", exact: true }).click();
  await page.getByText("Optional overlap comparison", { exact: true }).click();
  await page.getByRole("region", { name: "Overlapping teaching points" }).waitFor();
  await page
    .getByRole("button", { name: "Remove exact repeated point from slide 4", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  assert.equal(
    await page.getByRole("textbox", { name: "Bullets (one per line)", exact: true }).inputValue(),
    "A distinct synthetic observation in dataset 52 remains after explicit removal.",
  );
  assert.match(await page.locator("body").innerText(), /Slide 4 of 23/);
  await page.getByRole("textbox", { name: "Bullets (one per line)", exact: true }).blur();
  await page.keyboard.press("Control+z");
  assert.match(
    await page.getByRole("textbox", { name: "Bullets (one per line)", exact: true }).inputValue(),
    /deliberately repeated/,
  );
  checks.push(
    "Compact mobile failures preserve full details and requested count; export repair opens overlaps, removes only an explicitly chosen exact point, preserves count and supports Undo",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    join(output, "topic-recovery.json"),
    JSON.stringify({ ok: true, checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ ok: true, checks, errors }, null, 2));
} catch (error) {
  const page = browser.contexts()[0]?.pages()[0];
  if (page) {
    await page.screenshot({ path: join(output, "topic-recovery-failure.png") });
    console.error((await page.locator("body").innerText()).slice(-9000));
  }
  throw error;
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
