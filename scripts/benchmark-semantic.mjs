import { createServer } from "vite";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { digest, splitCases, evaluateScores } from "./scientific-evaluation.mjs";
const corpusRaw = await readFile(
  process.env.JUW_SEMANTIC_CORPUS || "benchmarks/semantic-pairs.json",
  "utf8",
);
const corpus = JSON.parse(corpusRaw),
  cases = splitCases(corpus.cases);
const output = process.env.JUW_SEMANTIC_OUTPUT || "qualification-results/semantic";
await mkdir(output, { recursive: true });
const report = {
  status: "not-tested",
  independentCalibration: false,
  corpusSha256: digest(corpusRaw),
  checkedAt: new Date().toISOString(),
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  dirtyWorktree: Boolean(
    execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
  ),
  partitionManifest: cases.map((c) => ({ id: c.id, domain: c.domain, partition: c.partition })),
  model: process.env.JUW_EMBEDDING_MODEL,
};
let server;
try {
  if (!report.model)
    throw Error(
      "No installed local embedding model supplied; no semantic qualification performed.",
    );
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
    optimizeDeps: { noDiscovery: true, entries: [] },
    logLevel: "error",
  });
  const { validateLocalAiUrl } = await server.ssrLoadModule("/src/lib/local-ai.ts");
  const { cosine } = await server.ssrLoadModule("/src/lib/semantic-review.ts");
  const url = validateLocalAiUrl(process.env.JUW_EMBEDDING_URL || "http://localhost:11434");
  const tags = await fetch(`${url}/api/tags`, {
    signal: AbortSignal.timeout(10000),
    credentials: "omit",
  });
  if (!tags.ok) throw Error("Cannot establish installed model digest");
  const installed = (await tags.json()).models?.find(
    (m) =>
      m.name === report.model || m.model === report.model || m.name === `${report.model}:latest`,
  );
  if (!installed?.digest) throw Error("Model not installed or digest missing");
  report.modelDigest = installed.digest;
  report.options = {
    truncate: false,
    thresholdSelection: "maximum calibration F1; precision then higher threshold break ties",
    runtime: "Ollama /api/embed",
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  };
  report.results = [];
  const start = performance.now();
  let returnedModel, dimensions;
  for (const c of cases) {
    const r = await fetch(`${url}/api/embed`, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({ model: report.model, input: [c.a, c.b], truncate: false }),
    });
    if (!r.ok) throw Error(`Embedding ${r.status}`);
    const data = await r.json();
    if (!data.model || (returnedModel && returnedModel !== data.model))
      throw Error("Model identity missing or changed");
    returnedModel = data.model;
    if (
      !Array.isArray(data.embeddings) ||
      data.embeddings.length !== 2 ||
      data.embeddings.some(
        (e) =>
          !Array.isArray(e) ||
          !e.length ||
          e.length > 8192 ||
          (dimensions && e.length !== dimensions),
      )
    )
      throw Error("Invalid or inconsistent embedding batch");
    dimensions = data.embeddings[0].length;
    report.results.push({ ...c, score: cosine(...data.embeddings) });
  }
  const finalTags = await fetch(`${url}/api/tags`, {
    signal: AbortSignal.timeout(10000),
    credentials: "omit",
  });
  if (
    !finalTags.ok ||
    !(await finalTags.json()).models?.some(
      (m) => m.digest === installed.digest && m.name === installed.name,
    )
  )
    throw Error("Installed model changed during evaluation");
  Object.assign(report, {
    status: "exploratory-development-evaluation",
    returnedModel,
    dimensions,
    elapsedMs: Math.round(performance.now() - start),
    evaluation: evaluateScores(report.results),
    productionThresholdChanged: false,
    independentCalibration: false,
  });
} catch (error) {
  report.reason = error instanceof Error ? error.message : String(error);
  report.status = report.model ? "incomplete" : "not-tested";
  process.exitCode = 2;
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await server?.close();
  console.log(
    `${report.status}: ${report.reason || "raw cosine scores and domain-separated evaluation saved; independent qualification remains pending"}`,
  );
}
