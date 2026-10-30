import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
test("source selections retain global IDs across batches and resume without repeating completed inference", async () => {
  const vite = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: "error",
  });
  const old = {
    fetch: globalThis.fetch,
    window: globalThis.window,
    localStorage: globalThis.localStorage,
  };
  const records = new Map();
  try {
    const { generateLocalAiDeck } = await vite.ssrLoadModule("/src/lib/local-ai.ts");
    const citation = {
      id: "synthetic-fixture",
      title:
        "Real-time visualisation of the intracellular dynamics of conjugative plasmid transfer",
      authors: "Couturier et al.",
      year: "2023",
      journal: "Nature Communications",
      doi: "10.1038/s41467-023-35978-3",
      pmid: "36653393",
      url: "https://pubmed.ncbi.nlm.nih.gov/36653393/",
    };
    // Artificial test wording, not quotations from the bibliographic record.
    const slides = Array.from({ length: 12 }, (_, i) => {
      const text = `Synthetic source statement number ${i + 1} validates selection indexing in this software fixture only.`;
      return {
        id: `s${i}`,
        layout: "content",
        title: `Fixture ${i + 1}`,
        subtitle: "",
        theme: "molecular",
        notes: "",
        bullets: [text],
        leftBullets: [],
        rightBullets: [],
        media: [],
        citations: [citation],
        claims: [
          {
            id: `c${i}`,
            text,
            status: "supported-excerpt",
            evidence: [
              {
                citationId: citation.id,
                sourceUrl: citation.url,
                quote: text,
                locator: "Synthetic fixture",
                access: "abstract",
                checkedAt: 1,
              },
            ],
          },
        ],
      };
    });
    const source = {
      slides: [{ ...slides[0], layout: "title", bullets: [], claims: [] }, ...slides],
    };
    const input = {
      topic: "Software selection fixture",
      count: 13,
      level: "Undergraduate",
      discipline: "General Microbiology",
      notes: "",
      mode: "ai",
    };
    globalThis.localStorage = {
      getItem: () => JSON.stringify({ url: "http://localhost:11434", model: "fixture" }),
    };
    globalThis.window = {
      __TAURI_INTERNALS__: {
        invoke: async (cmd, args) => {
          if (cmd === "state_get") return records.get(args.key) || null;
          if (cmd === "state_put") {
            records.set(args.key, args.value);
            return;
          }
          if (cmd === "local_ai_request")
            return (await globalThis.fetch(args.url, { body: args.body })).text();
          throw Error(`Unexpected test command ${cmd}`);
        },
      },
    };
    let calls = 0,
      fail = true;
    globalThis.fetch = async (url, options) => {
      if (String(url).endsWith("/api/show"))
        return Response.json({ thinking: { values: [false] } });
      calls++;
      const prompt = JSON.parse(options.body).messages.at(-1).content;
      let response;
      if (prompt.startsWith("Plan exactly")) response = { headings: slides.map((s) => s.title) };
      else {
        if (calls === 3 && fail) throw Error("Injected second-batch interruption");
        const pack = JSON.parse(prompt.split("Source statements: ")[1].split("\nSource pack:")[0]);
        response = {
          slides: [...new Set(pack.map((p) => p.slide))].map((n) => ({
            title: `Fixture ${n}`,
            sourceStatementIds: pack.filter((p) => p.slide === n).map((p) => p.id),
          })),
        };
      }
      return Response.json({ message: { content: JSON.stringify(response) } });
    };
    await assert.rejects(generateLocalAiDeck(input, undefined, source), /second-batch/);
    assert.equal(JSON.parse(records.get("local-ai-checkpoint")).rows.length, 8);
    const before = calls;
    fail = false;
    const made = await generateLocalAiDeck(input, undefined, source);
    assert.equal(calls - before, 1);
    assert.equal(made.slides.length, 13);
    made.slides.slice(1).forEach((s, i) => assert.deepEqual(s.bullets, slides[i].bullets));
    assert(
      !JSON.stringify(made).includes("sourceStatementIds"),
      "Internal model IDs do not leak into saved slide fields",
    );
  } finally {
    globalThis.fetch = old.fetch;
    for (const name of ["window", "localStorage"]) {
      if (old[name] === undefined) delete globalThis[name];
      else globalThis[name] = old[name];
    }
    await vite.close();
  }
});
