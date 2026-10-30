import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
test("OpenAlex extraction rejects missing words, overlaps and malformed positions", async () => {
  const server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true },
    logLevel: "error",
  });
  try {
    const { reconstructOpenAlexAbstract: f } = await server.ssrLoadModule(
      "/src/lib/openalex-research.ts",
    );
    assert.equal(f({ A: [0], complete: [1], sentence: [2] }), "A complete sentence");
    for (const malformed of [
      { A: [0], sentence: [2] },
      { A: [0], not: [0] },
      { A: [0], word: [-1] },
      { A: [0], word: [5000] },
      { A: ["0"] },
      {},
      null,
      [],
    ])
      assert.equal(f(malformed), null);
  } finally {
    await server.close();
  }
});
