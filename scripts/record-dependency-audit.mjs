import { readFile, writeFile } from "node:fs/promises";
const root = "qualification-results/dependencies";
const report = JSON.parse(await readFile(`${root}/audit.json`, "utf8"));
if (report.error || !report.metadata?.vulnerabilities || !report.vulnerabilities)
  throw Error(
    "The registry did not return a complete audit. Retry CI; no clean result is claimed.",
  );
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
const entries = Object.entries(report.vulnerabilities).map(([name, issue]) => ({
  name,
  severity: issue.severity,
  direct: issue.isDirect,
  via: issue.via,
  fixAvailable: issue.fixAvailable,
  installations: (issue.nodes || []).map((path) => ({
    path,
    version: lock.packages[path]?.version || "not recorded",
    developmentOnly: lock.packages[path]?.dev === true,
  })),
}));
const counts = report.metadata.vulnerabilities;
const result = {
  counts,
  highCriticalGatePassed: counts.high === 0 && counts.critical === 0,
  dependencyChangesApplied: false,
  entries,
  scope:
    "Registry advisory and installed-lock evidence, not proof that a particular input is exploitable. Do not hide findings or force a breaking toolchain change to obtain a zero count.",
};
await writeFile(`${root}/audit-evidence.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ counts, highCriticalGatePassed: result.highCriticalGatePassed }));
// The existing separate npm audit --audit-level=high remains the blocking gate.
