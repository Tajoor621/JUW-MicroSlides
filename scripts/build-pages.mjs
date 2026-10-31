import { execFileSync } from "node:child_process";
import { readdir, readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
const root = "dist-pages";
await rename(join(root, "pages.html"), join(root, "index.html"));
async function files(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    // Atomic writer temporary files are not application assets.
    if (entry.name.startsWith(".") && entry.name !== ".nojekyll") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...(await files(path)));
    else result.push(path.slice(root.length + 1));
  }
  return result;
}
const buildId =
  process.env.GITHUB_SHA?.slice(0, 7) ||
  (() => {
    try {
      return execFileSync("git", ["rev-parse", "--short=7", "HEAD"], { encoding: "utf8" }).trim();
    } catch {
      return "local";
    }
  })();
const packageVersion = JSON.parse(await readFile("package.json", "utf8")).version;
await writeFile(
  join(root, "build-info.json"),
  JSON.stringify({ buildId, version: `V${packageVersion}` }),
);
const assets = (await files(root)).filter((p) => p !== "sw.js" && p !== "build-info.json");
const hash = (await import("node:crypto")).createHash("sha256");
for (const asset of assets) hash.update(await readFile(join(root, asset)));
const version = hash.digest("hex").slice(0, 16);
await writeFile(
  join(root, "sw.js"),
  `const CACHE = "juw-pages-${version}-assets-20261031";
const BASE = new URL("./", self.location.href).href;
const ASSETS = ${JSON.stringify(assets)}.map(p => new URL(p, BASE).href);
self.addEventListener("install", event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(ASSETS);
  await self.skipWaiting();
})()));
self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("activate", event => event.waitUntil((async () => {
  // Keep one previous shell for lazy chunks still used by an open older tab.
  const old = (await caches.keys()).filter(key => key.startsWith("juw-pages-") && key !== CACHE);
  for (const key of old.slice(0, -1)) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || !event.request.url.startsWith(BASE)) return;
  const path = new URL(event.request.url).pathname;
  if (path.endsWith("/build-info.json")) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (event.request.mode === "navigate") {
      try {
        const response = await fetch(event.request, { cache: "no-store" });
        // A competing branch/Jekyll deployment must not replace the saved app shell.
        const html = response.ok ? await response.clone().text() : "";
        if (html.includes('id="root"') && html.includes("assets/pages-")) {
          await cache.put(new URL("index.html", BASE).href, response.clone());
          return response;
        }
        return (await cache.match(new URL("index.html", BASE).href)) || response;
      } catch {
        return (await cache.match(new URL("index.html", BASE).href)) || Response.error();
      }
    }
    // Branding uses cache-busting query strings. Match only static artwork/fonts
    // without their query, never API responses, documents or JavaScript chunks.
    const staticAsset = /\\.(?:svg|png|jpe?g|webp|ttf|woff2?)$/i.test(path);
    const cached = await cache.match(event.request, { ignoreSearch: staticAsset }) || await caches.match(event.request, { ignoreSearch: staticAsset });
    return cached || fetch(event.request);
  })());
});`,
);
await writeFile(join(root, ".nojekyll"), "");
