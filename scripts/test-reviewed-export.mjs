import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
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
  const { generateLocalDeck } = await vite.ssrLoadModule("/src/lib/generate-deck.ts");
  const { reconcileDeck, classroomReady } = await vite.ssrLoadModule("/src/lib/deck-integrity.ts");
  const { surfaceItems, surfaceSnapshot, attestClaim } = await vite.ssrLoadModule(
    "/src/lib/surface-review.ts",
  );
  d = reconcileDeck(
    generateLocalDeck({
      topic: "Enzyme immobilization",
      discipline: "Industrial microbiology",
      level: "Undergraduate",
      mode: "manual",
      notes: "",
      count: 1,
    }),
  );
  const s = d.slides[0];
  s.citations = [];
  s.notes = "";
  s.media = [
    {
      id: "audit-corrupt-image",
      kind: "photo",
      title: "Audit figure",
      src: "data:image/png;base64,aW52YWxpZA==",
      credit: "Synthetic software fixture",
      source: "https://example.org/figure",
      license: "CC0",
      keywords: [],
    },
  ];
  const quote = "A source sentence retained for this controlled software audit fixture.";
  d.sourceDocuments = [
    {
      id: "source",
      title: "Audit source",
      url: "https://openstax.org/books/microbiology/pages/1-introduction",
      publisher: "OpenStax",
      access: "textbook",
      text: quote + " This is synthetic software evidence, not scientific validation.",
      locator: "Audit paragraph",
      license: "Audit fixture only",
      retrievedAt: Date.now(),
      publishedDate: "2026",
      jurisdiction: "",
      acquisition: "lecturer-import",
    },
  ];
  for (const c of s.claims) {
    c.status = "lecturer-reviewed";
    c.evidence = [
      {
        sourceUrl: d.sourceDocuments[0].url,
        quote,
        locator: "Audit paragraph",
        access: "textbook",
        checkedAt: Date.now(),
      },
    ];
  }
  s.surfaceReviews = surfaceItems(s).map((i) => ({
    field: i.field,
    snapshot: surfaceSnapshot(d, s, i.field),
    verdict: "supported",
    rationale: "Controlled synthetic software fixture only.",
    reviewedAt: Date.now(),
    sourceUrl: d.sourceDocuments[0].url,
    quote,
    locator: "Audit paragraph",
  }));
  s.claims = s.claims.map((c) => attestClaim(d, c));
  if (!classroomReady(d)) throw Error("Synthetic fixture must clear the evidence gate");
  const invalidPng = structuredClone(d);
  s.media[0].src =
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>',
    );
  s.surfaceReviews = surfaceItems(s).map((i) => ({
    ...s.surfaceReviews.find((r) => r.field === i.field),
    snapshot: surfaceSnapshot(d, s, i.field),
  }));
  const valid = structuredClone(d);
  s.media[0].src = "data:image/svg+xml;base64,aW52YWxpZA==";
  s.surfaceReviews = surfaceItems(s).map((i) => ({
    ...s.surfaceReviews.find((r) => r.field === i.field),
    snapshot: surfaceSnapshot(d, s, i.field),
  }));
  fixtures = [invalidPng, structuredClone(d), valid];
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
    await page
      .getByLabel("Restore backup", { exact: true })
      .setInputFiles({
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
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
