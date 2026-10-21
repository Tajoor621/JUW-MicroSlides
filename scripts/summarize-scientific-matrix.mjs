import { readFile, readdir, mkdir, writeFile, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { benchmarkPlan } from "./benchmark-plan.mjs";
import { summarizeMatrix } from "./scientific-matrix-summary.mjs";
const input = process.argv[2] || "qualification-results/matrix-input";
const output = process.argv[3] || "qualification-results/matrix-summary";
const corpus = JSON.parse(await readFile("benchmarks/microbiology-topics.json", "utf8"));
const reports = [];
async function visit(path) {
  let entries;
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch (e) {
    if (e.code === "ENOENT") return;
    throw e;
  }
  for (const entry of entries) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) await visit(full);
    else if (entry.isFile() && entry.name === "report.json") {
      try {
        reports.push(JSON.parse(await readFile(full, "utf8")));
      } catch {
        reports.push(null);
      }
    }
  }
}
await visit(input);
const summary = summarizeMatrix(benchmarkPlan(corpus.cases), reports, process.env.GITHUB_SHA);
await mkdir(output, { recursive: true });
await writeFile(join(output, "report.json"), JSON.stringify(summary, null, 2));
const text = `Scientific generation matrix: ${summary.status}\n\n${summary.completed}/${summary.planned} requests completed; ${summary.missing.length} missing; ${summary.failures.length} failed.\n\nScientific review and release qualification remain pending.\n`;
await writeFile(join(output, "summary.txt"), text);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, text);
console.log(text);
if (summary.status !== "generation-contracts-complete") process.exitCode = 1;
