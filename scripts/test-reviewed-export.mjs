import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer as httpServer } from "node:http";
import { extname, resolve, join } from "node:path";
import { tmpdir } from "node:os";
const root = process.cwd();
const output = process.env.JUW_QA_OUTPUT || join(tmpdir(), "juw-reviewed-export");
await mkdir(output, { recursive: true });
const require = createRequire(root + "/package.json");
const { createServer } = await import(require.resolve("vite"));
const { chromium } = require("playwright");
const JSZip = require("jszip");
const vite = await createServer({
  root,
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true },
  resolve: { alias: { "@": root + "/src" } },
  logLevel: "error",
});
let d, fixtures;
try {
  const { teachingFixture } = await import("./teaching-fixture.mjs");
  const { deck, slide: s, review } = await teachingFixture(vite);
  d = deck;
  s.teaching.diagram = undefined;
  s.media = [
    {
      id: "audit-corrupt-image",
      kind: "photo",
      title: "Synthetic software figure",
      src: "data:image/png;base64,aW52YWxpZA==",
      credit: "Synthetic software fixture",
      source: "https://example.org/figure",
      license: "CC0",
      keywords: [],
    },
  ];
  review();
  const { teachingReady } = await vite.ssrLoadModule("/src/lib/teaching-readiness.ts");
  if (!teachingReady(d)) throw Error("Synthetic fixture must clear the teaching gate");
  const invalidPng = structuredClone(d);
  s.media[0].src =
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>',
    );
  review();
  const valid = structuredClone(d);
  s.media[0].src = "data:image/svg+xml;base64,aW52YWxpZA==";
  review();
  const invalidSvg = structuredClone(d);
  s.media[0] = valid.slides[0].media[0];
  s.teaching.diagram = "adsorption";
  review();
  fixtures = [invalidPng, invalidSvg, valid, structuredClone(d)];
  s.layout = "lab-protocol";
  s.protocol = {
    materials: ["Synthetic fixture material"],
    steps: [
      {
        action: "Synthetic software action only",
        timing: "controlled test condition",
        sourceUrl: d.sourceDocuments[0].url,
      },
    ],
    interpretation: "Synthetic fixture interpretation",
    qc: "Synthetic quality-control text",
    biosafety: "Synthetic PPE text; not laboratory advice",
    troubleshooting: "Synthetic troubleshooting text",
  };
  review();
  if (!teachingReady(d)) throw Error("Protocol fixture must clear the software gate");
  fixtures.push(structuredClone(d));
  d.exportTypography = "portable";
  review();
  if (!teachingReady(d)) throw Error("Portable fixture must clear the software gate");
  fixtures.push(structuredClone(d));
} finally {
  await vite.close();
}
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
  for (let i = 0; i < fixtures.length; i++) {
    const page = await browser.newPage({ acceptDownloads: true, serviceWorkers: "block" });
    await page.goto(`http://127.0.0.1:${server.address().port}/JUW-MicroSlides/`);
    await page.getByRole("button", { name: "Library", exact: true }).click();
    await page.getByLabel("Restore backup", { exact: true }).setInputFiles({
      name: "audit.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({ format: "juw-microslides", schemaVersion: 1, decks: [fixtures[i]] }),
      ),
    });
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.locator("summary").filter({ hasText: "Lecture workspace" }).click();
    const button = page.getByRole("button", { name: "Export reviewed PPTX", exact: true });
    if (await button.isDisabled()) throw Error("Fixture must reach runtime image validation");
    if (i < 2) {
      let downloads = 0;
      page.on("download", () => downloads++);
      await button.click();
      await page.getByText(/a required image could not be decoded/).waitFor();
      if (downloads) throw Error("Corrupt image produced a reviewed download");
      console.log(
        "PASS corrupt " + (i ? "SVG" : "PNG") + " blocks reviewed download and reports the problem",
      );
    } else {
      const event = page.waitForEvent("download");
      await button.click();
      const download = await event;
      const zip = await JSZip.loadAsync(await readFile(await download.path()));
      const xml = await zip.file("ppt/slides/slide1.xml").async("string");
      if (xml.includes("Original image unavailable"))
        throw Error("Valid fixture exported a placeholder");
      console.log("PASS valid reviewed image still exports a PowerPoint package");
      if (i === 5) {
        if (!(await page.locator('[data-typography="portable"]').count()))
          throw Error("Backup must restore portable preview typography");
        const fonts = Object.keys(zip.files).filter((p) => p.endsWith(".fntdata"));
        if (fonts.length !== 2 || !xml.includes('typeface="DejaVu Sans"'))
          throw Error("Portable PowerPoint must contain regular and bold fonts with editable text");
        for (const path of fonts) {
          const data = await zip.file(path).async("nodebuffer");
          if (data.readUInt16LE(34) !== 0x504c || data.readUInt32LE(0) !== data.length)
            throw Error("Portable font part must have a valid EOT header");
        }
        await writeFile(
          join(output, "juw-portable-fonts.pptx"),
          await readFile(await download.path()),
        );
        const portablePackEvent = page.waitForEvent("download");
        await page.getByRole("button", { name: "Export teaching pack", exact: true }).click();
        const portablePack = await JSZip.loadAsync(
          await readFile(await (await portablePackEvent).path()),
        );
        const packedSlides = await JSZip.loadAsync(
          await portablePack.file("slides.pptx").async("uint8array"),
        );
        if (
          !packedSlides.file("ppt/fonts/juw-dejavu-bold.fntdata") ||
          !portablePack.file("fonts-LICENSE.txt")
        )
          throw Error("Portable teaching packs must retain embedded fonts and licence");
        await page.getByLabel("Lecture typography", { exact: true }).selectOption("original");
        if (!(await button.isDisabled()))
          throw Error("Typography changes require fresh layout verification");
        console.log(
          "PASS restored portable typography, embedded EOT PowerPoint and verification invalidation",
        );
      }
      if (i === 4) {
        await page.locator("summary").filter({ hasText: "Handouts & accessible exports" }).click();
        for (const [label, filename] of [
          ["Student handout PDF", "v7-student-handout.pdf"],
          ["Lab protocol card PDF", "v7-lab-protocol-card.pdf"],
          ["High-contrast accessible HTML", "v7-accessible.html"],
        ]) {
          const event = page.waitForEvent("download");
          await page.getByRole("button", { name: label, exact: true }).click();
          const bytes = await readFile(await (await event).path());
          await writeFile(join(output, filename), bytes);
          if (filename.endsWith(".pdf") && !bytes.subarray(0, 5).equals(Buffer.from("%PDF-")))
            throw Error("Expected actual PDF download");
          if (
            filename.endsWith(".html") &&
            (!bytes.includes(Buffer.from("Synthetic software action only")) ||
              !bytes.includes(Buffer.from("Synthetic quality-control text")))
          )
            throw Error("Accessible export lost protocol fields");
        }
        console.log(
          "PASS V6.2.1 structured protocol PPTX, student handout PDF, single-page protocol card and accessible HTML downloads",
        );
      }
      if (i === 3) {
        if (!xml.includes('prst="ellipse"') || !xml.includes("Reversible surface interactions"))
          throw Error("Schematic primitives must remain editable shapes and text");
        const pdfEvent = page.waitForEvent("download");
        await page.getByRole("button", { name: "Export reviewed PDF", exact: true }).click();
        const pdf = await pdfEvent,
          pdfBytes = await readFile(await pdf.path());
        if (
          !pdfBytes.subarray(0, 5).equals(Buffer.from("%PDF-")) ||
          !pdfBytes.includes(Buffer.from("/FontFile2"))
        )
          throw Error("PDF must contain embedded TrueType fonts");

        await writeFile(join(output, "juw-teaching-fixture.pdf"), pdfBytes);
        const packEvent = page.waitForEvent("download");
        await page.getByRole("button", { name: "Export teaching pack", exact: true }).click();
        const pack = await JSZip.loadAsync(await readFile(await (await packEvent).path()));
        for (const name of [
          "slides.pptx",
          "slides.pdf",
          "references.txt",
          "speaker-notes.md",
          "manifest.json",
          "accessible-transcript.html",
          "editable-diagrams/slide-1.svg",
          "fonts-LICENSE.txt",
        ])
          if (!pack.file(name)) throw Error("Teaching pack missing " + name);
        const svg = await pack.file("editable-diagrams/slide-1.svg").async("string");
        if (!svg.includes('xmlns="http://www.w3.org/2000/svg"'))
          throw Error("Editable SVG is missing its namespace");
        await page.getByRole("button", { name: "Present", exact: true }).click();
        await page.getByLabel("Reveal one point at a time").check();
        const point = page.locator("[data-teaching-content] li").last();
        await point.waitFor({ state: "hidden" });
        await page.keyboard.press("ArrowRight");
        await point.waitFor({ state: "visible" });
        await page.keyboard.press("Escape");
        const definition = page.getByLabel("Core definition", { exact: true }),
          originalDefinition = await definition.inputValue();
        await definition.fill("x".repeat(3001));
        if ((await definition.inputValue()) !== originalDefinition)
          throw Error("Oversized paste must preserve the valid authoring field");
        await page
          .getByLabel("Core definition", { exact: true })
          .fill("Changed scientific definition requiring fresh review.");
        if (!(await button.isDisabled()))
          throw Error("Editing teaching content must invalidate reviewed export");
        console.log(
          "PASS editable schematic shapes, embedded-font PDF, complete teaching pack, presentation reveal and edit invalidation",
        );
      }
    }
    await page.close();
  }
  const page = await browser.newPage({ acceptDownloads: true, serviceWorkers: "block" });
  const unstamped = structuredClone(fixtures[3]);
  delete unstamped.teachingVerification;
  await page.goto(`http://127.0.0.1:${server.address().port}/JUW-MicroSlides/`);
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await page.getByLabel("Restore backup", { exact: true }).setInputFiles({
    name: "unstamped.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ format: "juw-microslides", schemaVersion: 1, decks: [unstamped] }),
    ),
  });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.locator("summary").filter({ hasText: "Lecture workspace" }).click();
  const exportButton = page.getByRole("button", { name: "Export reviewed PPTX", exact: true });
  if (!(await exportButton.isDisabled()))
    throw Error("Prepared-by metadata must not impersonate final verification");
  await page.getByText("Final instructor verification", { exact: true }).click();
  await page
    .getByLabel("Verifying instructor name", { exact: true })
    .fill("Synthetic QA instructor");
  await page.getByRole("button", { name: "Record instructor verification", exact: true }).click();
  await page
    .getByText("Instructor verification recorded after image and layout preflight.", {
      exact: true,
    })
    .waitFor();
  if (await exportButton.isDisabled())
    throw Error("Valid named verification must unlock teaching export");
  await page.getByLabel("Lecture typography", { exact: true }).selectOption("portable");
  if (!(await exportButton.isDisabled()))
    throw Error("Portable typography requires re-verification");
  await page.getByRole("button", { name: "Record instructor verification", exact: true }).click();
  await page.waitForFunction(
    () =>
      ![...document.querySelectorAll("button")].find(
        (b) => b.textContent === "Export reviewed PPTX",
      )?.disabled,
  );
  // Fault injection must reach the network rather than the app's warm offline cache.
  let missingFontRequests = 0;
  await page.route("**/fonts/DejaVuSans-Bold.ttf", (route) => {
    missingFontRequests++;
    return route.fulfill({ status: 404, body: "Missing test asset" });
  });
  let missingFontDownloads = 0;
  const countMissingFontDownloads = () => missingFontDownloads++;
  page.on("download", countMissingFontDownloads);
  await exportButton.click();
  await page.getByText(/Portable fonts are unavailable/).waitFor();
  if (!missingFontRequests)
    throw Error("Missing-font fault injection did not reach the font request");
  if (missingFontDownloads) throw Error("Missing portable font must block download");
  page.off("download", countMissingFontDownloads);
  await page.unroute("**/fonts/DejaVuSans-Bold.ttf");
  console.log("PASS named portable re-verification and unavailable-font download block");
  await page.getByLabel("Projector contrast", { exact: true }).selectOption("dark");
  if (!(await exportButton.isDisabled()))
    throw Error("Contrast changes must invalidate final layout verification");
  await page.getByRole("button", { name: "Record instructor verification", exact: true }).click();
  await page.waitForFunction(
    () =>
      ![...document.querySelectorAll("button")].find(
        (b) => b.textContent === "Export reviewed PPTX",
      )?.disabled,
  );
  const darkPdfEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export reviewed PDF", exact: true }).click();
  await writeFile(
    join(output, "juw-teaching-dark.pdf"),
    await readFile(await (await darkPdfEvent).path()),
  );
  await page.getByRole("button", { name: "First Deck setup", exact: true }).click();
  await page.getByRole("button", { name: "Guided First Deck setup", exact: true }).click();
  await page.getByLabel("Wizard topic", { exact: true }).fill("Enzyme immobilization");
  await page.getByRole("button", { name: "Continue to Discipline", exact: true }).click();
  const discipline = await page.getByLabel("Wizard discipline").inputValue();
  await page.getByRole("button", { name: "Continue to Level", exact: true }).click();
  await page.getByLabel("Wizard level").selectOption("Medical school");
  await page.getByRole("button", { name: "Continue to Slide count", exact: true }).click();
  await page.getByLabel("Wizard slide count").fill("12");
  await page.getByRole("button", { name: "Continue to Evidence check", exact: true }).click();
  const dialog = page.getByRole("dialog");
  if (
    (await dialog.locator("#count").inputValue()) !== "12" ||
    (await dialog.locator("#level").inputValue()) !== "Medical school"
  )
    throw Error("Wizard choices must reach the generator");
  if ((await dialog.locator("#disc").inputValue()) !== discipline)
    throw Error("Wizard discipline must remain selected");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.close();
  console.log(
    "PASS named verification preflight, dark-mode re-verification/PDF, and First Deck wizard choices",
  );
} finally {
  await browser.close();
  server.close();
}
