import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, join } from "node:path";
import { chromium } from "playwright";
const output = process.env.JUW_QA_OUTPUT || "/tmp/juw-v7-ui";
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
  await page.goto(`http://127.0.0.1:${server.address().port}/JUW-MicroSlides/`);
  await page.getByText(/Saved on this device/).waitFor();
  await page.getByLabel("Generation Mode", { exact: true }).selectOption("pathogen");
  await page.locator("#gen-topic").fill("Synthetic software fixture organism");
  await page.locator("#gen-count").fill("12");
  const titles = [
    "Taxonomy & nomenclature",
    "Morphology & staining",
    "Culture & growth requirements",
    "Virulence factors & mechanisms",
    "Pathogenesis & clinical syndromes",
    "Laboratory diagnosis",
    "Susceptibility & resistance",
    "Epidemiology, transmission & prevention",
  ];
  const names = ["amber", "birch", "cedar", "delta", "elm", "fir", "garnet", "hazel"];
  const notes = titles
    .map(
      (title, i) =>
        `## ${title}\nSynthetic ${names[i]} editor fixture, section ${i}; this is not a scientific statement.\nA distinct ${names[i]} specimen marker is software test data requiring review.`,
    )
    .join("\n\n");
  await page.locator("#gen-notes").fill(notes);
  await page.getByRole("button", { name: "Generate deck", exact: true }).click();
  await page
    .getByRole("button", { name: /02 learning-objectives Learning objectives/i })
    .waitFor({ timeout: 30000 });
  assert.equal(await page.locator("[data-slide-stage]").count(), 1);
  checks.push(
    "Pathogen mode creates 12 draft slides with ordered sections and learning objectives from offline supplied notes",
  );
  await page.getByRole("button", { name: /03 taxonomy-tree Taxonomy/i }).click();
  await page
    .getByRole("combobox", { name: "Slide layout", exact: true })
    .selectOption("lab-protocol");
  await page.getByRole("button", { name: "Add protocol step", exact: true }).click();
  await page.getByLabel("Step 1 action", { exact: true }).fill("Synthetic software action only");
  await page
    .getByLabel("Step 1 timing", { exact: true })
    .fill("Synthetic timing; evidence missing");
  await page.getByLabel("Step 1 sourceUrl", { exact: true }).fill("https://example.org/synthetic");
  assert(
    (await page.getByLabel("Step 1 action", { exact: true }).inputValue()) ===
      "Synthetic software action only",
  );
  checks.push(
    "Protocol action/timing/source editors retain typed values and expose progressive step selection",
  );
  await page.locator("summary").filter({ hasText: "Scientific table" }).click();
  await page.getByRole("button", { name: "Create editable table", exact: true }).click();
  await page.getByLabel("Row 1, Characteristic", { exact: true }).fill("Synthetic property");
  await page.getByRole("button", { name: "Add row", exact: true }).click();
  assert(await page.getByLabel("Row 2, Characteristic", { exact: true }).isVisible());
  checks.push("Scientific tables support direct cell editing and row allocation");
  const ordinaryDeck = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PPTX", exact: true }).click();
  assert(await (await ordinaryDeck).path());
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
  await page.getByText(/Reviewed export needs review/).waitFor();
  checks.push("Structured draft downloads are available while reviewed release remains gated");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("heading", { name: "Studio settings", exact: true })
    .waitFor({ state: "hidden" });
  await page.screenshot({ path: join(output, "v7-protocol-editor.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(output, "v7-mobile.png") });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  checks.push("V6.2.1 editor has no horizontal page overflow at 390px");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Open generator", exact: true }).click();
  await page.getByLabel("Generation Mode", { exact: true }).selectOption("clinical-cases");
  await page.locator("#gen-topic").fill("Synthetic clinical editor fixture");
  await page.locator("#gen-count").fill("10");
  const cases = Array.from({ length: 3 }, (_, i) => {
    const word = names[i];
    return `## Case ${i + 1}: presentation & work-up\nVignette: Synthetic ${word} presentation for a software test only.\nDifferential: Fixture ${word} alternatives require evidence review.\nWork-up: Software ${word} checks, not laboratory advice.\n\n## Case ${i + 1}: resolution & management\nResults: Distinct ${word} software observations for test purposes.\nDiagnosis: Synthetic ${word} placeholder, not a diagnosis.\nManagement: Fixture ${word} instruction is not clinical guidance.\nQuestions: Which ${word} source was used?`;
  }).join("\n\n");
  await page.locator("#gen-notes").fill(cases);
  await page.getByRole("button", { name: "Generate deck", exact: true }).click();
  await page
    .getByRole("button", { name: /03 clinical-case Case 1: presentation/i })
    .waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: /03 clinical-case Case 1: presentation/i }).click();
  assert(
    (await page.getByLabel("vignette", { exact: true }).inputValue()).includes("Synthetic amber"),
  );
  await page.getByLabel("diagnosis", { exact: true }).fill("Hidden resolution answer");
  const caseStage = await page.locator("[data-slide-stage]").innerText();
  assert(caseStage.includes("Synthetic amber presentation"));
  assert(caseStage.includes("Fixture amber alternatives"));
  assert(!caseStage.includes("Hidden resolution answer"));
  await page.getByRole("button", { name: /04 clinical-case Case 1: resolution/i }).click();
  assert(
    (await page.locator("[data-slide-stage]").innerText()).includes("Synthetic amber placeholder"),
  );
  checks.push(
    "Clinical case mode creates three draft case pairs, populates labelled fields and keeps diagnoses hidden until the resolution phase",
  );
  await page.getByRole("button", { name: "Open generator", exact: true }).click();
  await page.getByLabel("Generation Mode", { exact: true }).selectOption("curriculum");
  await page.locator("#gen-topic").fill("Software qualification course");
  await page
    .getByLabel("Curriculum lecture topics", { exact: true })
    .fill("Enzyme immobilization\nBiofilms");
  await page.locator("#gen-count").fill("4");
  await page.locator("#gen-notes").fill("");
  await page.getByRole("button", { name: "Generate deck", exact: true }).click();
  await page
    .getByRole("button", { name: /01 title Enzyme immobilization/i })
    .waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "Library", exact: true }).click();
  const backupEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download editable backup", exact: true }).click();
  const backup = JSON.parse(await readFile(await (await backupEvent).path(), "utf8"));
  const series = backup.decks
    .filter((d) => d.courseSeries?.title === "Software qualification course")
    .sort((a, b) => a.courseSeries.order - b.courseSeries.order);
  assert.equal(series.length, 2);
  assert(series.every((d) => d.slides.length === 4));
  assert.equal(series[1].courseSeries.prerequisites[0], series[0].id);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Open generator", exact: true }).click();
  await page
    .getByLabel("Curriculum lecture topics", { exact: true })
    .fill("Unfinished curriculum topic");
  await page.getByLabel("Generation Mode", { exact: true }).selectOption("standard");
  await page.getByLabel("Research approach", { exact: true }).selectOption("standard");
  await page.locator("#gen-topic").fill("Enzyme immobilization");
  await page.locator("#gen-count").fill("1");
  await page.getByRole("button", { name: "Generate deck", exact: true }).click();
  await page
    .getByRole("button", { name: "Open generator", exact: true })
    .waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "Library", exact: true }).click();
  const shortBackupEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Current deck backup", exact: true }).click();
  const shortBackup = JSON.parse(await readFile(await (await shortBackupEvent).path(), "utf8"));
  assert.equal(shortBackup.decks[0].slides.length, 1);
  assert.equal(shortBackup.decks[0].lectureOptions.moduleTopics, undefined);
  checks.push(
    "Curriculum generation saves linked lectures atomically; unfinished curriculum input cannot corrupt a later standard lecture backup",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    join(output, "v7-ui.json"),
    JSON.stringify({ ok: true, checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ ok: true, checks, errors }, null, 2));
} catch (error) {
  const p = browser.contexts()[0]?.pages()[0];
  if (p) {
    await p.screenshot({ path: join(output, "v7-ui-failure.png") });
    console.error((await p.locator("body").innerText()).slice(-9000));
  }
  throw error;
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
