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
  const { researchQueries, researchScopes, sourceTopicRelevance } = await server.ssrLoadModule(
    "/src/lib/topic-evidence.ts",
  );
  const competenceTopic =
    "Transduction process:\nNatural competence in bacteria (eg Bacillus, streptococcus).\nArtificial competence (calcium chloride method, electroporation)\nUptake and integration of foreign DNA, Laboratory applications in cloning and genetic engineering";
  const { inferFocus } = await server.ssrLoadModule("/src/lib/topic-engine.ts");
  check("mechanism-led requests keep genetics discipline despite organism examples", () => {
    assert.equal(inferFocus(competenceTopic).discipline, "Microbial Genetics & Molecular Biology");
    assert.equal(inferFocus("Bacillus anthracis virulence").kind, "bacterium");
  });
  check("competence syllabus searches every mechanism with correct bacterial context", () => {
    const scopes = researchScopes(competenceTopic);
    assert.equal(scopes.length, 8);
    const queries = researchQueries(competenceTopic);
    assert(queries.length <= 32);
    assert(queries.slice(0, 8).every((q) => q.includes(" AND ")));
    for (const keyword of [
      "Bacillus",
      "Streptococcus",
      "calcium chloride",
      "electroporation",
      "DNA uptake",
      "homologous recombination",
      "cloning",
      "transduction",
    ])
      assert(
        queries.slice(0, 8).some((q) => q.includes(keyword)),
        keyword,
      );
    const examples = [
      "Bacteriophage-mediated transduction transfers bacterial DNA between cells.",
      "Bacillus subtilis develops natural competence for uptake of extracellular DNA.",
      "Streptococcus pneumoniae competence supports genetic transformation with extracellular DNA.",
      "Calcium chloride treatment is used for chemical transformation of Escherichia coli with DNA.",
      "Electroporation introduces DNA into bacterial cells for transformation.",
      "Bacterial transformation includes uptake of extracellular DNA across the envelope.",
      "Homologous recombination integrates donor DNA during bacterial transformation.",
      "Plasmid transformation of Escherichia coli supports molecular cloning.",
    ];
    for (const [i, scope] of scopes.entries())
      assert(sourceTopicRelevance(scope, examples[i]) >= 0.6, scope);
    for (const unrelated of [
      "Calcium signal transduction in human neurons controls cellular competence.",
      "Electroporation delivers plasmid DNA into human cancer cells for genetic engineering.",
      "Artificial intelligence measures laboratory competence in medical students.",
      "Bacillus causes food spoilage in laboratory cultures.",
    ])
      assert.equal(sourceTopicRelevance(competenceTopic, unrelated), 0);
    assert(
      researchScopes(competenceTopic + "; Malaria vaccine epidemiology").includes(
        "Malaria vaccine epidemiology",
      ),
    );
  });
  check(
    "multi-section genome syllabus retrieves each requested scope without unrelated padding",
    () => {
      const topic =
        "Genome architecture in bacteria, archaea and fungi. Differences between prokaryotic and eukaryotic microbial genomes. DNA packaging in microbes (nucleoid and chromatin). Organization of bacterial chromosome";
      for (const passage of [
        "Archaeal genome sequences describe microbial genome organization.",
        "Prokaryotic and eukaryotic microbial genomes have distinct chromosome organization.",
        "DNA packaging involves nucleoid organization and chromatin structure in microbes.",
        "Bacterial chromosome organization was investigated in bacterial cells.",
      ])
        assert(sourceTopicRelevance(topic, passage) >= 0.6);
      assert.equal(sourceTopicRelevance(topic, "Malaria infection causes fever in patients."), 0);
      assert.equal(
        sourceTopicRelevance(
          topic,
          "MicrobialScope is a genomic resource with rich annotations across bacteria, archaea, fungi, and viruses.",
        ),
        0,
      );
      assert.equal(
        sourceTopicRelevance(
          topic,
          "Multi-kingdom cervical microbiome structure in health and dysbiosis. Bacterial, archaeal and fungal genomes were surveyed.",
        ),
        0,
      );
      const queries = researchQueries(topic);
      assert(queries.some((q) => q.includes('"packaging"') && !q.includes('"differences"')));
      assert(queries.some((q) => q.includes('"chromosome"') && !q.includes('"eukaryotic"')));
    },
  );
  check("reproduction-number scope rejects fertility/genetics word overlap", () => {
    const topic = "Pathogen reproductive number interpretation";
    for (const body of [
      "Identification of potential causal variants for premature ovarian failure. Reproductive performance and chromosome number interpretation were assessed with pathogenetic variants.",
      "Pathogen detection in symptomatic pigs. Reproductive performance and bacterial culture interpretation were recorded.",
      "RT PCR detected infection; chromosome number and human reproductive performance were interpreted.",
    ])
      assert.equal(sourceTopicRelevance(topic, body), 0);
    for (const body of [
      "The basic reproduction number was estimated from infection incidence.",
      "We estimated R0 from outbreak transmission data.",
      "Rt was estimated from epidemic incidence in this population.",
      "R₀ was estimated from outbreak transmission data.",
    ])
      assert.equal(sourceTopicRelevance(topic, body), 1);
    assert(
      researchQueries(topic).some(
        (q) => q.includes('"reproduction number"') && q.includes("transmission"),
      ),
    );
    assert.equal(
      sourceTopicRelevance(
        "bacterial biofilm",
        "Antibacterial medicines inhibit nonbiofilm structures.",
      ),
      0,
    );
  });
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
  // Synthetic software fixtures, not scientific sources or usable publication identifiers.
  const facets = [
    "Bacteriophage-mediated transduction transfers bacterial DNA between cells",
    "Bacillus subtilis natural competence supports transformation with extracellular DNA",
    "Streptococcus pneumoniae natural competence permits DNA transformation",
    "Calcium chloride chemical transformation introduces DNA into Escherichia coli",
    "Bacterial electroporation delivers DNA for transformation",
    "Bacterial transformation requires uptake and transport of extracellular DNA",
    "Homologous recombination integrates foreign DNA during bacterial transformation",
    "Plasmid transformation in Escherichia coli supports cloning and genetic engineering",
  ];
  let omitChemical = false;
  // A broad review can mention the example genus without being its best teaching source.
  const broadMention = {
    id: "broad-review-fixture",
    source: "QA",
    title: "Synthetic broad transformation overview",
    abstractText:
      "Natural competence in Bacillus and Streptococcus supports transformation with DNA in several species. Streptococcus pneumoniae transformation has a long history in bacterial genetics.",
    authorString: "Software fixture",
    pubYear: "2025",
  };
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        resultList: {
          result: [
            broadMention,
            ...facets.flatMap((text, i) =>
              omitChemical && i === 3
                ? []
                : [
                    {
                      id: `fixture-${i}`,
                      source: "QA",
                      title:
                        i === 1
                          ? "Bacillus subtilis natural competence and transformation"
                          : `Synthetic mechanism fixture ${i}`,
                      abstractText: `${text} in the defined experimental model. ${text} and its limitations were evaluated using a separate comparison.`,
                      authorString: "Software fixture",
                      pubYear: "2025",
                    },
                  ],
            ),
          ],
        },
      }),
      { headers: { "content-type": "application/json" } },
    );
  const facetInput = { ...input, topic: competenceTopic, count: 9 };
  const facetBase = generateLocalDeck(facetInput);
  const completeFacets = await enrichTopicEvidence(facetBase, facetInput);
  assert.equal(completeFacets.slides.length, 9);
  assert.equal(
    completeFacets.slides.find((s) => s.title === "Natural competence in Bacillus").citations[0]
      .title,
    "Bacillus subtilis natural competence and transformation",
  );
  assert.equal(
    completeFacets.slides.filter((s) => s.notes.startsWith("Requested section:")).length,
    8,
  );
  for (const scope of researchScopes(competenceTopic))
    assert(
      completeFacets.slides.some((s) => sourceTopicRelevance(scope, s.bullets.join(" ")) >= 0.6),
      scope,
    );
  assert(completeFacets.contentWarnings.some((w) => w.startsWith("Terminology note:")));
  assert(!completeFacets.contentWarnings.some((w) => /^Requested \d+ slides;/.test(w)));
  assert(completeFacets.slides.some((s) => s.title === "Chemical competence: calcium chloride"));
  omitChemical = true;
  await assert.rejects(
    () => enrichTopicEvidence(facetBase, facetInput),
    /Uncovered requested sections:.*calcium chloride/,
  );
  checks++;
  console.log(
    "PASS complete competence coverage, terminology note and missing-mechanism failure without fabricated slides",
  );
  console.log(`${checks} topic, media and specialist review checks passed.`);
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
