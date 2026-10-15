import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Stable identity for a media file so the same Commons photo cannot appear twice. */
export function mediaKey(src: string): string {
  if (!src) return "";
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;
  const file = wikimediaFileName(src);
  if (file) return `commons:${file.toLowerCase()}`;
  try {
    const u = new URL(src, "https://local.invalid");
    u.hash = "";
    const path = u.pathname.replace(/\/$/, "");
    return `${u.origin}${path}`.toLowerCase();
  } catch {
    return src.split("?")[0].toLowerCase();
  }
}

export function mediaDisplaySrc(src: string): string {
  if (!src || src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("/")) return src;
  if (src.includes("iiif.wellcomecollection.org") && src.includes("info.json")) {
    const id = src.split("/image/")[1]?.split("/")[0];
    if (id) return `https://iiif.wellcomecollection.org/image/${id}/full/640,/0/default.jpg`;
  }
  const file = wikimediaFileName(src);
  if (file && src.includes("thumb.php")) {
    return `https://commons.wikimedia.org/w/thumb.php?f=${encodeURIComponent(file)}&width=640`;
  }
  if (file && (src.includes("wikimedia.org") || src.includes("wikipedia.org"))) {
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=640`;
  }
  return src;
}

export function wikimediaFileName(src: string): string | null {
  try {
    const u = new URL(src, "https://commons.wikimedia.org");
    const fromQuery = u.searchParams.get("f") || u.searchParams.get("file");
    if (fromQuery) return decodeURIComponent(fromQuery.replace(/\+/g, " "));
    const clean = decodeURIComponent(u.pathname);
    if (clean.includes("Special:FilePath/")) {
      return (clean.split("Special:FilePath/")[1] || "").replace(/\/$/, "") || null;
    }
    const parts = clean.split("/").filter(Boolean);
    if (clean.includes("/thumb/") && parts.length >= 2) {
      return parts[parts.length - 2];
    }
    let file = parts[parts.length - 1] || "";
    if (file === "thumb.php" || file === "index.php") return null;
    file = file.replace(/^\d+px-/, "");
    if (file.endsWith(".svg.png")) file = file.slice(0, -4);
    return file || null;
  } catch {
    return null;
  }
}
