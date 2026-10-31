import { readFile, writeFile } from "node:fs/promises";
const path = "qualification-results/dependencies/depcheck.json";
const report = JSON.parse(await readFile(path, "utf8"));
if (!Array.isArray(report.dependencies) || !Array.isArray(report.devDependencies))
  throw Error("depcheck did not return a complete report.");
const css = await readFile("src/styles.css", "utf8");
const cssUsed = ["tailwindcss", "tw-animate-css"].filter((name) =>
  css.includes(`@import "${name}"`),
);
const unused = [...report.dependencies, ...report.devDependencies].filter(
  (name) => !cssUsed.includes(name),
);
const passed =
  !unused.length &&
  !Object.keys(report.missing || {}).length &&
  !Object.keys(report.invalidFiles || {}).length;
const result = {
  passed,
  unused,
  missing: report.missing,
  cssImports: cssUsed.map((name) => ({
    name,
    file: "src/styles.css",
    reason: "Loaded through an actual CSS import; depcheck does not resolve this usage.",
  })),
  dependencyRemovals: [],
  note: "Do not remove CSS-loaded packages or invent a removal.",
};
await writeFile(
  "qualification-results/dependencies/qualification.json",
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
if (!passed) process.exitCode = 1;
