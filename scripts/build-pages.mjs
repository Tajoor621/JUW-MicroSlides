import { readdir, readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
const root = "dist-pages";
await rename(join(root, "pages.html"), join(root, "index.html"));
async function files(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...(await files(path)));
    else result.push(path.slice(root.length + 1));
  }
  return result;
}
const assets = (await files(root)).filter((p) => !p.startsWith("__grok/") && p !== "sw.js");
const hash = (await import("node:crypto")).createHash("sha256");
for (const asset of assets) hash.update(await readFile(join(root, asset)));
const version = hash.digest("hex").slice(0, 16);
await writeFile(
  join(root, "sw.js"),
  `const CACHE = "juw-pages-${version}";
const BASE = new URL("./", self.location.href).href;
const ASSETS = ${JSON.stringify(assets)}.map(p => new URL(p, BASE).href);
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener("activate", event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith("juw-pages-") && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || !event.request.url.startsWith(BASE)) return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try { return await fetch(event.request); }
    catch (error) { if (event.request.mode === "navigate") return (await caches.match(new URL("index.html", BASE).href)) || Response.error(); throw error; }
  })());
});`,
);
await writeFile(join(root, ".nojekyll"), "");
