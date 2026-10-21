import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer as httpServer } from "node:http";
import { extname, resolve } from "node:path";
const root = process.cwd();
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
    const page = await browser.newPage({ acceptDownloads: true });
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
        await mkdir("/workspace/screenshots", { recursive: true });
        await writeFile("/workspace/screenshots/juw-teaching-fixture.pdf", pdfBytes);
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
} finally {
  await browser.close();
  server.close();
}
