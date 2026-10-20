import { createServer } from "vite";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const corpus = JSON.parse(await readFile("benchmarks/semantic-pairs.json", "utf8"));
const output = "qualification-results/semantic";
await mkdir(output, { recursive: true });
const model = process.env.JUW_EMBEDDING_MODEL;
if (!model) {
  await writeFile(
    `${output}/report.json`,
    JSON.stringify(
      {
        status: "not-tested",
        reason: "No installed local embedding model was supplied.",
        independentCalibration: false,
      },
      null,
      2,
    ),
  );
  console.error("No model supplied; no semantic qualification was performed.");
  process.exit(2);
}
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  optimizeDeps: { noDiscovery: true, entries: [] },
  logLevel: "error",
});
try {
  const { validateLocalAiUrl } = await server.ssrLoadModule("/src/lib/local-ai.ts");
  const { compareEmbeddings } = await server.ssrLoadModule("/src/lib/semantic-review.ts");
  const url = validateLocalAiUrl(process.env.JUW_EMBEDDING_URL || "http://localhost:11434");
  const results = [];
  for (const c of corpus.cases) {
    const r = await fetch(`${url}/api/embed`, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({ model, input: [c.a, c.b], truncate: false }),
    });
    if (!r.ok) throw Error(`Embedding ${r.status}`);
    const data = await r.json();
    const findings = compareEmbeddings(
      [
        { text: c.a, index: 0 },
        { text: c.b, index: 1 },
      ],
      data.embeddings,
      corpus.threshold,
    );
    results.push({
      ...c,
      model: data.model,
      score: findings[0]?.similarity ?? null,
      candidate: findings[0]?.kind ?? "none",
      detected: findings.length > 0,
    });
  }
  const tp = results.filter(
    (r) => r.proposedLabel === "repetition" && r.candidate === "possible-repetition",
  ).length;
  const fp = results.filter(
    (r) => r.proposedLabel !== "repetition" && r.candidate === "possible-repetition",
  ).length;
  const fn = results.filter(
    (r) => r.proposedLabel === "repetition" && r.candidate !== "possible-repetition",
  ).length;
  await writeFile(
    `${output}/report.json`,
    JSON.stringify(
      {
        status: "exploratory-model-evaluation-needs-independent-calibration",
        model,
        threshold: corpus.threshold,
        checkedAt: new Date().toISOString(),
        seedPrecision: tp + fp ? tp / (tp + fp) : null,
        seedRecall: tp + fn ? tp / (tp + fn) : null,
        independentCalibration: false,
        limitations:
          "Developer-authored seed labels; no holdout, confidence interval or independent review. Do not use this exploratory score as a release accuracy metric.",
        results,
      },
      null,
      2,
    ),
  );
} finally {
  await server.close();
}
