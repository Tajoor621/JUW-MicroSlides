import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const version = "6.2.1",
  label = "V6.2.1";
test("owner's V6.2.1 lock agrees across web, native and package identities", () => {
  const pkg = JSON.parse(read("package.json"));
  const lock = JSON.parse(read("package-lock.json"));
  const native = JSON.parse(read("src-tauri/tauri.conf.json"));
  assert.equal(pkg.version, version, "npm package version");
  assert.equal(lock.version, version, "npm lock version");
  assert.equal(lock.packages[""].version, version, "npm root package version");
  assert.equal(native.version, version, "native installer version");
  assert(
    native.app.security.csp.includes("http://127.0.0.1:*"),
    "version changes must preserve the local Ollama transport policy",
  );
  assert(
    !native.app.security.csp.includes("126.2.1.1"),
    "release labels must never rewrite loopback addresses",
  );
  assert.equal(native.app.windows[0].title, `JUW-MicroSlides ${label}`, "native window title");
  assert.match(
    read("src-tauri/Cargo.toml"),
    /\[package\]\s+name = "juw-microslides"\s+version = "6\.2\.1"/,
  );
  assert.match(read("src-tauri/Cargo.lock"), /name = "juw-microslides"\s+version = "6\.2\.1"/);
  assert.match(read("src/lib/brand.ts"), /version: "V6\.2\.1"/);
  assert.match(read("pages.html"), /<title>JUW-MicroSlides V6\.2\.1<\/title>/);
});
test("exports, reviewer packs, native artifacts and qualification runners retain the lock", () => {
  const surfaces = [
    ["src/components/app-updates.tsx", /Windows desktop · V6\.2\.1/],
    ["src/components/specialist-review.tsx", /version: "V6\.2\.1"/],
    ["src/lib/project-format.ts", /appVersion: "V6\.2\.1"/],
    ["scripts/benchmark-live.mjs", /appVersion: "V6\.2\.1"/],
    ["scripts/scientific-matrix-summary.mjs", /appVersion: "V6\.2\.1"/],
    ["scripts/qualify-powerpoint.ps1", /version="V6\.2\.1"/],
    ["scripts/qa-desktop.mjs", /Windows desktop · V6\.2\.1/],
    [".github/workflows/windows.yml", /appVersion = 'V6\.2\.1'/],
    [".github/workflows/windows.yml", /name: JUW-MicroSlides-V6\.2\.1-Windows/],
    ["README.md", /^# JUW-MicroSlides V6\.2\.1/m],
  ];
  for (const [path, expected] of surfaces) assert.match(read(path), expected, path);
  assert.match(JSON.parse(read("src/lib/og/site.json")).description, /^V6\.2\.1/);
});
