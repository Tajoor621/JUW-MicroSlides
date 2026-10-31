import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
const output = resolve(process.env.JUW_QA_OUTPUT || "qualification-results/notes");
await mkdir(output, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    const rel =
      decodeURIComponent(new URL(req.url, "http://localhost").pathname).replace(
        /^\/JUW-MicroSlides\//,
        "",
      ) || "index.html";
    const file = resolve("dist-pages", rel);
    assert(file.startsWith(resolve("dist-pages") + "/"));
    res.setHeader(
      "content-type",
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
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
try {
  const context = await browser.newContext({ acceptDownloads: true, serviceWorkers: "block" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/JUW-MicroSlides/`);
  await page.getByRole("button", { name: "Writing Notes", exact: true }).click();
  await page.getByLabel("Notes topic", { exact: true }).fill("Conjugation software fixture");
  // Controlled response exercises the real retrieval/generation/export pipeline. It is explicitly not scientific qualification.
  const paragraphs = [
    "A synthetic conjugation fixture is defined as artificial text used to check software source-to-sentence provenance without asserting a biological finding. The synthetic conjugation fixture structure contains separate labelled passages for checking educational note generation in this software test only.",
    "The synthetic conjugation software process preserves a contiguous source passage as an artificial application test rather than a biological explanation. Passage provenance in the synthetic conjugation fixture does not establish scientific validity or independence of the cited claims.",
  ].join("\n\n");
  await page.route("https://www.ebi.ac.uk/europepmc/**", (route) =>
    route.fulfill({
      json: {
        resultList: {
          result: [
            {
              id: "36653393",
              source: "MED",
              title:
                "Real-time visualisation of the intracellular dynamics of conjugative plasmid transfer",
              doi: "10.1038/s41467-023-35978-3",
              pmid: "36653393",
              pubYear: "2023",
              authorString: "Couturier et al.",
              abstractText: paragraphs,
            },
          ],
        },
      },
    }),
  );
  await page.getByRole("button", { name: "Generate notes", exact: true }).click();
  // A successful generation prepares a visible persistent download without another button tap.
  const link = page.getByRole("link", { name: "Download notes PDF (A4 portrait)", exact: true });
  await link.waitFor({ timeout: 60000 });
  const event = page.waitForEvent("download");
  await link.click();
  const file = join(output, "educational-note-software-fixture.pdf");
  await (await event).saveAs(file);
  const bytes = await readFile(file);
  const raw = bytes.toString("latin1");
  assert.match(raw, /\/MediaBox\s*\[0 0 595\.2\d* 841\.8\d*\]/);
  assert.match(raw, /\/ca 0\.06\b/);
  const info = execFileSync("pdfinfo", [file], { encoding: "utf8" });
  assert.match(info, /Page size:\s+595\.2\d* x 841\.8\d* pts \(A4\)/);
  const count = Number(info.match(/Pages:\s+(\d+)/)[1]);
  assert(count > 0 && count <= 12);
  const text = execFileSync("pdftotext", [file, "-"], { encoding: "utf8" });
  const pages = text.split("\f").filter((p) => p.trim());
  assert.equal(pages.length, count);
  for (const [i, p] of pages.entries()) {
    assert.match(p, /Unverified AI-assisted draft/);
    assert.match(p, /Not yet expert-reviewed/);
    assert.match(p, /personal educational use/);
    assert(p.includes(`Page ${i + 1} of ${count}`));
    assert(p.trim().length > 100);
  }
  assert.match(text, /10\.1038\/s41467-023-35978-3/);
  execFileSync("pdftoppm", ["-scale-to", "1280", "-png", file, join(output, "notes-page")]);
  // Check actual rendered crest pixels; a PDF graphics-state entry alone does not prove SVG opacity.
  execFileSync("python3", ["scripts/check-note-watermark.py", output]);
  const saved = await page.getByLabel("Editable notes", { exact: true }).inputValue();
  await page.reload();
  await page.getByRole("button", { name: "Writing Notes", exact: true }).click();
  assert.equal(await page.getByLabel("Editable notes", { exact: true }).inputValue(), saved);
  await page.getByRole("button", { name: "Refresh workspace", exact: true }).click();
  await page
    .getByRole("button", { name: "Inspector", exact: true })
    .click()
    .catch(() => {});
  await page.getByRole("button", { name: "Writing Notes", exact: true }).click();
  assert((await page.getByLabel("Saved educational notes").locator("option").count()) > 1);
  assert.equal(errors.length, 0, errors.join("\n"));
  await writeFile(
    join(output, "notes-qa.json"),
    JSON.stringify(
      {
        passed: true,
        pages: count,
        A4Portrait: true,
        draftLabelEveryPage: true,
        extractableText: true,
        watermarkOpacity: 0.06,
        physicalPhone: "not performed",
        scientificQualification: false,
        fixture:
          "Controlled synthetic text, real bibliographic identifiers; not article quotations",
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS A4 notes generation, source links, page markings, text extraction and local persistence",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
