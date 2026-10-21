import { appendFile, readFile } from "node:fs/promises";
import { benchmarkPlan } from "./benchmark-plan.mjs";
const corpus = JSON.parse(await readFile("benchmarks/microbiology-topics.json", "utf8"));
const plan = benchmarkPlan(corpus.cases);
const topics = [...new Set(plan.jobs.map((job) => job.caseId))].map((id) =>
  corpus.cases.findIndex((c) => c.id === id),
);
if (!process.env.GITHUB_OUTPUT) throw Error("GITHUB_OUTPUT is required.");
await appendFile(process.env.GITHUB_OUTPUT, `topics=${JSON.stringify(topics)}\n`);
console.log(
  JSON.stringify({ topics: topics.length, plannedRequests: plan.jobs.length, counts: plan.counts }),
);
