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
const originalFetch = globalThis.fetch,
  originalStorage = globalThis.localStorage,
  originalWindow = globalThis.window;
let checks = 0;
try {
  const { generateLocalDeck } = await server.ssrLoadModule("/src/lib/generate-deck.ts");
  const { enrichTopicEvidence, researchQueries } = await server.ssrLoadModule(
    "/src/lib/topic-evidence.ts",
  );
  const { assertCompleteDeck } = await server.ssrLoadModule("/src/lib/deck-completion.ts");
  const input = {
    topic: "Microbiology",
    discipline: "General Microbiology",
    level: "Undergraduate",
    notes: "",
    mode: "manual",
    count: 25,
  };
  assert.equal(generateLocalDeck(input).slides.length, 25);
  checks++;
  console.log(
    "PASS whole-subject microbiology overview reaches 25 without the missing-reading-slide bug",
  );
  const topics = [
    "Bacteriology",
    "Archaeal membrane lipids",
    "Viral antigenic drift",
    "Aspergillus fumigatus",
    "Giardia lamblia",
    "Complement system",
    "Bacterial conjugation",
    "Antimicrobial resistance",
    "Biological nitrogen fixation",
    "Microbial fuel cells",
    "Food spoilage",
    "Wastewater treatment",
    "Bacterial sporulation",
    "Bacteriophage therapy",
    "Microbial ecology",
    "Rhizobium symbiosis",
  ];
  for (const topic of topics) {
    for (const count of topic === "Bacteriology"
      ? Array.from({ length: 50 }, (_, i) => i + 1)
      : [2, 25, 50]) {
      let calls = 0;
      globalThis.fetch = async (url) => {
        calls++;
        const parsed = new URL(url),
          cursor = parsed.searchParams.get("cursorMark");
        const start = cursor === "page2" ? 10 : cursor === "page3" ? 20 : 0;
        const papers = Array.from({ length: 10 }, (_, n) => {
          const i = start + n;
          return {
            id: `qa-${i}`,
            pmid: `9000${i}`,
            source: "MED",
            title: `${topic}: source study ${i}`,
            abstractText: `${topic} was investigated in dataset ${i} using a defined experimental comparison. The researchers in dataset ${i} recorded a condition-specific response using controlled measurements. The reported ${topic} findings in dataset ${i} apply to the study design and sampled conditions. The authors in dataset ${i} noted that further independent observations were needed before generalization.`,
            authorString: "QA Author",
            pubYear: "2025",
          };
        });
        return new Response(
          JSON.stringify({
            resultList: { result: papers },
            nextCursorMark: start < 20 ? (start === 0 ? "page2" : "page3") : undefined,
          }),
          { headers: { "content-type": "application/json" } },
        );
      };
      const request = { ...input, topic, count };
      const base = generateLocalDeck(request);
      const deck = await enrichTopicEvidence(base, request);
      assertCompleteDeck(deck, count);
      assert.equal(deck.slides.length, count);
      assert.equal(deck.slides[0].title, topic);
      assert(!deck.slides.some((s) => s.title === "Evidence required"));
      const bodies = deck.slides.filter((s) => s.citations.length).map((s) => s.bullets.join(" "));
      assert.equal(new Set(bodies).size, bodies.length);
      assert(deck.slides.every((s) => s.media.length === 0));
      assert(researchQueries(topic).length >= 2);
      if (count === 50) assert(calls > 3, "longer decks should retrieve additional result pages");
      checks++;
    }
  }
  console.log(
    "PASS every count 1–50 plus 16 microbiology fields at representative counts using source fixtures",
  );
  for (const count of [0, 51, 100, 400, 1.5])
    assert.throws(() => generateLocalDeck({ ...input, count }), /integer slide count/);
  console.log("PASS invalid and oversized generation requests are rejected without truncation");
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ resultList: { result: [] } }), {
      headers: { "content-type": "application/json" },
    });
  const unknown = { ...input, topic: "Uncatalogued isolate ZXQ-517 secretion system" };
  await assert.rejects(
    () => enrichTopicEvidence(generateLocalDeck(unknown), unknown),
    /not complete yet/,
  );
  assert.throws(() => assertCompleteDeck(generateLocalDeck(unknown), 25), /not complete yet/);
  const { DeckCompletionError, generationFailureMessage } = await server.ssrLoadModule(
    "/src/lib/deck-completion.ts",
  );
  const internalFailure = new DeckCompletionError(
    23,
    13,
    "Research sources supplied too little relevant text.",
  );
  assert.match(generationFailureMessage(internalFailure, 24), /24-slide deck.*13 usable/);
  assert(!generationFailureMessage(internalFailure, 24).includes("23-slide"));
  checks++;
  console.log("PASS missing evidence cannot be saved as a successful short deck");
  // A real provider outage must recover through independently retrieved abstracts.
  const { parsePubmedAbstracts, fetchPubmedAbstracts } = await server.ssrLoadModule(
    "/src/lib/pubmed-abstracts.ts",
  );
  const fixtureXml = `<PubmedArticleSet><PubmedArticle><MedlineCitation><PMID>920001</PMID><Article><ArticleTitle>Bacterial quorum signalling software fixture</ArticleTitle><Abstract><AbstractText>Bacterial quorum <i>signalling</i> in fixture dataset 17 provides an attributed sentence long enough for software testing. A separate bacterial quorum signalling observation in dataset 17 is synthetic test material and requires review.</AbstractText></Abstract><Journal><Title>Software fixture</Title><JournalIssue><PubDate><Year>2026</Year></PubDate></JournalIssue></Journal></Article></MedlineCitation></PubmedArticle></PubmedArticleSet>`;
  assert.match(
    parsePubmedAbstracts(fixtureXml, ["920001"])[0].abstractText,
    /quorum signalling in/,
  );
  assert.throws(() => parsePubmedAbstracts(fixtureXml, ["123"]), /identity mismatch/);
  assert.throws(
    () => parsePubmedAbstracts('<!ENTITY bad "payload">' + fixtureXml, ["920001"]),
    /Invalid/,
  );
  const ownIds = fixtureXml.replace(
    "</PubmedArticle>",
    '<PubmedData><ReferenceList><Reference><ArticleIdList><ArticleId IdType="doi">10.1234/foreign</ArticleId></ArticleIdList></Reference></ReferenceList><ArticleIdList><ArticleId IdType="doi">10.1234/original</ArticleId></ArticleIdList></PubmedData></PubmedArticle>',
  );
  assert.equal(parsePubmedAbstracts(ownIds, ["920001"])[0].doi, "10.1234/original");
  const manyIds = Array.from({ length: 60 }, (_, i) => String(930000 + i));
  let batches = [];
  globalThis.fetch = async (url) => {
    if (String(url).includes("esearch.fcgi"))
      return new Response(JSON.stringify({ esearchresult: { idlist: manyIds } }));
    const ids = new URL(url).searchParams.get("id").split(",");
    batches.push(ids);
    const rows = ids.map((id) =>
      fixtureXml.match(/<PubmedArticle>.*<\/PubmedArticle>/s)[0].replace("920001", id),
    );
    return new Response(`<PubmedArticleSet>${rows.join("")}</PubmedArticleSet>`);
  };
  assert.equal(
    (await fetchPubmedAbstracts("software fixture", new AbortController().signal)).length,
    60,
  );
  assert.deepEqual(
    batches.map((b) => b.length),
    [25, 25, 10],
  );
  const noSource = { ...input, topic: "Bacterial quorum signalling", count: 2 };
  const failoverSeed = generateLocalDeck(noSource);
  failoverSeed.slides = [failoverSeed.slides[0]];
  globalThis.fetch = async (url) =>
    String(url).includes("esearch.fcgi")
      ? new Response(JSON.stringify({ esearchresult: { idlist: ["920001"] } }))
      : String(url).includes("efetch.fcgi")
        ? new Response(fixtureXml)
        : new Response(JSON.stringify({ resultList: { result: [] } }));
  const recovered = await enrichTopicEvidence(failoverSeed, noSource);
  assert.equal(recovered.slides.length, 2);
  assert.equal(recovered.slides[1].citations[0].pmid, "920001");
  assert.match(recovered.slides[1].notes, /publication abstract/);
  assert(recovered.slides[1].claims.every((c) => c.status === "supported-excerpt"));
  assert.equal(failoverSeed.slides.length, 1, "Failover must not mutate the active source deck");
  assert(
    researchQueries("Please create a detailed presentation on bacterial genomes").some(
      (q) => !/please|create|detailed|presentation/.test(q),
    ),
  );
  assert(
    researchQueries("Genomes in bacteria archaea and fungi").some(
      (q) => q.includes('"bacteria" OR "bacterial"') && !q.includes(') AND ("archaea"'),
    ),
  );
  checks++;
  console.log(
    "PASS independent PubMed abstract failover, ordered inline text, identity/entity rejection and comparative queries",
  );
  const { generateLocalAiDeck } = await server.ssrLoadModule("/src/lib/local-ai.ts");
  globalThis.localStorage = {
    getItem: () => JSON.stringify({ url: "http://localhost:11434", model: "test-model" }),
  };
  let modelCalls = 0;
  globalThis.fetch = async (_url, options) => {
    modelCalls++;
    const prompt = JSON.parse(options.body).messages.at(-1).content;
    let content;
    if (prompt.startsWith("Plan exactly"))
      content = { headings: Array.from({ length: 40 }, (_, i) => `Distinct concept ${i + 1}`) };
    else {
      const headings = JSON.parse(prompt.split("Batch headings JSON: ")[1].split("\n")[0]);
      content = {
        slides: headings.map((title) => ({
          layout: "content",
          title,
          bullets: [
            `${title} explanation for the model response fixture.`,
            `${title} is independently represented in this fixture.`,
          ],
          notes: "AI fixture only",
        })),
      };
    }
    return new Response(JSON.stringify({ message: { content: JSON.stringify(content) } }), {
      headers: { "content-type": "application/json" },
    });
  };
  const ai = await generateLocalAiDeck({ ...input, count: 41 });
  assert.equal(ai.slides.length, 41);
  assert.equal(modelCalls, 6);
  assertCompleteDeck(ai, 41);
  checks++;
  console.log("PASS batched local AI completes 41 slides beyond the old 36-slide ceiling");
  const records = new Map();
  globalThis.window = {
    __TAURI_INTERNALS__: {
      invoke: async (cmd, args) => {
        if (cmd === "local_ai_request")
          return (
            await globalThis.fetch(args.url, {
              method: args.body ? "POST" : "GET",
              body: args.body,
            })
          ).text();
        if (cmd === "state_get") return records.get(args.key) || null;
        if (cmd === "state_put") {
          if (args.value === null) records.delete(args.key);
          else records.set(args.key, args.value);
          return;
        }
        throw new Error("Unexpected test command");
      },
    },
  };
  const completeFetch = globalThis.fetch;
  let resumedCalls = 0;
  globalThis.fetch = async (...args) => {
    resumedCalls++;
    if (resumedCalls === 4) throw new Error("Injected local-model interruption");
    return completeFetch(...args);
  };
  await assert.rejects(() => generateLocalAiDeck({ ...input, count: 41 }), /Injected/);
  assert.equal(JSON.parse(records.get("local-ai-checkpoint")).rows.length, 16);
  const callsBeforeResume = resumedCalls;
  const resumed = await generateLocalAiDeck({ ...input, count: 41 });
  assertCompleteDeck(resumed, 41);
  assert.equal(
    resumedCalls - callsBeforeResume,
    3,
    "Resume must reuse the outline and first two completed batches",
  );
  assert.equal(JSON.parse(records.get("local-ai-checkpoint")).rows.length, 40);
  checks++;
  console.log(
    "PASS interrupted local-model generation resumes completed batches without regenerating them",
  );
  console.log(`${checks} requested-count and cross-discipline generation checks passed.`);
} finally {
  globalThis.fetch = originalFetch;
  if (originalStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = originalStorage;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  await server.close();
}
