import assert from "node:assert/strict";
const origin = process.env.JUW_PUBLIC_URL || "https://tajoor621.github.io/JUW-MicroSlides/";
const expected = process.env.GITHUB_SHA?.slice(0, 7);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let error;
for (let attempt = 1; attempt <= 12; attempt++) {
  try {
    const response = await fetch(origin + "?verify=" + Date.now(), { cache: "no-store" });
    assert(response.ok, `Public site returned HTTP ${response.status}`);
    const html = await response.text();
    assert(html.includes('id="root"'), "Public URL serves a landing page instead of the editor mount");
    assert(/assets\/pages-[^" ]+\.js/.test(html), "Public URL does not reference the compiled interactive editor");
    const build = await fetch(new URL("build-info.json?verify=" + Date.now(), origin), { cache: "no-store" });
    assert(build.ok, "Public build-info.json is missing");
    const info = await build.json();
    assert.equal(info.buildId, expected, "Public URL is serving a stale or competing deployment");
    const jsPath = html.match(/(?:src=")([^"]*assets\/pages-[^"]+\.js)"/)?.[1];
    assert(jsPath, "Compiled editor script is absent");
    const jsResponse = await fetch(new URL(jsPath, origin), { cache: "no-store" });
    assert(jsResponse.ok, "Compiled editor script cannot be loaded");
    const js = await jsResponse.text();
    assert(js.length > 10000, "Editor JavaScript bundle is unexpectedly small");
    console.log("PASS: public URL serves current interactive editor bundle", info);
    process.exit(0);
  } catch (e) {
    error = e;
    console.error(`Live smoke attempt ${attempt}/12: ${e.message}`);
    if (attempt < 12) await sleep(10000);
  }
}
throw error;
