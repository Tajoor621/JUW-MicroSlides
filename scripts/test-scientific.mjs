import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { readFile, mkdir, writeFile } from "node:fs/promises";
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  optimizeDeps: { noDiscovery: true, entries: [] },
  logLevel: "error",
});
const results = [];
const check = async (name, fn) => {
  await fn();
  results.push({ name, status: "passed" });
  console.log(`PASS ${name}`);
};
try {
  const pub = await server.ssrLoadModule("/src/lib/publication-status.ts");
  const docs = await server.ssrLoadModule("/src/lib/source-documents.ts");
  const sem = await server.ssrLoadModule("/src/lib/semantic-review.ts");
  const integrity = await server.ssrLoadModule("/src/lib/deck-integrity.ts");
  const backup = await server.ssrLoadModule("/src/lib/backup.ts");
  const { generateLocalDeck } = await server.ssrLoadModule("/src/lib/generate-deck.ts");
  await check("Europe PMC real spaced notice types and notice direction", () => {
    for (const type of ["Retraction in", "RetractionIn"])
      assert.equal(
        pub.noticeStatus(
          pub.europeNotices({
            commentCorrectionList: { commentCorrection: [{ type, id: "123", source: "MED" }] },
          }),
          true,
        ),
        "retracted",
      );
    assert.equal(
      pub.noticeStatus(
        pub.europeNotices({
          commentCorrectionList: { commentCorrection: [{ type: "Erratum in" }] },
        }),
        true,
      ),
      "corrected",
    );
    assert.equal(
      pub.noticeStatus(
        pub.europeNotices({
          commentCorrectionList: { commentCorrection: [{ type: "Expression of concern in" }] },
        }),
        true,
      ),
      "concern",
    );
    assert.equal(
      pub.noticeStatus(
        pub.europeNotices({
          commentCorrectionList: { commentCorrection: [{ type: "Retraction of" }] },
        }),
        true,
      ),
      "notice",
    );
    assert.equal(
      pub.noticeStatus(
        pub.europeNotices({ pubTypeList: { pubType: ["Retracted Publication"] } }),
        true,
      ),
      "retracted",
    );
  });
  await check("Crossref incoming updates target exact DOI; unrelated notices ignored", () => {
    const record = {
      DOI: "10.1/notice",
      "update-to": [{ DOI: "10.1/ORIGINAL", type: "retraction" }],
    };
    assert.equal(pub.noticeStatus(pub.crossrefNotices(record, "10.1/original"), true), "retracted");
    assert.equal(pub.crossrefNotices(record, "10.1/other").length, 0);
    assert.equal(pub.noticeStatus([], false), "unknown");
    assert.equal(pub.noticeStatus([], true), "no-notice-found");
  });
  await check("Publication freshness rejects stale and future timestamps", () => {
    const now = Date.now();
    assert(pub.statusIsFresh({ checkedAt: now }, now));
    assert(!pub.statusIsFresh({ checkedAt: now + 1000 }, now));
    assert(!pub.statusIsFresh({ checkedAt: now - 8 * 86400000 }, now));
  });
  const xml =
    "<article><front><abstract><p>Abstract is not body evidence.</p></abstract></front><body><sec><title>Methods</title><p>Bacterial <italic>cells</italic> were counted &amp; compared.</p><fig><caption><p>Figure excluded</p></caption></fig><sec><p>A second body paragraph.</p></sec></sec></body><back><ref-list><p>References excluded</p></ref-list></back></article>";
  await check(
    "JATS extraction preserves inline text, body order and excludes references/figures",
    () =>
      assert.equal(
        docs.parseJats(xml),
        "Methods\n\nBacterial cells were counted & compared.\n\nA second body paragraph.",
      ),
  );
  await check(
    "XML rejects malformed, oversized, entity declarations and abstract-only payloads",
    () => {
      for (const raw of [
        "<article><body>",
        "<article/>",
        '<!DOCTYPE x [<!ENTITY x SYSTEM "file:///etc/passwd">]><article/>',
        "x".repeat(2000001),
      ])
        assert.throws(() => docs.parseJats(raw));
    },
  );
  await check("Authority host validation rejects credential, suffix and HTTP spoofing", () => {
    for (const url of [
      "http://cdc.gov/x",
      "https://cdc.gov.evil.test/x",
      "https://cdc.gov@evil.test/x",
      "https://who.int:8443/x",
    ])
      assert.throws(() => docs.authoritativePublisher(url));
    assert.equal(docs.authoritativePublisher("https://www.cdc.gov/x"), "CDC");
    assert.equal(docs.authoritativePublisher("https://www.who.int/x"), "WHO");
  });
  await check(
    "Guidance requires version, jurisdiction and recent explicit currency confirmation",
    () => {
      const d = {
        access: "guideline",
        publishedDate: "2026",
        jurisdiction: "Global",
        currencyConfirmedAt: Date.now(),
      };
      assert(!docs.guidanceNeedsReview(d));
      assert(docs.guidanceNeedsReview({ ...d, jurisdiction: "" }));
      assert(docs.guidanceNeedsReview({ ...d, currencyConfirmedAt: Date.now() - 31 * 86400000 }));
      assert(
        !docs.guidanceNeedsReview({ ...d, access: "textbook", currencyConfirmedAt: undefined }),
      );
    },
  );
  await check(
    "Semantic screening labels candidates without asserting scientific relationships",
    () => {
      const rows = [
        { index: 0, text: "The isolate is susceptible at 2 mg." },
        { index: 1, text: "The isolate is susceptible at 2 mg." },
        { index: 2, text: "The isolate is not susceptible at 8 mg." },
        { index: 3, text: "An unrelated fungal mechanism." },
      ];
      const findings = sem.compareEmbeddings(rows, [
        [1, 0],
        [1, 0],
        [1, 0],
        [0, 1],
      ]);
      assert.equal(findings.filter((f) => f.kind === "related-statements").length, 1);
      assert.equal(findings.filter((f) => f.kind === "changed-wording-review").length, 2);
      assert.throws(() => sem.compareEmbeddings(rows, [[1, 0]]));
      assert.throws(() => sem.compareEmbeddings([], [], NaN));
      assert.throws(() => sem.cosine([NaN], [1]));
      assert.throws(() => sem.cosine([0], [1]));
    },
  );
  await check("Embedding screening never treats fabricated vectors as model calibration", () =>
    assert.equal(
      sem.compareEmbeddings(
        [
          { index: 0, text: "A" },
          { index: 1, text: "B" },
        ],
        [
          [1, 0],
          [0, 1],
        ],
      ).length,
      0,
    ),
  );
  const d = integrity.reconcileDeck(
    generateLocalDeck({
      topic: "Enzyme immobilization",
      discipline: "Industrial",
      level: "Undergraduate",
      mode: "manual",
      count: 3,
      notes: "",
    }),
  );
  d.slides[1].citations = [
    {
      id: "r",
      title: "Reference",
      authors: "Author",
      journal: "Journal",
      year: "2024",
      doi: "10.1/original",
      publicationCheck: {
        identifier: "10.1/original",
        checkedAt: Date.now(),
        status: "retracted",
        providers: ["fixture"],
        notices: [{ type: "retraction", url: "https://doi.org/10.1/notice" }],
        complete: true,
      },
    },
  ];
  await check("Retracted sources block reviewed export even after lecturer claim review", () => {
    d.slides[1].claims.forEach((c) => {
      c.status = "lecturer-reviewed";
      c.evidence = [
        {
          sourceUrl: "https://doi.org/10.1/original",
          quote: c.text,
          locator: "Results",
          access: "full-text",
          checkedAt: Date.now(),
        },
      ];
    });
    assert(
      integrity
        .integrityAudit(d)
        .some((f) => f.category === "Publication notice" && f.severity === "critical"),
    );
    assert(!integrity.classroomReady(d));
  });
  await check("Portable backup preserves source text, reuse terms and publication checks", () => {
    d.sourceDocuments = [
      {
        id: "doc",
        title: "Teaching chapter",
        url: "https://openstax.org/books/microbiology",
        publisher: "OpenStax",
        access: "textbook",
        text: "A permitted source passage. ".repeat(5),
        locator: "Chapter 1",
        license: "CC BY 4.0",
        retrievedAt: Date.now(),
        publishedDate: "2022",
        jurisdiction: "",
        acquisition: "lecturer-import",
      },
    ];
    const copy = backup.deckSchema.parse(d);
    assert.deepEqual(copy.sourceDocuments, d.sourceDocuments);
    assert.deepEqual(
      copy.slides[1].citations[0].publicationCheck,
      d.slides[1].citations[0].publicationCheck,
    );
  });
  await check("Damaged saved quotations remain critical after lecturer confirmation", () => {
    const copy = structuredClone(d);
    const claim = copy.slides[1].claims[0];
    claim.status = "lecturer-reviewed";
    claim.evidence = [
      {
        sourceUrl: copy.sourceDocuments[0].url,
        locator: "Results",
        access: "textbook",
        checkedAt: Date.now(),
        quote: "Activity increased at p 4.0, p < 0.05.",
      },
    ];
    copy.sourceDocuments[0].text = "Activity increased at p < 0.01. Threshold > 4.0, p < 0.05.";
    assert(
      integrity
        .integrityAudit(copy)
        .some((f) => f.category === "Source quotation mismatch" && f.severity === "critical"),
    );
    assert(!integrity.classroomReady(copy));
    claim.evidence[0].quote = "Threshold > 4.0,\n p < 0.05.";
    assert(!integrity.integrityAudit(copy).some((f) => f.category === "Source quotation mismatch"));
    claim.evidence[0].quote = "Threshold < 4.0, p < 0.05.";
    assert(integrity.integrityAudit(copy).some((f) => f.category === "Source quotation mismatch"));
  });
  await check("Clinical recommendation without current guideline record remains critical", () => {
    d.slides[1].claims[0].classification = "guideline";
    assert(
      integrity
        .integrityAudit(d)
        .some((f) => f.category === "Guideline currency" && f.severity === "critical"),
    );
  });
  await check(
    "Audience frame excludes source libraries, notes, claims and raw private CSL",
    async () => {
      const { audienceFrame } = await server.ssrLoadModule("/src/lib/audience-frame.ts");
      const secret = "PRIVATE_QUALIFICATION_MARKER";
      const copy = structuredClone(d);
      copy.sourceDocuments[0].text = secret;
      copy.slides[1].notes = secret;
      copy.slides[1].citations[0].cslJson = JSON.stringify({ note: secret });
      copy.slides[1].claims[0].evidence[0].quote = secret;
      copy.contentWarnings = [secret];
      copy.researchLinks = [{ id: "private", title: secret, url: "https://example.org" }];
      const frame = audienceFrame(copy, 1, "Vancouver");
      assert(!JSON.stringify(frame).includes(secret));
      assert.equal(frame.slide.title, copy.slides[1].title);
      assert.equal(frame.total, copy.slides.length);
    },
  );
  const realFetch = globalThis.fetch;
  try {
    await check(
      "Live checker merges provider notices; provider failure cannot become clean status",
      async () => {
        globalThis.fetch = async (url) =>
          new Response(
            JSON.stringify(
              String(url).includes("crossref")
                ? {
                    message: {
                      "total-results": 1,
                      items: [
                        {
                          DOI: "10.1/notice",
                          "update-to": [{ DOI: "10.1/original", type: "retraction" }],
                        },
                      ],
                    },
                  }
                : {
                    resultList: {
                      result: [
                        {
                          pmid: "123",
                          doi: "10.1/original",
                          pubTypeList: { pubType: ["Journal Article"] },
                        },
                      ],
                    },
                  },
            ),
            { status: 200 },
          );
        let report = await pub.checkPublication({ doi: "10.1/original", pmid: "123" });
        assert.equal(report.status, "retracted");
        assert(report.complete);
        globalThis.fetch = async () => {
          throw Error("offline");
        };
        report = await pub.checkPublication({ doi: "10.1/uncached" });
        assert.equal(report.status, "unknown");
        assert(!report.complete);
      },
    );
  } finally {
    globalThis.fetch = realFetch;
  }
  await check(
    "Research retries transient failures and excludes preprints without padding",
    async () => {
      const { enrichTopicEvidence, researchQueries } = await server.ssrLoadModule(
        "/src/lib/topic-evidence.ts",
      );
      const input = {
        topic: "Bacterial endospores",
        discipline: "Bacteriology",
        count: 1,
        level: "Undergraduate",
        mode: "manual",
        notes: "",
      };
      const seed = generateLocalDeck(input);
      seed.slides = [];
      const paper = {
        source: "MED",
        id: "123",
        title: input.topic,
        abstractText:
          "Bacterial endospores in this software fixture illustrate one distinct source statement with adequate length. Bacterial endospores in this software fixture illustrate a separate source passage for the contract test.",
      };
      const original = globalThis.fetch;
      let calls = 0;
      const firstBatch = researchQueries(input.topic).length;
      try {
        globalThis.fetch = async () => {
          if (++calls <= firstBatch) throw Error("Transient fixture outage");
          return new Response(JSON.stringify({ resultList: { result: [paper] } }));
        };
        const completed = await enrichTopicEvidence(seed, input);
        assert.equal(completed.slides.length, 1);
        assert(calls > firstBatch);
        globalThis.fetch = async () =>
          new Response(
            JSON.stringify({
              resultList: {
                result: [{ ...paper, source: "PPR", pubTypeList: { pubType: ["Preprint"] } }],
              },
            }),
          );
        await assert.rejects(() => enrichTopicEvidence(seed, input), /not complete/);
        assert.equal(seed.slides.length, 0);
        const exactBody =
          "Bacterial endospores in this fixture show values p &lt; 0.05 and concentrations &gt; 2 &#x3bc;g under defined conditions. Bacterial endospores in this second fixture sentence retain a separate qualified numerical observation.";
        globalThis.fetch = async (url) =>
          String(url).includes("fullTextXML")
            ? new Response(`<article><body><p>${exactBody}</p></body></article>`)
            : new Response(
                JSON.stringify({
                  resultList: { result: [{ ...paper, pmcid: "PMC123", isOpenAccess: "Y" }] },
                }),
              );
        const fullText = await enrichTopicEvidence(seed, input);
        assert.match(fullText.slides[0].bullets[0], /p < 0.05/);
        assert.match(fullText.slides[0].bullets[0], /> 2 μg/);
        assert(
          fullText.sourceDocuments[0].text
            .replace(/\s+/g, " ")
            .includes(fullText.slides[0].claims[0].evidence[0].quote),
        );
      } finally {
        globalThis.fetch = original;
      }
    },
  );
  await check(
    "Embedding API fixtures require stable model digests and never confer calibration",
    async () => {
      const savedFetch = globalThis.fetch,
        savedStorage = globalThis.localStorage;
      try {
        globalThis.localStorage = {
          getItem: () =>
            JSON.stringify({
              url: "http://localhost:11434",
              model: "fixture",
              embeddingModel: "fixture",
            }),
        };
        const copy = structuredClone(d);
        copy.slides = [copy.slides[1]];
        copy.slides[0].bullets = [
          "Bacterial first teaching statement.",
          "Bacterial second teaching statement.",
        ];
        copy.slides[0].leftBullets = [];
        copy.slides[0].rightBullets = [];
        let tags = 0,
          changed = false;
        globalThis.fetch = async (url) =>
          new Response(
            JSON.stringify(
              String(url).endsWith("/api/tags")
                ? {
                    models: [
                      { name: "fixture", digest: (changed && ++tags > 1 ? "b" : "a").repeat(64) },
                    ],
                  }
                : {
                    model: "fixture",
                    embeddings: [
                      [1, 0],
                      [0, 1],
                    ],
                  },
            ),
          );
        const report = await sem.semanticReview(copy);
        assert.equal(report.modelDigest, "a".repeat(64));
        assert.equal(report.independentlyCalibrated, false);
        changed = true;
        await assert.rejects(() => sem.semanticReview(copy), /changed during screening/);
        globalThis.fetch = async (url) =>
          new Response(
            JSON.stringify(
              String(url).endsWith("/api/tags")
                ? { models: [{ name: "fixture", digest: "a".repeat(64) }] }
                : {
                    embeddings: [
                      [1, 0],
                      [0, 1],
                    ],
                  },
            ),
          );
        await assert.rejects(() => sem.semanticReview(copy), /did not identify/);
      } finally {
        globalThis.fetch = savedFetch;
        globalThis.localStorage = savedStorage;
      }
    },
  );
  await check(
    "Single-slide source summaries prefer explanatory paragraphs over first-person results",
    async () => {
      const input = {
        topic: "Bacterial chromosome segregation",
        discipline: "Bacteriology",
        level: "Graduate",
        notes: "",
        mode: "manual",
        count: 1,
      };
      const seed = generateLocalDeck(input);
      seed.slides = [];
      const opening =
        "Bacterial chromosome segregation is the distribution of duplicated chromosomes into daughter cells. Bacterial chromosome segregation coordinates genome inheritance during the cell division cycle.";
      seed.sourceDocuments = [
        {
          ...d.sourceDocuments[0],
          text:
            "We found bacterial chromosome segregation rates were altered in the selected culture conditions. Our bacterial chromosome segregation observations were restricted to the sampled bacterial culture.\n\n" +
            opening,
        },
      ];
      const { enrichTopicEvidence } = await server.ssrLoadModule("/src/lib/topic-evidence.ts");
      const result = await enrichTopicEvidence(seed, input);
      assert.equal(result.slides.length, 1);
      assert.match(result.slides[0].bullets[0], /is the distribution/);
      assert.match(result.slides[0].notes, /Full source context is preserved/);
      assert(result.slides[0].claims.some((c) => c.evidence.some((e) => e.quote.length)));
      assert(
        result.slides[0].claims.some((c) => c.evidence.some((e) => e.quote.includes(opening))),
      );
      assert(!result.slides[0].notes.includes(opening));
      assert(result.slides[0].claims.every((c) => c.status !== "lecturer-reviewed"));
    },
  );
  const corpus = JSON.parse(await readFile("benchmarks/microbiology-topics.json", "utf8"));
  await check(
    "Broad benchmark manifest covers 200 unique topics with explicit unqualified science status",
    () => {
      assert.equal(corpus.cases.length, 200);
      assert.equal(new Set(corpus.cases.map((c) => c.topic)).size, 200);
      assert(corpus.cases.every((c) => c.scientificVerdict === "needs-independent-review"));
      assert.equal(new Set(corpus.cases.map((c) => c.domain)).size, 20);
    },
  );
  await mkdir("qualification-results", { recursive: true });
  await writeFile(
    "qualification-results/scientific-contract.json",
    JSON.stringify(
      {
        appVersion: "V6.2.1",
        suite: "Deterministic software contracts, not scientific certification",
        checkedAt: new Date().toISOString(),
        results,
      },
      null,
      2,
    ),
  );
  console.log(
    `${results.length} scientific-workflow contract checks passed; independent domain review remains required.`,
  );
} finally {
  await server.close();
}
