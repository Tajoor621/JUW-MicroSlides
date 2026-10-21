import type { MediaItem } from "./types";
import { mediaKey } from "./utils";
export type ProviderResult = { provider: string; items: MediaItem[]; error?: string };
const clean = (s: string = "") =>
  s
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .trim();
async function json(url: string, signal?: AbortSignal) {
  const response = await fetch(url, {
    signal: AbortSignal.any([AbortSignal.timeout(12000), ...(signal ? [signal] : [])]),
    credentials: "omit",
  });
  if (!response.ok) throw new Error(`Service returned ${response.status}`);
  return response.json();
}
function safe(raw: string) {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}
async function commons(
  query: string,
  page: number,
  video: boolean,
  signal?: AbortSignal,
): Promise<ProviderResult> {
  const provider = video ? "Commons videos" : "Wikimedia Commons";
  try {
    const body = await json(
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=24&gsroffset=${(page - 1) * 24}&gsrsearch=${encodeURIComponent(query + (video ? " filetype:video" : " filetype:bitmap|drawing"))}&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=700`,
      signal,
    );
    const items: MediaItem[] = Object.values(body.query?.pages ?? {}).flatMap((raw) => {
      const p = raw as {
        pageid: number;
        title: string;
        imageinfo?: {
          url: string;
          thumburl?: string;
          descriptionurl?: string;
          mime?: string;
          extmetadata?: Record<string, { value: string }>;
        }[];
      };
      const info = p.imageinfo?.[0];
      if (!info || !safe(info.url)) return [];
      const isVideo = info.mime?.startsWith("video/");
      if (video !== Boolean(isVideo) || (!video && !info.mime?.startsWith("image/"))) return [];
      const meta = info.extmetadata || {};
      const licence = clean(meta.LicenseShortName?.value) || "Unknown — verify reuse terms";
      return [
        {
          id: `commons-${p.pageid}`,
          title: p.title.replace(/^File:/, ""),
          kind: isVideo
            ? ("video" as const)
            : info.mime === "image/gif"
              ? ("gif" as const)
              : ("photo" as const),
          src: isVideo ? info.url : info.thumburl || info.url,
          originalSrc: info.url,
          credit: clean(meta.Artist?.value) || "Creator not supplied",
          source:
            info.descriptionurl ||
            `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
          license: licence,
          ...(safe(meta.LicenseUrl?.value || "") ? { licenseUrl: meta.LicenseUrl.value } : {}),
          provider,
          keywords: query.split(/\s+/),
        },
      ];
    });
    return { provider, items };
  } catch (e) {
    return { provider, items: [], error: e instanceof Error ? e.message : "Unavailable" };
  }
}
async function openverse(
  query: string,
  page: number,
  signal?: AbortSignal,
): Promise<ProviderResult> {
  const provider = "Openverse";
  try {
    const body = await json(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=24&page=${page}`,
      signal,
    );
    const items: MediaItem[] = (body.results ?? [])
      .filter((r: { url: string }) => safe(r.url))
      .map(
        (r: {
          id: string;
          title: string;
          url: string;
          thumbnail?: string;
          foreign_landing_url?: string;
          creator?: string;
          license?: string;
          license_version?: string;
          license_url?: string;
        }) => ({
          id: `openverse-${r.id}`,
          kind: "photo",
          title: clean(r.title) || query,
          src: safe(r.thumbnail || "") ? r.thumbnail! : r.url,
          originalSrc: r.url,
          source: safe(r.foreign_landing_url || "") ? r.foreign_landing_url! : r.url,
          credit: clean(r.creator) || "Creator not supplied",
          license: r.license
            ? [r.license.toUpperCase(), r.license_version].filter(Boolean).join(" ")
            : "Unknown — verify reuse terms",
          ...(safe(r.license_url || "") ? { licenseUrl: r.license_url } : {}),
          provider,
          keywords: query.split(/\s+/),
        }),
      );
    return { provider, items };
  } catch (e) {
    return { provider, items: [], error: e instanceof Error ? e.message : "Unavailable" };
  }
}
export async function searchMediaLibrary(query: string, page = 1, signal?: AbortSignal) {
  const q = query.trim().slice(0, 350);
  if (q.length < 2) throw new Error("Enter a research topic or a specific figure description.");
  const providers = await Promise.all([
    commons(q, page, false, signal),
    commons(q, page, true, signal),
    openverse(q, page, signal),
  ]);
  const items = [
    ...new Map(
      providers.flatMap((p) => p.items).map((m) => [mediaKey(m.originalSrc || m.src), m]),
    ).values(),
  ];
  return { items, providers };
}
export function publicMediaSearchLinks(query: string) {
  const q = encodeURIComponent(query);
  const web = (domain: string) =>
    `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${query} site:${domain}`)}`;
  return [
    { name: "Web images", url: `https://www.google.com/search?tbm=isch&q=${q}` },
    { name: "X / Twitter", url: web("x.com") },
    { name: "Facebook", url: web("facebook.com") },
    { name: "Instagram", url: web("instagram.com") },
    { name: "Pinterest", url: `https://www.pinterest.com/search/pins/?q=${q}` },
    {
      name: "CDC PHIL",
      url: `https://www.google.com/search?q=${encodeURIComponent(`${query} site:phil.cdc.gov`)}`,
    },
    { name: "Europe PMC figures", url: `https://europepmc.org/search?query=${q}` },
  ];
}
export async function downloadMediaFile(item: MediaItem) {
  const response = await fetch(item.originalSrc || item.src, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new Error(
      "The host did not allow a direct download. Open the original source to download there.",
    );
  const type = (response.headers.get("content-type") || "").split(";")[0];
  if (!/^(image|video)\//.test(type))
    throw new Error(
      "This URL is a webpage, not a downloadable media file. Open the original source.",
    );
  if (Number(response.headers.get("content-length")) > 25000000)
    throw new Error("File exceeds the 25 MB in-app download limit. Download at the source.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No media file received.");
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  while (true) {
    const p = await reader.read();
    if (p.done) break;
    size += p.value.length;
    if (size > 25000000) {
      await reader.cancel();
      throw new Error("File exceeds 25 MB. Download at the source.");
    }
    chunks.push(new Uint8Array(p.value));
  }
  const blob = new Blob(chunks, { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const extension = type.split("/")[1]?.split("+")[0] || "bin";
  a.download = `${item.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 75)}.${extension}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
