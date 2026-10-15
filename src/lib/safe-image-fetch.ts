const HOSTS = new Set([
  "upload.wikimedia.org",
  "commons.wikimedia.org",
  "iiif.wellcomecollection.org",
  "images.wellcomecollection.org",
  "openi.nlm.nih.gov",
  "www.ncbi.nlm.nih.gov",
  "cdn.ncbi.nlm.nih.gov",
  "static.inaturalist.org",
  "inaturalist-open-data.s3.amazonaws.com",
]);
export function allowedImageUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      (!u.port || u.port === "443") &&
      HOSTS.has(u.hostname)
    );
  } catch {
    return false;
  }
}
export async function safeImageFetch(
  raw: string,
  signal: AbortSignal,
): Promise<{ type: string; bytes: Uint8Array } | null> {
  let url = raw;
  for (let i = 0; i < 4; i++) {
    if (!allowedImageUrl(url)) return null;
    const response = await fetch(url, {
      signal,
      redirect: "manual",
      headers: { Accept: "image/png,image/jpeg,image/gif,image/webp" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) return null;
      url = new URL(location, url).href;
      continue;
    }
    const type = (response.headers.get("content-type") || "").split(";")[0];
    if (
      !response.ok ||
      !/^image\/(png|jpe?g|gif|webp)$/i.test(type) ||
      Number(response.headers.get("content-length")) > 3500000
    ) {
      await response.body?.cancel();
      return null;
    }
    const reader = response.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > 3500000) {
        await reader.cancel();
        return null;
      }
      chunks.push(next.value);
    }
    if (size < 80) return null;
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return { type, bytes };
  }
  return null;
}
