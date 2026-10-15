import { mediaDisplaySrc } from "./utils";
export async function embedMediaSources(srcs: string[]) {
  const results = new Map<string, string>();
  let failed = 0,
    total = 0;
  for (const src of [...new Set(srcs)]) {
    if (src.startsWith("data:") || src.startsWith("/") || src.startsWith("blob:")) continue;
    try {
      const response = await fetch(mediaDisplaySrc(src), {
        credentials: "omit",
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error("Image unavailable");
      const mime = response.headers.get("content-type") || "";
      if (!/^image\/(png|jpeg|gif|webp)/.test(mime)) throw new Error("Unsupported image");
      if (Number(response.headers.get("content-length")) > 3500000)
        throw new Error("Image too large");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Image unavailable");
      const chunks: Uint8Array<ArrayBuffer>[] = [];
      let size = 0;
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.length;
        if (size > 3500000 || total + size > 25000000) {
          await reader.cancel();
          throw new Error("Image budget reached");
        }
        chunks.push(new Uint8Array(next.value));
      }
      const blob = new Blob(chunks, { type: mime });
      const encoded = await new Promise<string>((resolve, reject) => {
        const file = new FileReader();
        file.onload = () => resolve(String(file.result));
        file.onerror = () => reject(file.error);
        file.readAsDataURL(blob);
      });
      results.set(src, encoded);
      total += size;
    } catch {
      failed++;
    }
  }
  return { results, failed };
}
