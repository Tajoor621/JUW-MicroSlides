import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inspectPng, inspectJpeg, inspectTransparentPng } from "./logo-assets.mjs";
test("logo qualification rejects small and disguised JPEG assets", () => {
  const small = Buffer.alloc(26);
  Buffer.from("89504e470d0a1a0a", "hex").copy(small);
  small.writeUInt32BE(375, 16);
  small.writeUInt32BE(391, 20);
  assert.throws(() => inspectPng(small), /logo resolution below target/);
  assert.throws(() => inspectPng(Buffer.from("ffd8ffe000", "hex")), /not a PNG/);
  const valid = Buffer.alloc(26);
  Buffer.from("89504e470d0a1a0a", "hex").copy(valid);
  valid.writeUInt32BE(1200, 16);
  valid.writeUInt32BE(1000, 20);
  assert.deepEqual(inspectPng(valid), { width: 1200, height: 1000 });
});

test("owner-supplied department artwork is genuine full-resolution JPEG", () => {
  const bytes = readFileSync("public/juw-department-microscope-1254.jpeg");
  assert.equal(bytes.subarray(0, 2).toString("hex"), "ffd8");
  const size = inspectJpeg(bytes);
  assert.equal(size.width, 1254);
  assert.equal(size.height, 1254);
  assert(Math.max(size.width, size.height) >= 1200);
});

test("transparent department display asset retains resolution, clear corners and visible artwork", () => {
  const bytes = readFileSync("public/juw-department-microscope-transparent.png");
  const result = inspectTransparentPng(bytes);
  assert.equal(result.width, 1254);
  assert.equal(result.height, 1254);
  assert.deepEqual(result.corners, [0, 0, 0, 0]);
  assert(result.transparent > result.width * result.height * 0.5);
  assert(result.opaque > result.width * result.height * 0.1);
});
