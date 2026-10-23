import JSZip from "jszip";
import { deckSchema } from "./backup";
import { reconcileDeck } from "./deck-integrity";
import type { Deck } from "./types";
const LIMIT = 100_000_000;
const ASSET_LIMIT = 25_000_000;
export async function readProjectAsset(response: Response, budget: number) {
  const limit = Math.min(ASSET_LIMIT, budget);
  const declared = Number(response.headers.get("content-length"));
  if (declared > limit) {
    await response.body?.cancel();
    throw new Error(
      "Project media exceeds the remaining size limit (25 MB per image, 100 MB per project).",
    );
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Project media response has no readable body.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error(
          "Project media exceeds the remaining size limit (25 MB per image, 100 MB per project).",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
async function hash(data: Uint8Array) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(data)))]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
export async function packProject(deck: Deck): Promise<Uint8Array> {
  const zip = new JSZip(),
    copy = reconcileDeck(structuredClone(deck)),
    files: Record<string, { sha256: string; bytes: number }> = {};
  let total = 0;
  const assets = new Map<string, string>();
  const processed = new WeakSet<object>();
  for (const media of [...copy.slides.flatMap((s) => s.media), ...copy.mediaPool]) {
    // structuredClone preserves aliases between attached and collected items.
    if (processed.has(media)) continue;
    processed.add(media);
    if (assets.has(media.src)) {
      media.src = assets.get(media.src)!;
      continue;
    }
    if (media.kind === "video")
      throw new Error(
        "Video files remain external. Remove them from the project collection or save a JSON backup retaining their links.",
      );
    const response = await fetch(media.src, { signal: AbortSignal.timeout(15000) });
    if (!response.ok)
      throw new Error(`Could not embed ${media.title}. Save it offline or use a JSON link backup.`);
    const data = await readProjectAsset(response, LIMIT - total);
    total += data.length;
    if (total > LIMIT) throw new Error("Project exceeds 100 MB.");
    const id = await hash(data),
      path = `assets/${id}`;
    zip.file(path, data);
    files[path] = { sha256: id, bytes: data.length };
    assets.set(media.src, `asset:${id}`);
    media.originalSrc ||= media.src;
    media.src = `asset:${id}`;
  }
  const data = new TextEncoder().encode(JSON.stringify(copy));
  if (total + data.length > LIMIT) throw new Error("Project exceeds 100 MB.");
  zip.file("deck.json", data);
  files["deck.json"] = { sha256: await hash(data), bytes: data.length };
  zip.file(
    "manifest.json",
    JSON.stringify({
      format: "juwslides",
      schemaVersion: 1,
      appVersion: "V6.2.1",
      files,
      sourceCoverage:
        "Embedded claim passages and citations; external full texts are identified by their source links.",
    }),
  );
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
export async function unpackProject(data: Uint8Array): Promise<Deck> {
  if (data.length > LIMIT) throw new Error("Project exceeds 100 MB.");
  const zip = await JSZip.loadAsync(data);
  if (Object.keys(zip.files).length > 2000) throw new Error("Too many project entries.");
  const manifestFile = zip.file("manifest.json") as
    (JSZip.JSZipObject & { _data?: { uncompressedSize?: number } }) | null;
  if (!manifestFile || (manifestFile._data?.uncompressedSize || 0) > 500000)
    throw new Error("Invalid manifest size.");
  const raw = await manifestFile.async("string");
  if (!raw || raw.length > 500000) throw new Error("Invalid manifest.");
  const manifest = JSON.parse(raw);
  if (manifest.format !== "juwslides" || manifest.schemaVersion !== 1 || !manifest.files)
    throw new Error("Unsupported project format.");
  const verified = new Map<string, Uint8Array>();
  let total = 0;
  for (const [path, entry] of Object.entries(manifest.files) as [
    string,
    { sha256: string; bytes: number },
  ][]) {
    if (
      !/^(deck\.json|assets\/[a-f0-9]{64})$/.test(path) ||
      !Number.isInteger(entry.bytes) ||
      entry.bytes < 0
    )
      throw new Error("Unsafe manifest entry.");
    total += entry.bytes;
    if (total > LIMIT) throw new Error("Project expands beyond 100 MB.");
    const file = zip.file(path);
    if (!file) throw new Error(`Missing ${path}`);
    // Validate declared expanded size before allocating a decompressed buffer.
    const meta = file as unknown as { _data?: { uncompressedSize?: number } };
    if (meta._data?.uncompressedSize !== entry.bytes)
      throw new Error("Uncompressed size mismatch.");
    const bytes = await file.async("uint8array");
    if (bytes.length !== entry.bytes || (await hash(bytes)) !== entry.sha256)
      throw new Error(`Checksum mismatch: ${path}`);
    verified.set(path, bytes);
  }
  const deck = JSON.parse(new TextDecoder().decode(verified.get("deck.json")));
  for (const media of [
    ...deck.slides.flatMap((s: { media: unknown[] }) => s.media),
    ...deck.mediaPool,
  ]) {
    if (typeof media.src !== "string" || !media.src.startsWith("asset:"))
      throw new Error("Project contains an unembedded media dependency.");
    const bytes = verified.get(`assets/${media.src.slice(6)}`);
    if (!bytes) throw new Error("Missing media asset.");
    const blob = new Blob([new Uint8Array(bytes)], { type: inferMime(bytes) });
    media.src = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }
  return reconcileDeck(deckSchema.parse(deck));
}
function inferMime(bytes: Uint8Array) {
  if (bytes[0] === 137 && bytes[1] === 80) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216) return "image/jpeg";
  if (bytes[0] === 71 && bytes[1] === 73) return "image/gif";
  const text = new TextDecoder().decode(bytes.slice(0, 1000));
  if (text.includes("<svg")) return "image/svg+xml";
  if (text.startsWith("RIFF")) return "image/webp";
  throw new Error("Unsupported project image format.");
}
