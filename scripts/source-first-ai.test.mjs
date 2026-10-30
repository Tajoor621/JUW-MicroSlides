import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

test("public AI generation retrieves first, rejects unsupported model text and fails safely", async () => {
  const server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true },
    logLevel: "error",
  });
  const oldFetch = globalThis.fetch,
    oldStorage = globalThis.localStorage;
  // Artificial test passages are not quotations from this real bibliographic record.
  const paragraphs = [
    "This synthetic conjugation fixture describes an artificial observation for software checks and is not teaching evidence. Its purpose is to check preservation of contiguous source wording without inventing scientific results.",
    "A separate synthetic conjugation fixture compares artificial classification labels within this test dataset only. This comparison illustrates a different software pathway and does not describe biological findings or recommendations.",
  ];
  const input = {
    topic: "Conjugation software fixture",
    discipline: "General Microbiology",
    level: "Undergraduate",
    count: 3,
    notes: "",
    mode: "ai",
    researchDepth: "quick",
    includeObjectives: false,
    includeAssessment: false,
  };
  let mode = "good",
    calls = [];
  const controller = new AbortController();
  try {
    const { generateAiDeck } = await server.ssrLoadModule("/src/lib/browser-services.ts");
    globalThis.localStorage = {
      getItem: () => JSON.stringify({ url: "http://localhost:11434", model: "software-fixture" }),
    };
    globalThis.fetch = async (url, options) => {
      if (String(url).endsWith("/api/show"))
        return Response.json({ thinking: { values: [false] } });
      const local = String(url).startsWith("http://localhost:11434");
      calls.push(local ? "model" : "source");
      if (!local) {
        if (mode === "cancel") controller.abort();
        return Response.json({
          resultList: {
            result:
              mode === "empty"
                ? []
                : [
                    {
                      id: "36653393",
                      source: "MED",
                      pmid: "36653393",
                      doi: "10.1038/s41467-023-35978-3",
                      title:
                        "Real-time visualisation of the intracellular dynamics of conjugative plasmid transfer",
                      pubYear: "2023",
                      authorString: "Couturier et al.",
                      abstractText: paragraphs.join("\n\n"),
                    },
                  ],
          },
          results: [],
          esearchresult: { idlist: [] },
        });
      }
      if (mode === "model-error") return new Response("Unavailable", { status: 503 });
      const request = JSON.parse(options.body);
      const prompt = request.messages.at(-1).content;
      assert.equal(request.think, false);
      assert.equal(request.format.type, "object");
      const items =
        request.format.properties[prompt.startsWith("Plan exactly") ? "headings" : "slides"];
      assert.equal(items.minItems, 2);
      assert.equal(items.maxItems, 2);
      assert(
        prompt.includes("Source pack:"),
        "inference must receive an independently retrieved source pack",
      );
      let content = prompt.startsWith("Plan exactly")
        ? { headings: ["First fixture", "Second fixture"] }
        : {
            slides: paragraphs.map((p, i) => ({
              title: `Fixture ${i}`,
              layout: "content",
              bullets: [p.split(". ")[0] + ".", `Unsupported model assertion ${i}: 99% recovery.`],
              notes: "Unsupported model mechanism.",
              teaching: { mechanism: "Unsupported model mechanism." },
            })),
          };
      if (
        !prompt.startsWith("Plan exactly") &&
        ["ids", "wrong-ids", "repeated-ids"].includes(mode)
      ) {
        const pack = JSON.parse(prompt.split("Source statements: ")[1].split("\nSource pack:")[0]);
        content = {
          slides: [1, 2].map((slide) => ({
            title: `Selection ${slide}`,
            sourceStatementIds: pack
              .filter((s) => s.slide === slide)
              .slice(0, 2)
              .map((s) => s.id),
          })),
        };
        if (mode === "wrong-ids")
          content.slides[0].sourceStatementIds = content.slides[1].sourceStatementIds;
        if (mode === "repeated-ids")
          content.slides[0].sourceStatementIds = Array(2).fill(
            content.slides[0].sourceStatementIds[0],
          );
      }
      return Response.json({ message: { content: JSON.stringify(content) } });
    };
    const result = await generateAiDeck({ data: input });
    assert.equal(result.ok, true, result.error);
    assert.equal(calls[0], "source");
    assert(calls.includes("model"));
    assert.equal(result.deck.slides.length, 3);
    for (const slide of result.deck.slides.slice(1)) {
      assert(slide.citations.some((c) => c.pmid === "36653393"));
      assert(!JSON.stringify(slide).includes("99%"));
      assert(!JSON.stringify(slide).includes("Unsupported model mechanism"));
    }
    mode = "ids";
    const selected = await generateAiDeck({ data: input });
    assert.equal(selected.ok, true);
    assert.equal(selected.deck.generationSource, "local-ai");
    assert.equal(selected.deck.slides.length, 3);
    assert(!selected.deck.contentWarnings.some((s) => s.includes("Local AI drafting failed")));
    for (const invalidMode of ["wrong-ids", "repeated-ids"]) {
      mode = invalidMode;
      const safe = await generateAiDeck({ data: input });
      assert.equal(safe.ok, true);
      assert.equal(safe.deck.generationSource, "knowledge");
      assert(safe.deck.contentWarnings.some((s) => s.includes("Local AI drafting failed")));
    }
    mode = "empty";
    calls = [];
    const failed = await generateAiDeck({ data: input });
    assert.equal(failed.ok, false);
    assert.equal(failed.deck, undefined);
    assert(!calls.includes("model"));
    assert.match(failed.error, /Existing work was kept/);
    mode = "model-error";
    calls = [];
    const fallback = await generateAiDeck({ data: input });
    assert.equal(fallback.ok, true);
    assert.equal(fallback.deck.slides.length, 3);
    assert(fallback.deck.contentWarnings.some((s) => s.includes("Local AI drafting failed")));
    mode = "cancel";
    await assert.rejects(generateAiDeck({ data: input, signal: controller.signal }), /abort/i);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = oldStorage;
    await server.close();
  }
});
