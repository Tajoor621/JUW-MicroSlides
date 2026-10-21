import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { benchmarkPlan } from "./benchmark-plan.mjs";
import { summarizeMatrix } from "./scientific-matrix-summary.mjs";
const commit = "a".repeat(40),
  fingerprint = "b".repeat(64);
test("GitHub output is a real newline-delimited matrix value parseable by fromJSON", async () => {
  const directory = await mkdtemp(join(tmpdir(), "juw-matrix-"));
  try {
    const output = join(directory, "output");
    const log = execFileSync(process.execPath, ["scripts/plan-scientific-matrix.mjs"], {
      env: {
        ...process.env,
        GITHUB_OUTPUT: output,
        JUW_BENCH_START: "0",
        JUW_BENCH_LIMIT: "200",
        JUW_BENCH_STRIDE: "1",
        JUW_BENCH_COUNTS: "all",
      },
      encoding: "utf8",
    });
    const raw = await readFile(output, "utf8");
    assert(raw.endsWith("\n"));
    const topics = JSON.parse(raw.trim().slice("topics=".length));
    assert.deepEqual(
      topics,
      Array.from({ length: 200 }, (_, i) => i),
    );
    assert.equal(JSON.parse(log).plannedRequests, 10000);
    const workflow = await readFile(".github/workflows/scientific-matrix.yml", "utf8");
    assert(workflow.includes("run: node scripts/plan-scientific-matrix.mjs"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
function fixture() {
  const plan = benchmarkPlan([{ id: "topic-1", requestedCount: 1 }], {
    JUW_BENCH_LIMIT: "1",
    JUW_BENCH_COUNTS: "1,25,50",
  });
  return {
    plan,
    report: {
      commit,
      sourceFingerprint: fingerprint,
      workingTreeDirty: false,
      results: plan.jobs.map((job) => ({
        id: job.id,
        caseId: job.caseId,
        requested: job.requestedCount,
        actual: job.requestedCount,
        completed: true,
        lexicalDuplicatePairs: 0,
        claims: 2,
        claimsWithPassages: 2,
        elapsedMs: 100,
        publicationChecks: [{ complete: false, status: "unknown" }],
      })),
    },
  };
}
test("complete generation never becomes independent scientific or hardware approval", () => {
  const { plan, report } = fixture();
  const result = summarizeMatrix(plan, [report], commit);
  assert.equal(result.status, "generation-contracts-complete");
  assert.equal(result.completed, 3);
  assert.equal(result.unresolvedPublicationChecks, 3);
  assert.equal(result.classroomQualified, false);
  assert.equal(result.scientificVerdict, "needs-independent-review");
});
test("missing, repeated, foreign, failed and mixed-source results cannot satisfy the matrix", () => {
  const { plan, report } = fixture();
  for (const mutate of [
    (r) => r.results.pop(),
    (r) => r.results.push(r.results[0]),
    (r) => (r.results[0].actual = 2),
    (r) => (r.results[0].completed = false),
    (r) => (r.results[0].claimsWithPassages = 1),
    (r) => (r.commit = "c".repeat(40)),
    (r) => (r.results[0].id = "foreign"),
    (r) => (r.workingTreeDirty = true),
  ]) {
    const copy = structuredClone(report);
    mutate(copy);
    assert.equal(summarizeMatrix(plan, [copy], commit).status, "failed-or-incomplete");
  }
  assert.equal(summarizeMatrix(plan, [], commit).missing.length, 3);
  assert.equal(summarizeMatrix(plan, [null], commit).status, "failed-or-incomplete");
});
