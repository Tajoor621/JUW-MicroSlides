import { readFile, mkdtemp, writeFile, readdir, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const files = await readdir("src/content/concepts");
const concepts = await Promise.all(
  files
    .filter((f) => f.endsWith(".json"))
    .map(async (f) => JSON.parse(await readFile(join("src/content/concepts", f), "utf8"))),
);
const source = concepts[0].source;
const response = await fetch(source.url, { signal: AbortSignal.timeout(90000) });
if (!response.ok)
  throw Error(
    `Historical textbook retrieval failed (${response.status}); no source check was claimed.`,
  );
const bytes = new Uint8Array(await response.arrayBuffer());
const hash = createHash("sha256").update(bytes).digest("hex");
if (hash !== source.sha256)
  throw Error("Textbook edition fingerprint changed. Recheck the source before releasing.");
const dir = await mkdtemp(join(tmpdir(), "juw-textbook-"));
const path = join(dir, "source.pdf");
await writeFile(path, bytes);
const text = execFileSync("pdftotext", ["-layout", path, "-"], {
  encoding: "utf8",
  maxBuffer: 12e6,
}).replace(/\s+/g, " ");
const results = concepts.map((c) => ({
  topic: c.topic,
  matched: c.concepts.every((p) => text.includes(p.quote)),
  editorialApproval: false,
}));
if (results.some((r) => !r.matched))
  throw Error("A textbook passage does not match the recorded edition.");
await mkdir("qualification-results/concepts", { recursive: true });
await writeFile(
  "qualification-results/concepts/source-integrity.json",
  JSON.stringify({ hash, source: source.url, results, scientificQualification: false }, null, 2),
);
console.log(
  "PASS eight pilot source extractions match the pinned historical edition; no expert approval is implied.",
);
