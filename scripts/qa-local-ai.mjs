// Optional live qualification. No installed model/server is downloaded or started here.
// No fetch/model response fixtures and no writes to the lecturer's saved workspace.
import assert from "node:assert/strict";
import { createServer } from "vite";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const output = resolve(process.env.JUW_QA_OUTPUT || "qualification-results/local-ai");
await mkdir(output, { recursive: true });
const originalFetch = globalThis.fetch,
  originalStorage = globalThis.localStorage;
const report = {
  checkedAt: new Date().toISOString(),
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  runnerSha256: createHash("sha256")
    .update(await readFile(new URL(import.meta.url)))
    .digest("hex"),
  status: "not-tested",
  scientificAccuracyEvaluated: false,
  browserCorsEvaluated: false,
  physicalDeviceEvaluated: false,
  modelCalls: [],
  sourceRequests: 0,
};
const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false },
  logLevel: "error",
});
try {
  const { validateLocalAiUrl, probeLocalAi } = await server.ssrLoadModule("/src/lib/local-ai.ts");
  const { generateAiDeck } = await server.ssrLoadModule("/src/lib/browser-services.ts");
  const { assertCompleteDeck } = await server.ssrLoadModule("/src/lib/deck-completion.ts");
  const { supportedSlideSentences } = await server.ssrLoadModule("/src/lib/source-grounding.ts");
  const url = validateLocalAiUrl(process.env.JUW_OLLAMA_URL || "http://127.0.0.1:11434");
  const model = process.env.JUW_OLLAMA_MODEL?.trim();
  if (!model)
    throw Error(
      "Set JUW_OLLAMA_MODEL to an already installed local model; no inference performed.",
    );
  const versionResponse = await originalFetch(`${url}/api/version`, {
    signal: AbortSignal.timeout(8000),
  });
  assert(versionResponse.ok, "Ollama version probe failed");
  report.ollama = await versionResponse.json();
  const tags = await (
    await originalFetch(`${url}/api/tags`, { signal: AbortSignal.timeout(8000) })
  ).json();
  const installed = tags.models?.find((m) => m.name === model || m.name === `${model}:latest`);
  assert(installed?.digest, "The requested installed model has no recorded digest");
  report.model = {
    name: installed.name,
    digest: installed.digest,
    bytes: installed.size,
    details: installed.details,
  };
  const ready = await probeLocalAi({ url, model });
  assert(ready.generationReady, "Local model is not installed");
  // Configuration shim only: inference and literature requests use real endpoints.
  globalThis.localStorage = {
    getItem: (key) => (key === "juw-local-ai" ? JSON.stringify({ url, model }) : null),
  };
  globalThis.fetch = async (target, options) => {
    const isInference = String(target) === `${url}/api/chat`;
    if (!String(target).startsWith(url)) report.sourceRequests++;
    const start = performance.now();
    try {
      const response = await originalFetch(target, options);
      if (isInference) {
        const body = await response.clone().json();
        report.modelCalls.push({
          status: response.status,
          durationMs: Math.round(performance.now() - start),
          responseCharacters: body.message?.content?.length || 0,
          thinkingCharacters: body.message?.thinking?.length || 0,
          doneReason: body.done_reason,
          evalCount: body.eval_count,
        });
      }
      return response;
    } catch (error) {
      if (isInference)
        report.modelCalls.push({
          error: String(error),
          durationMs: Math.round(performance.now() - start),
        });
      throw error;
    }
  };
  const input = {
    topic: "Bacterial conjugation",
    discipline: "Microbial Genetics & Molecular Biology",
    level: "Undergraduate",
    count: 3,
    notes: "",
    mode: "ai",
    generationMode: "standard",
    researchDepth: "quick",
    includeObjectives: false,
    includeAssessment: false,
  };
  const start = performance.now();
  const result = await generateAiDeck({
    data: input,
    signal: AbortSignal.timeout(240000),
    progress: (s) => console.log(s),
  });
  assert(result.ok, result.error);
  const deck = assertCompleteDeck(result.deck, input.count);
  assert(report.modelCalls.length, "No actual local-model call occurred");
  assert.equal(new Set(deck.slides.slice(1).map((s) => s.bullets.join(" "))).size, 2);
  for (const slide of deck.slides.slice(1)) {
    assert(slide.citations.length, "Missing source reference");
    assert(
      supportedSlideSentences(slide, deck.sourceDocuments).length,
      "Missing bound source passage",
    );
  }
  report.elapsedMs = Math.round(performance.now() - start);
  report.slides = deck.slides.length;
  report.contentSlides = deck.slides.slice(1).map((s) => ({
    title: s.title,
    statements: s.bullets.length,
    references: s.citations.map((c) => ({ doi: c.doi, pmid: c.pmid, url: c.url })),
  }));
  const fallback = deck.contentWarnings?.some((s) => s.includes("Local AI drafting failed"));
  report.status = fallback ? "live-source-fallback-verified" : "live-source-grounded-ai-completed";
  report.generationSource = deck.generationSource;
  const kept = deck.contentWarnings?.find((s) =>
    /\d+ slides retained retrieved source wording/.test(s),
  );
  report.sourceSlidesRetained = kept ? Number(kept.match(/(\d+) slides retained/)[1]) : null;
  if (!fallback && report.sourceSlidesRetained === 2) {
    report.status = "live-ai-filtering-verified";
    report.reason =
      "Inference completed but all model slide bodies were rejected or repeated. The retrieved source draft was retained; this does not qualify the model as a lecture writer.";
  }
  if (fallback) {
    report.reason =
      "Real local inference failed; the complete retrieved source draft was retained. Model generation is not qualified.";
    process.exitCode = 2;
  }
} catch (error) {
  report.status = report.modelCalls.length ? "live-test-incomplete" : "not-tested";
  report.reason = error instanceof Error ? error.message : String(error);
  process.exitCode = 2;
} finally {
  globalThis.fetch = originalFetch;
  if (originalStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = originalStorage;
  await server.close();
  report.limitations =
    "One real CPU/server/source run, not clinical or microbiology qualification, independent assessment, browser/PNA acceptance or physical-device testing. No model is bundled in the app. Raw prompts, responses and source text are not retained in this report.";
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
