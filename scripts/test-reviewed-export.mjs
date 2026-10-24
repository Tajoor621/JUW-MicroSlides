import assert from "node:assert/strict";
import { createServer as httpServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, join } from "node:path";
import { chromium } from "playwright";
import JSZip from "jszip";
const root = process.cwd();
const output = process.env.JUW_QA_OUTPUT || "/workspace/screenshots";
await mkdir(output, { recursive: true });
const fixture = JSON.parse(await readFile("scripts/fixtures/export-draft.json", "utf8"));
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};
const server = httpServer(async (req, res) => {
  try {
    const p =
      decodeURIComponent(new URL(req.url, "http://localhost").pathname).replace(
        /^\/JUW-MicroSlides\//,
        "",
      ) || "index.html";
    res.setHeader("Content-Type", types[extname(p)] || "application/octet-stream");
    res.end(await readFile(resolve(root, "dist-pages", p)));
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
try {
  const page = await browser.newPage({ acceptDownloads: true, serviceWorkers: "block" });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/JUW-MicroSlides/`);
  assert.equal(await page.getByRole("button", { name: "Review", exact: true }).count(), 0);
  for (const [i, src] of [
    "data:image/png;base64,bm90LWFuLWltYWdl",
    "data:image/svg+xml,%3Csvg%3Ebroken",
    "data:image/svg+xml," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60" viewBox="0 0 80 60"><rect width="80" height="60" fill="#123456"/><text x="5" y="30">Vector QA</text></svg>',
      ),
  ].entries()) {
    const data = structuredClone(fixture);
    data.decks[0].id = `editable-export-${i}`;
    data.decks[0].slides[1].media = [
      {
        id: "qa-art",
        kind: "diagram",
        title: "Synthetic SVG fixture",
        src,
        credit: "Software QA",
        source: "https://example.org/fixture",
        license: "CC0",
        tags: ["schematic"],
        keywords: [],
      },
    ];
    await page.getByRole("button", { name: "Library", exact: true }).click();
    await page.getByLabel("Restore backup", { exact: true }).setInputFiles({
      name: "fixture.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(data)),
    });
    await page.getByRole("button", { name: "Close", exact: true }).click();
    const pptxEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export PPTX", exact: true }).click();
    const bytes = await readFile(await (await pptxEvent).path());
    const zip = await JSZip.loadAsync(bytes);
    const slides = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    assert.equal(slides.length, 2);
    const text = (await Promise.all(slides.map((n) => zip.file(n).async("string")))).join("\n");
    assert.match(text, /<a:t>/);
    assert.match(
      await zip.file("ppt/notesSlides/notesSlide2.xml").async("string"),
      /Full editable slide text/,
    );
    if (i < 2) assert.match(text, /Original image unavailable/);
    else {
      assert(
        Object.keys(zip.files).some((n) => n.endsWith(".svg")),
        "SVG stays vector",
      );
      const pngs = await Promise.all(
        Object.keys(zip.files)
          .filter((n) => /^ppt\/media\/.*\.png$/.test(n))
          .map((n) => zip.file(n).async("nodebuffer")),
      );
      assert(
        pngs.some((p) => p.readUInt32BE(16) >= 1000),
        "High resolution SVG fallback is available to mobile viewers",
      );
    }
    const pdfEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export PDF", exact: true }).click();
    const pdf = await readFile(await (await pdfEvent).path());
    assert.match(pdf.toString("latin1"), /\/Count\s+2\b/);
    await page.getByRole("link", { name: "Download PDF", exact: true }).waitFor();
    assert.equal(
      await page.getByRole("alert", { name: "Export readiness", exact: true }).count(),
      0,
    );
    console.log(`PASS editable PPTX and vector PDF without review, artwork case ${i}`);
  }
  await page.getByRole("button", { name: "Writing Notes", exact: true }).click();
  await page.getByLabel("Notes topic", { exact: true }).fill("Synthetic notes fixture");
  await page.getByText("Optional source material / offline notes", { exact: true }).click();
  const supplied = Array.from(
    { length: 6 },
    (_, i) =>
      `## Synthetic concept ${i + 1}\nSoftware fixture ${["amber", "birch", "cobalt", "delta", "elm", "fern"][i]} distinguishes study-note section ${i + 1}. This supplied material tests note generation without making a scientific claim.`,
  ).join("\n\n");
  await page.getByLabel("Notes source material", { exact: true }).fill(supplied);
  await page.getByRole("button", { name: "Generate notes", exact: true }).click();
  await page
    .getByText("Notes ready. Edit below; your slide deck is unchanged.", { exact: true })
    .waitFor();
  assert.match(
    await page.getByLabel("Editable notes", { exact: true }).inputValue(),
    /Synthetic notes fixture/,
  );
  await page
    .getByLabel("Editable notes", { exact: true })
    .fill("# Edited study notes\nRetained after reload without changing slides.");
  const mdEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download notes (.md)", exact: true }).click();
  assert.match(await readFile(await (await mdEvent).path(), "utf8"), /Retained after reload/);
  await page
    .getByText(/Saved on this device/)
    .first()
    .waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Writing Notes", exact: true }).click();
  assert.match(
    await page.getByLabel("Editable notes", { exact: true }).inputValue(),
    /Retained after reload/,
  );
  assert.equal(
    await page.getByRole("textbox", { name: "Lecture topic", exact: true }).inputValue(),
    fixture.decks[0].slides[0].title,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Inspector", exact: true }).click();
  await page.getByRole("button", { name: "Writing Notes", exact: true }).click();
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2),
    false,
  );
  await page.screenshot({ path: join(output, "writing-notes-mobile.png") });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Refresh workspace", exact: true }).click();
  await page
    .getByText("Fresh workspace. Saved decks remain in Library.", { exact: true })
    .first()
    .waitFor();
  assert.equal(await page.locator("#gen-topic").inputValue(), "");
  assert.equal(await page.locator("[data-slide-stage]").count(), 0);
  await page.reload();
  await page.locator("#gen-topic").waitFor();
  assert.equal(await page.locator("[data-slide-stage]").count(), 0);
  // A refresh during a pending source search must cancel it without restoring a stale topic.
  await page.route("https://www.ebi.ac.uk/europepmc/**", async (route) => {
    await new Promise((r) => setTimeout(r, 500));
    try {
      await route.fulfill({ json: { resultList: { result: [] } } });
    } catch {
      /* The reset intentionally aborts this request. */
    }
  });
  await page.route("https://eutils.ncbi.nlm.nih.gov/**", (route) =>
    route.fulfill({ json: { esearchresult: { idlist: [] } } }),
  );
  await page.locator("#gen-topic").fill("Synthetic reset cancellation topic");
  await page.getByRole("button", { name: "Generate deck", exact: true }).click();
  await page.getByRole("button", { name: "Cancel generation", exact: true }).waitFor();
  await page.getByRole("button", { name: "Refresh workspace", exact: true }).click();
  await page
    .getByText("Fresh workspace. Saved decks remain in Library.", { exact: true })
    .first()
    .waitFor();
  await page.getByRole("button", { name: "Generate deck", exact: true }).waitFor();
  assert.equal(await page.locator("#gen-topic").inputValue(), "");
  assert.equal(await page.getByRole("alert").filter({ hasText: "Generation stopped:" }).count(), 0);
  assert.equal(await page.locator("[data-slide-stage]").count(), 0);
  // Reproduce the owner's Samsung desktop-width header path after Refresh.
  await page.setViewportSize({ width: 1080, height: 900 });
  const headerTopic = page.getByRole("textbox", { name: "Lecture topic", exact: true });
  await headerTopic.pressSequentially("Bacterial genome architecture");
  assert.equal(await headerTopic.inputValue(), "Bacterial genome architecture");
  await headerTopic.press("Enter");
  assert.equal(await page.locator("#gen-topic").inputValue(), "Bacterial genome architecture");
  await page.getByLabel("Research approach", { exact: true }).selectOption("standard");
  await page.locator("#gen-count").fill("6");
  await page.getByRole("button", { name: "Generate deck", exact: true }).click();
  await page.getByRole("button", { name: "Open generator", exact: true }).waitFor();
  await page.locator("[data-slide-stage]").waitFor({ state: "visible" });
  assert.match(
    await page.locator("[data-slide-stage]").innerText(),
    /BACTERIAL GENOME ARCHITECTURE/i,
  );
  assert.match(await page.locator("main").innerText(), /Slide 1 of 6/);
  const visibleDeck = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PPTX", exact: true }).click();
  const visibleZip = await JSZip.loadAsync(await readFile(await (await visibleDeck).path()));
  assert.equal(
    Object.keys(visibleZip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length,
    6,
  );
  await page.reload();
  await headerTopic.waitFor();
  assert.equal(await headerTopic.inputValue(), "Bacterial genome architecture");
  await page.locator("[data-slide-stage]").waitFor({ state: "visible" });
  // The narrow-screen Generate modal must also display its completed deck after reset.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Refresh workspace", exact: true }).click();
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  const mobileGenerator = page.getByRole("dialog", {
    name: "Generate a scientific deck",
    exact: true,
  });
  await mobileGenerator.getByRole("textbox", { name: "Topic", exact: true }).fill("Gram staining");
  await mobileGenerator.getByLabel("Research approach", { exact: true }).selectOption("standard");
  await mobileGenerator.getByRole("spinbutton", { name: "Slides (1–50)", exact: true }).fill("6");
  await mobileGenerator.getByRole("button", { name: "Generate deck", exact: true }).click();
  await mobileGenerator.waitFor({ state: "hidden" });
  await page.locator("[data-slide-stage]").waitFor({ state: "visible" });
  assert.match(await page.locator("[data-slide-stage]").innerText(), /GRAM STAINING/i);
  assert.match(await page.locator("main").innerText(), /Slide 1 of 6/);
  await page.getByRole("button", { name: "Slides", exact: true }).click();
  const secondSlide = page.getByRole("button", { name: /^02 / });
  await secondSlide.click();
  assert.match(await page.locator("main").innerText(), /Slide 2 of 6/);
  await page.screenshot({ path: join(output, "refresh-mobile-generated-slides.png") });
  console.log(
    "PASS header typing, shared request, six visible slides and PPTX after Refresh; narrow modal generation selects its new deck",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    join(output, "editable-export-notes.json"),
    JSON.stringify(
      {
        ok: true,
        checks: [
          "Editable vector PPTX/PDF with broken PNG/SVG placeholders",
          "4x SVG fallback and native slide text",
          "Independent generated editable notes and Markdown persistence",
          "Empty refresh across reload preserves Library",
          "Refresh cancels stale generation",
        ],
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS notes generation, edits, downloads, persistence, mobile layout and fresh-workspace cancellation",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
