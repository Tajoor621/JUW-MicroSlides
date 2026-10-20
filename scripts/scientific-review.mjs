import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { digest, assessReviews } from "./scientific-evaluation.mjs";
import {
  makeScientificReviewPack,
  scientificReviewerForm,
} from "../src/lib/scientific-review-pack.ts";
const [command, path, ...args] = process.argv.slice(2);
if (command === "pack") {
  const raw = await readFile(path, "utf8"),
    deck = JSON.parse(raw);
  if (!Array.isArray(deck.slides) || !deck.slides.length) throw Error("Expected a saved deck JSON");
  const output = args[0] || "qualification-results/independent-review";
  const pack = await makeScientificReviewPack(deck, raw);
  await mkdir(output, { recursive: true });
  await writeFile(join(output, "pack.json"), JSON.stringify(pack, null, 2));
  for (const id of ["reviewer-A", "reviewer-B"])
    await writeFile(
      join(output, `${id}.json`),
      JSON.stringify(scientificReviewerForm(pack, id), null, 2),
    );
  console.log(
    `${pack.items.length} review items prepared; no independent review has been performed.`,
  );
} else if (command === "assess") {
  const pack = JSON.parse(await readFile(path, "utf8"));
  const { packHash, ...content } = pack;
  if (packHash !== digest(content)) throw Error("Pack content hash mismatch");
  for (const item of pack.items) {
    const { id: _id, contentHash, ...fields } = item;
    if (digest(fields) !== contentHash) throw Error("Review item hash mismatch");
  }
  const reviews = await Promise.all(args.map(async (p) => JSON.parse(await readFile(p, "utf8"))));
  const result = assessReviews(pack, reviews);
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "two-reviewer-attestations-complete") process.exitCode = 2;
} else
  throw Error(
    "Use: scientific-review.mjs pack deck.json [output] OR assess pack.json reviewer-A.json reviewer-B.json",
  );
