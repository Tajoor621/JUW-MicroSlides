import { readFile, mkdir, writeFile } from "node:fs/promises";
import { semanticAcceptance } from "./semantic-acceptance.mjs";
const [corpus, measured, output = "qualification-results/semantic-acceptance"] =
  process.argv.slice(2);
if (!corpus || !measured)
  throw Error(
    "Usage: npm run qualify:semantic -- private-corpus.json measured-report.json [output-directory]",
  );
const result = semanticAcceptance(
  await readFile(corpus, "utf8"),
  JSON.parse(await readFile(measured, "utf8")),
);
await mkdir(output, { recursive: true });
await writeFile(`${output}/report.json`, JSON.stringify(result, null, 2));
console.log(result.status, result.errors);
if (result.errors.length) process.exitCode = 1;
