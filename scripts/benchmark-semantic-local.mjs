// Optional CPU benchmark. Does not install packages or download models, or alter app settings.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cpus } from "node:os";
import { digest, splitCases, evaluateScores, metrics } from "./scientific-evaluation.mjs";
const output = process.env.JUW_SEMANTIC_OUTPUT || "qualification-results/semantic-local";
await mkdir(output, { recursive: true });
const raw = await readFile("benchmarks/semantic-pairs.json", "utf8"),
  corpus = JSON.parse(raw);
const report = {
  status: "not-tested",
  checkedAt: new Date().toISOString(),
  corpusSha256: digest(raw),
  benchmarkSha256: digest(await readFile(fileURLToPath(import.meta.url), "utf8")),
  independentCalibration: false,
  scientificAccuracyEvaluated: false,
  productionThresholdChanged: false,
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  dirtyWorktree: Boolean(
    execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
  ),
  results: [],
};
let extractor;
try {
  if (!process.env.JUW_TRANSFORMERS_MODULE || !process.env.JUW_EMBEDDING_DIRECTORY)
    throw Error(
      "Supply an installed Transformers.js module and a local model directory; no inference performed.",
    );
  const dir = resolve(process.env.JUW_EMBEDDING_DIRECTORY);
  const files = [
    "config.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "special_tokens_map.json",
    "onnx/model_quantized.onnx",
  ];
  report.modelFiles = await Promise.all(
    files.map(async (path) => {
      const data = await readFile(join(dir, path));
      return { path, bytes: data.length, sha256: createHash("sha256").update(data).digest("hex") };
    }),
  );
  // Hash the actual bytes, not a mutable remote model tag.
  report.modelFingerprint = digest(report.modelFiles);
  report.modelProvenance =
    process.env.JUW_EMBEDDING_PROVENANCE || "Local model; publisher/revision not supplied";
  const modulePath = resolve(process.env.JUW_TRANSFORMERS_MODULE);
  report.runtimeModuleSha256 = createHash("sha256")
    .update(await readFile(modulePath))
    .digest("hex");
  report.runtimeVersion = JSON.parse(
    await readFile(join(dirname(modulePath), "..", "package.json"), "utf8"),
  ).version;
  report.onnxRuntimeVersion = createRequire(modulePath)("onnxruntime-node/package.json").version;
  const { pipeline, env } = await import(pathToFileURL(modulePath).href);
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  report.runtime = {
    engine: "Transformers.js / ONNX Runtime CPU",
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpu: cpus()[0]?.model,
    pooling: "mean",
    normalized: true,
    dtype: "q8",
    intraOpNumThreads: 2,
    offlineInference: true,
  };
  const start = performance.now();
  extractor = await pipeline("feature-extraction", dir, {
    local_files_only: true,
    device: "cpu",
    dtype: "q8",
    session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 },
  });
  report.loadMs = Math.round(performance.now() - start);
  const cosine = (a, b) =>
    a.reduce((s, x, i) => s + x * b[i], 0) / (Math.hypot(...a) * Math.hypot(...b));
  for (const c of splitCases(corpus.cases)) {
    const tokenized = await extractor.tokenizer([c.a, c.b], { truncation: false, padding: true });
    if (tokenized.input_ids.dims[1] > extractor.model.config.max_position_embeddings)
      throw Error("Pair exceeds model context; truncation forbidden");
    const output = await extractor([c.a, c.b], {
      pooling: "mean",
      normalize: true,
      truncation: false,
    });
    const vectors = output.tolist();
    if (
      vectors.length !== 2 ||
      vectors.some((v) => !v.length || v.some((x) => !Number.isFinite(x)))
    )
      throw Error("Invalid model output");
    report.results.push({ ...c, dimensions: vectors[0].length, score: cosine(...vectors) });
  }
  Object.assign(report, {
    status: "exploratory-development-evaluation",
    qualification: {
      status: "not-qualified",
      independentlyLabelled: false,
      externalHoldout: false,
      productionThresholdChanged: false,
    },
    totalMs: Math.round(performance.now() - start),
    evaluation: evaluateScores(report.results),
    fixedProductionThresholdEvaluation: metrics(report.results, 0.9),
  });
} catch (error) {
  report.status = report.results.length ? "incomplete" : "not-tested";
  report.reason = error instanceof Error ? error.message : String(error);
  process.exitCode = 2;
} finally {
  await extractor?.dispose();
  report.limitations =
    "Real CPU embedding evaluation on public developer/AI-reviewed labels, not independent scientific validation. The evaluation partition is not an external blind holdout. Results cannot certify factual truth, contradiction detection, or arbitrary topics. Model/runtime files are fingerprinted; no model is bundled in the app.";
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        status: report.status,
        reason: report.reason,
        pairs: report.results.length,
        selectedThreshold: report.evaluation?.selectedThreshold,
        evaluation: report.evaluation?.evaluation,
        fixedProductionThresholdEvaluation: report.fixedProductionThresholdEvaluation,
        loadMs: report.loadMs,
        totalMs: report.totalMs,
      },
      null,
      2,
    ),
  );
}
