import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
const server = await createServer({
  optimizeDeps: { noDiscovery: true, include: [] },
  configFile: false,
  server: { middlewareMode: true },
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  logLevel: "error",
});
let checks = 0;
const check = (name, fn) => {
  fn();
  checks++;
  console.log(`PASS ${name}`);
};
const originalFetch = globalThis.fetch;
try {
  const { generateLocalDeck, withOfficialIntro } = await server.ssrLoadModule(
    "/src/lib/generate-deck.ts",
  );
  const { reviewDeck, checkReferenceMetadata } = await server.ssrLoadModule(
    "/src/lib/research-review.ts",
  );
  const { searchMediaLibrary, publicMediaSearchLinks, downloadMediaFile } =
    await server.ssrLoadModule("/src/lib/media-library.ts");
  const { enrichTopicEvidence } = await server.ssrLoadModule("/src/lib/topic-evidence.ts");
  const { researchQueries } = await server.ssrLoadModule("/src/lib/topic-evidence.ts");
  const { parseBackup } = await server.ssrLoadModule("/src/lib/backup.ts");
  const input = {
    topic: "Bacterial genome architecture",
    discipline: "Microbial Genetics & Molecular Biology",
    count: 12,
    level: "Undergraduate",
    notes: "",
    mode: "manual",
  };
  const deck = generateLocalDeck(input);
  check("topic-dedicated introduction and concise headings", () => {
    assert.equal(deck.slides[0].title, input.topic);
    assert.match(deck.slides[0].subtitle, /Chromosome organization/);
    assert.equal(deck.slides.length, 12);
    assert(!deck.slides.slice(1).some((s) => s.title.includes(input.topic)));
    assert.equal(deck.courseCode, "");
    assert(
      !deck.slides.some((s) =>
        /immobilization|enzyme leaching/i.test([s.title, ...s.bullets].join(" ")),
      ),
    );
  });
  check("generation never auto-attaches a scientific image", () => {
    assert(deck.slides.every((s) => s.media.length === 0));
    assert(withOfficialIntro(deck, input).slides.every((s) => s.media.length === 0));
  });
  check("large requests do not create generic filler", () => {
    const large = generateLocalDeck({ ...input, count: 50 });
    assert(large.slides.length <= 50);
    assert(large.contentWarnings.length);
    assert(
      !large.slides.some((s) =>
        /name the method|stop talking|write the single sentence|first.year.*mark/i.test(
          s.bullets.join(" "),
        ),
      ),
    );
    assert.equal(new Set(large.slides.map((s) => s.title)).size, large.slides.length);
  });
  check("fungal and mixed-domain genome topics use the appropriate scope", () => {
    const fungi = generateLocalDeck({ ...input, topic: "Fungal genome architecture" });
    assert(fungi.slides.some((s) => /Fungal chromosomes/.test(s.title)));
    assert(!fungi.slides.some((s) => s.title === "The bacterial nucleoid"));
    const mixed = generateLocalDeck({
      ...input,
      topic: "Genome architecture in bacteria, archaea and fungi",
    });
    assert(mixed.slides.some((s) => /Archaeal/.test(s.title)));
    assert(mixed.slides.some((s) => /Fungal/.test(s.title)));
  });
  check("unknown topics disclose insufficient coverage", () => {
    const unknown = generateLocalDeck({
      ...input,
      topic: "Uncatalogued isolate ZXQ-517 secretion system",
    });
    assert(unknown.contentWarnings.length);
    assert(unknown.slides.some((s) => s.title === "Evidence required"));
    assert(unknown.slides.every((s) => s.media.length === 0));
  });
  const bad = structuredClone(deck);
  bad.slides[2].bullets = [
    "Viruses have their own ribosomes.",
    "All bacteria have a single circular chromosome.",
  ];
  bad.slides[2].citations = [];
  bad.slides[2].notes = "";
  bad.slides[2].media = [
    {
      id: "wrong",
      kind: "photo",
      title: "Plasmodium sporozoite inside a mosquito",
      src: "https://images.example.org/malaria.jpg",
      source: "https://example.org/source",
      credit: "Unknown",
      license: "Unknown",
      keywords: [deck.topic],
    },
  ];
  check("specialist screening flags factual contradictions and mismatched media", () => {
    const issues = reviewDeck(bad);
    assert(issues.some((i) => i.category === "Potential factual error" && i.severity === "high"));
    assert(issues.some((i) => i.category === "Media mismatch"));
    assert(issues.some((i) => i.category === "Media provenance"));
    assert(issues.some((i) => i.category === "Evidence gap"));
    assert(issues.every((i) => i.quote && i.suggestion && Number.isInteger(i.index)));
  });
  check("correct negations are not labelled as factual errors", () => {
    const negative = structuredClone(deck);
    negative.slides[2].bullets = [
      "Viruses do not have ribosomes.",
      "Archaeal cell walls lack peptidoglycan.",
      "Fungi are eukaryotes.",
    ];
    assert(!reviewDeck(negative).some((i) => i.category === "Potential factual error"));
  });
  const mediaRecord = {
    id: "a",
    kind: "photo",
    title: "Chromosome structure",
    src: "https://upload.wikimedia.org/example.jpg",
    originalSrc: "https://upload.wikimedia.org/original.jpg",
    provider: "Wikimedia Commons",
    credit: "Researcher",
    source: "https://commons.wikimedia.org/wiki/File:Example.jpg",
    license: "CC BY 4.0",
    keywords: ["chromosome"],
  };
  const poolDeck = {
    ...deck,
    mediaPool: [mediaRecord],
    researchLinks: [
      { id: "l", title: "Public source", url: "https://www.pinterest.com/pin/example/" },
    ],
  };
  check("backup preserves collection links and metadata separately from slides", () => {
    const restored = parseBackup(
      JSON.stringify({ format: "juw-microslides", schemaVersion: 1, decks: [poolDeck] }),
    )[0];
    assert.deepEqual(restored.mediaPool, poolDeck.mediaPool);
    assert.deepEqual(restored.researchLinks, poolDeck.researchLinks);
    assert(restored.slides.every((s) => s.media.length === 0));
    assert.deepEqual(restored.contentWarnings, poolDeck.contentWarnings);
  });
  globalThis.fetch = async (url) => {
    if (String(url).includes("openverse"))
      return new Response(
        JSON.stringify({
          results: [
            {
              id: "b",
              title: "Chromosome image",
              url: "https://upload.wikimedia.org/original.jpg",
              thumbnail: "https://upload.wikimedia.org/small.jpg",
              creator: "Researcher",
              license: "by",
              license_version: "4.0",
              license_url: "https://creativecommons.org/licenses/by/4.0/",
            },
          ],
        }),
        { headers: { "content-type": "application/json" } },
      );
    return new Response(
      JSON.stringify({
        query: {
          pages: {
            1: {
              pageid: 1,
              title: "File:Chromosome structure.jpg",
              imageinfo: [
                {
                  url: "https://upload.wikimedia.org/original.jpg",
                  thumburl: "https://upload.wikimedia.org/example.jpg",
                  descriptionurl: "https://commons.wikimedia.org/wiki/File:Example.jpg",
                  mime: "image/jpeg",
                  extmetadata: {
                    Artist: { value: "Researcher" },
                    LicenseShortName: { value: "CC BY 4.0" },
                  },
                },
              ],
            },
          },
        },
      }),
      { headers: { "content-type": "application/json" } },
    );
  };
  const collection = await searchMediaLibrary(deck.topic);
  assert.equal(collection.items.length, 1);
  assert.equal(collection.items[0].credit, "Researcher");
  assert.equal(deck.slides[2].media.length, 0);
  checks++;
  console.log("PASS multi-provider results are deduplicated without modifying the deck");
  check("public portal links include the requested social platforms", () => {
    const links = publicMediaSearchLinks(deck.topic);
    for (const name of ["X / Twitter", "Facebook", "Instagram", "Pinterest"])
      assert(links.some((l) => l.name === name && l.url.startsWith("https://")));
  });
  globalThis.fetch = async () =>
    new Response("<html>post page</html>", { headers: { "content-type": "text/html" } });
  await assert.rejects(() => downloadMediaFile(mediaRecord), /webpage/);
  checks++;
  console.log("PASS post pages are not misrepresented as downloadable image files");
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ message: { title: ["A completely unrelated parasitology paper"] } }),
      { headers: { "content-type": "application/json" } },
    );
  const ref = await checkReferenceMetadata([
    {
      id: "r",
      title: "Bacterial chromosome organization",
      authors: "Example",
      journal: "Journal",
      year: "2024",
      doi: "10.1000/example",
    },
  ]);
  assert.equal(ref[0].status, "mismatch");
  checks++;
  console.log("PASS reference identifiers resolving to different titles are flagged");
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        resultList: {
          result: [
            {
              id: "123",
              source: "MED",
              pmid: "123",
              title: "Uncatalogued isolate ZXQ-517 secretion system analysis",
              abstractText:
                "The uncatalogued isolate ZXQ-517 secretion system was investigated using a controlled comparison. A defined secretion phenotype was associated with the experimental condition. These findings require validation in other conditions and do not establish a universal mechanism.",
              authorString: "Example A",
              pubYear: "2024",
              journalInfo: { journal: { title: "Example Journal" } },
            },
          ],
        },
      }),
      { headers: { "content-type": "application/json" } },
    );
  const unknown = generateLocalDeck({
    ...input,
    topic: "Uncatalogued isolate ZXQ-517 secretion system",
  });
  const enriched = await enrichTopicEvidence(unknown, { ...input, topic: unknown.topic, count: 2 });
  assert(enriched.slides.some((s) => s.citations.some((c) => c.pmid === "123")));
  assert(enriched.slides.every((s) => s.media.length === 0));
  checks++;
  console.log("PASS retrieved abstracts add topic-specific cited evidence without adding media");
  let queryCalls = 0;
  globalThis.fetch = async () => {
    queryCalls++;
    const results = Array.from({ length: 14 }, (_, i) => ({
      id: `study-${i}`,
      source: "MED",
      pmid: `900${i}`,
      title: `Bacterial genome architecture study ${i}`,
      abstractText: `Bacterial genome organization in study ${i} was examined using chromosome imaging and sequencing. Bacterial chromosome architecture in study ${i} was compared across experimental growth conditions. The reported results describe tested strain ${i} and do not establish a universal pattern.`,
      authorString: "Example Author",
      pubYear: "2025",
      journalInfo: { journal: { title: "Example Journal" } },
    }));
    return new Response(JSON.stringify({ resultList: { result: results } }), {
      headers: { "content-type": "application/json" },
    });
  };
  const broadInput = { ...input, topic: "Bacterial genome architecture", count: 25 };
  const broadBase = generateLocalDeck(broadInput);
  const queries = researchQueries(broadInput.topic);
  assert(queries.length >= 2);
  assert(queries.some((q) => /chromosomes and accessory replicons/i.test(q)));
  const broad = await enrichTopicEvidence(broadBase, broadInput);
  assert(queryCalls >= 2, `expected complementary searches; got ${queryCalls}`);
  assert.equal(broad.slides.length, 25);
  assert(broad.slides.slice(1).every((s) => s.media.length === 0));
  assert(broad.slides.some((s) => s.citations.length));
  const sourced = broad.slides.filter((s) => s.citations.length);
  assert(sourced.every((s) => s.title.length <= 75));
  assert(sourced.every((s) => !/\b(is|was|were|have|has|that|during|using)$/.test(s.title)));
  assert(sourced.every((s) => s.bullets.every((bullet) => s.notes.includes(bullet))));
  assert(sourced.every((s) => s.claims.every((claim) => claim.status !== "lecturer-reviewed")));

  checks++;
  console.log(
    "PASS multi-query literature search fills supported 25-slide requests with citations",
  );
  console.log(`${checks} topic, media and specialist review checks passed.`);
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
