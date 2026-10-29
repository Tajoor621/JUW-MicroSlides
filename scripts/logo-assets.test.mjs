import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inspectPng } from "./logo-assets.mjs";
test("logo qualification rejects small and disguised JPEG assets", () => {
  assert.throws(
    () => inspectPng(readFileSync("public/juw-microscope.png")),
    /logo resolution below target/,
  );
  assert.throws(() => inspectPng(Buffer.from("ffd8ffe000", "hex")), /not a PNG/);
  const valid = Buffer.alloc(26);
  Buffer.from("89504e470d0a1a0a", "hex").copy(valid);
  valid.writeUInt32BE(1200, 16);
  valid.writeUInt32BE(1000, 20);
  assert.deepEqual(inspectPng(valid), { width: 1200, height: 1000 });
});
