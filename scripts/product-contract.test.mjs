import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
test("supported app is static, local-first and independent of platform services", () => {
  const p = JSON.parse(read("package.json"));
  assert.equal(p.name, "juw-microslides");
  assert.equal(p.scripts.build, "npm run build:pages");
  for (const name of ["pg", "better-auth", "@electric-sql/pglite", "@tanstack/react-start"])
    assert(!p.dependencies[name], name);
  for (const path of [
    ".grok",
    "public/__grok",
    "src/lib/ai.ts",
    "src/lib/paid-ai-access.server.ts",
    "startup.sh",
    "screenshots/qa-export.pptx",
  ])
    assert(!existsSync(new URL("../" + path, import.meta.url)), path);
  assert(!/Review →|Assess returned reviewer forms/.test(read("README.md")));
  assert.match(read("src/lib/brand.ts"), /Unverified AI-assisted draft/);
  assert.match(read(".github/workflows/pages.yml"), /npm audit --audit-level=high/);
  assert.match(read(".github/workflows/pages.yml"), /gitleaks/);
});
