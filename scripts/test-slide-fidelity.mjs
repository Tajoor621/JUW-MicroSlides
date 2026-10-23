import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const server = await createServer({
  optimizeDeps: { noDiscovery: true, include: [] },
  configFile: false,
  server: { middlewareMode: true },
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  logLevel: "error",
});
try {
  const { researchTheme, themeOf } = await server.ssrLoadModule("/src/lib/slide-themes.ts");
  for (const [topic, expected] of [
    ["Bacterial genome architecture", "molecular"],
    ["Bacterial chromosome segregation", "molecular"],
    ["Candida albicans infection", "mycology"],
    ["Malaria life cycle", "parasitology"],
    ["Enzyme immobilization", "culture"],
    ["Clinical antimicrobial resistance", "clinical"],
  ]) {
    assert.equal(researchTheme(topic, "Microbiology", "content"), expected);
    assert(themeOf(expected).accent);
  }
  const slide = readFileSync(
    fileURLToPath(new URL("../src/components/slide-view.tsx", import.meta.url)),
    "utf8",
  );
  const pptx = readFileSync(
    fileURLToPath(new URL("../src/lib/export-pptx.ts", import.meta.url)),
    "utf8",
  );
  assert.match(slide, /const visualTheme = slide\.theme/);
  assert.match(slide, /\.\.\.themeVars\(visualTheme\)/);
  assert.match(pptx, /Native SVG stays vector in PowerPoint/);
  assert.match(pptx, /slide\.addText\(item\.text/);
  assert.match(pptx, /image\.naturalWidth \/ width/);
  console.log(
    "PASS topic-coordinated title, unchanged content-slide themes, editable text and native SVG artwork",
  );
} finally {
  await server.close();
}
