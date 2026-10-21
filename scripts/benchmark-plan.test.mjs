import { test } from "node:test";
import assert from "node:assert/strict";
import { benchmarkPlan } from "./benchmark-plan.mjs";
const cases = Array.from({ length: 200 }, (_, i) => ({ id: `topic-${i}`, requestedCount: 25 }));
test("complete topic/count matrix has unique archival IDs and no omissions", () => {
  const plan = benchmarkPlan(cases, { JUW_BENCH_LIMIT: "200", JUW_BENCH_COUNTS: "all" });
  assert.equal(plan.jobs.length, 10000);
  assert.equal(new Set(plan.jobs.map((j) => j.id)).size, 10000);
  for (const c of cases)
    assert.deepEqual(
      plan.jobs.filter((j) => j.caseId === c.id).map((j) => j.requestedCount),
      Array.from({ length: 50 }, (_, i) => i + 1),
    );
});
test("balanced sampling and explicit counts preserve topic identity", () => {
  const p = benchmarkPlan(cases, {
    JUW_BENCH_STRIDE: "10",
    JUW_BENCH_LIMIT: "20",
    JUW_BENCH_COUNTS: "1,25,50",
  });
  assert.equal(p.topics, 20);
  assert.equal(p.jobs.length, 60);
  assert.equal(p.jobs[3].caseId, "topic-10");
  assert.equal(benchmarkPlan(cases, {}).jobs[0].id, "topic-0");
});
test("invalid selections fail without silently clamping counts", () => {
  for (const counts of ["0", "51", "1.5", "1,1", "1,", "nope"])
    assert.throws(() => benchmarkPlan(cases, { JUW_BENCH_COUNTS: counts }));
  assert.throws(() => benchmarkPlan(cases, { JUW_BENCH_START: "200" }));
});
