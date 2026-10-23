import { benchmarkPlan } from "./benchmark-plan.mjs";
// Real literature retrieval; no network/model fixtures. This is not an independent scientific verdict.
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const sourceHash = createHash("sha256");
const tracked = execFileSync(
  "git",
  [
    "ls-files",
    "-co",
    "--exclude-standard",
    "src",
    "scripts",
    "benchmarks",
    "package.json",
    "package-lock.json",
  ],
  { encoding: "utf8" },
)
  .trim()
  .split("\n");
for (const path of [...new Set(tracked)].sort()) {
  sourceHash.update(path);
  sourceHash.update(await readFile(path));
}
const sourceFingerprint = sourceHash.digest("hex");
const workingTreeDirty = Boolean(
  execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
);
const corpus = JSON.parse(await readFile("benchmarks/microbiology-topics.json", "utf8"));
const plan = benchmarkPlan(corpus.cases);
const { start, stride } = plan;
const selectedCases = plan.jobs;
const output = process.env.JUW_BENCH_OUTPUT || "qualification-results/live";
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  optimizeDeps: { noDiscovery: true, entries: [] },
  logLevel: "error",
});
const results = [];
try {
  const { generateLocalDeck } = await server.ssrLoadModule("/src/lib/generate-deck.ts");
  const { enrichTopicEvidence } = await server.ssrLoadModule("/src/lib/topic-evidence.ts");
  const { assertCompleteDeck } = await server.ssrLoadModule("/src/lib/deck-completion.ts");
  const { integrityAudit, duplicateStatements } = await server.ssrLoadModule(
    "/src/lib/deck-integrity.ts",
  );
  const { checkPublication } = await server.ssrLoadModule("/src/lib/publication-status.ts");
  await mkdir(output, { recursive: true });
  for (const c of selectedCases) {
    const input = {
      topic: c.topic,
      discipline: c.domain,
      count: c.requestedCount,
      level: c.level,
      notes: "",
      mode: "manual",
    };
    const t = performance.now();
    try {
      // Force literature-backed content rather than awarding a pass for bundled knowledge.
      const seed = generateLocalDeck(input);
      seed.slides = c.requestedCount === 1 ? [] : seed.slides.slice(0, 1);
      const deck = await enrichTopicEvidence(seed, input, undefined, (message) =>
        console.log(`${c.id}: ${message}`),
      );
      assertCompleteDeck(deck, c.requestedCount);
      const refs = [
        ...new Map(
          deck.slides.flatMap((s) => s.citations).map((r) => [r.doi || r.pmid || r.id, r]),
        ).values(),
      ];
      for (let i = 0; i < refs.length; i += 3)
        await Promise.all(
          refs.slice(i, i + 3).map(async (r) => {
            r.publicationCheck = await checkPublication(r);
          }),
        );
      const claims = deck.slides.flatMap((s) => s.claims || []),
        full = claims.filter((c) =>
          c.evidence.some(
            (e) => e.access === "full-text" || e.access === "textbook" || e.access === "guideline",
          ),
        ).length;
      const result = {
        id: c.id,
        caseId: c.caseId,
        topic: c.topic,
        domain: c.domain,
        requested: c.requestedCount,
        actual: deck.slides.length,
        completed: true,
        elapsedMs: Math.round(performance.now() - t),
        lexicalDuplicatePairs: duplicateStatements(deck.slides).length,
        claims: claims.length,
        claimsWithPassages: claims.filter((c) =>
          c.evidence.some((e) => e.quote && e.locator && e.sourceUrl),
        ).length,
        fullTextClaims: full,
        referenceCount: refs.length,
        publicationChecks: refs.map((r) => ({ id: r.id, ...r.publicationCheck })),
        criticalFindings: integrityAudit(deck).filter((f) => f.severity === "critical").length,
        semanticVerdict: "not-run-in-this-benchmark",
        scientificVerdict: "needs-independent-review",
        classroomReady: false,
      };
      results.push(result);
      await writeFile(`${output}/${c.id}.deck.json`, JSON.stringify(deck, null, 2));
      console.log(JSON.stringify(result));
    } catch (e) {
      results.push({
        id: c.id,
        caseId: c.caseId,
        topic: c.topic,
        requested: c.requestedCount,
        completed: false,
        elapsedMs: Math.round(performance.now() - t),
        reason: e.message,
        scientificVerdict: "not-evaluated",
      });
      console.log(`${c.id}: incomplete: ${e.message}`);
    }
    await writeFile(
      `${output}/report.json`,
      JSON.stringify(
        {
          appVersion: "V7.0",
          sourceFingerprint,
          workingTreeDirty,
          commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
          generatedAt: new Date().toISOString(),
          machine: { platform: process.platform, arch: process.arch, node: process.version },
          scope: {
            start,
            stride,
            counts: plan.counts,
            topics: plan.topics,
            planned: selectedCases.length,
            attempted: results.length,
            manifest: corpus.cases.length,
          },
          results,
          limitations:
            "Live retrieval and measured timing. No fabricated completion, semantic calibration or scientific certification. Under-five-minute readiness requires source review and representative Windows hardware, not retrieval timing alone.",
        },
        null,
        2,
      ),
    );
  }
  const times = results
    .filter((r) => r.completed)
    .map((r) => r.elapsedMs)
    .sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      attempted: results.length,
      completed: times.length,
      completionRate: times.length / results.length,
      p95RetrievalMs: times.length ? times[Math.ceil(times.length * 0.95) - 1] : null,
      scientificQualification: "pending-independent-review",
    }),
  );
  if (results.some((r) => !r.completed)) process.exitCode = 1;
} finally {
  await server.close();
}
