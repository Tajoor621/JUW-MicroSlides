import type { Citation, MediaItem } from "./types";
export async function searchOpenMedia({ data }: { data: { query: string } }) {
  try {
    const response = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=12&gsrsearch=${encodeURIComponent(data.query.slice(0, 300))}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=900`,
      { signal: AbortSignal.timeout(12000) },
    );
    if (!response.ok) throw new Error("Search unavailable");
    const body = await response.json();
    const clean = (v: string = "") => v.replace(/<[^>]*>/g, "").trim();
    const items: MediaItem[] = Object.values(body.query?.pages ?? {}).flatMap((raw) => {
      const p = raw as {
        pageid: number;
        title: string;
        imageinfo?: {
          thumburl?: string;
          url: string;
          descriptionurl?: string;
          extmetadata?: Record<string, { value: string }>;
        }[];
      };
      const info = p.imageinfo?.[0];
      if (!info) return [];
      const meta = info.extmetadata ?? {};
      return [
        {
          id: `commons-${p.pageid}`,
          kind: "photo" as const,
          title: p.title.replace(/^File:/, ""),
          src: info.thumburl || info.url,
          source: info.descriptionurl || "Wikimedia Commons",
          credit: clean(meta.Artist?.value) || "Creator not provided",
          license: clean(meta.LicenseShortName?.value) || "Unknown — verify before reuse",
          ...(/^https?:\/\//.test(meta.LicenseUrl?.value || "")
            ? { licenseUrl: meta.LicenseUrl.value }
            : {}),
          keywords: data.query.split(/\s+/),
        },
      ];
    });
    return { ok: true as const, items };
  } catch {
    return {
      ok: false as const,
      error: "Image search unavailable. Use bundled figures or retry online.",
      items: [] as MediaItem[],
    };
  }
}
export async function collectDeckMedia(_input: {
  data: {
    topic: string;
    discipline: string;
    slides: { id: string; title: string; text: string }[];
  };
}) {
  // Automatic assignment requires review; keep the bundled illustrations instead.
  return {
    ok: true as const,
    assigned: {} as Record<string, MediaItem>,
    pool: [] as MediaItem[],
    items: [] as MediaItem[],
    citations: [] as Citation[],
  };
}
export async function proxyImages(_input: { data: { srcs: string[] } }) {
  // Static deployment exposes no arbitrary server-side URL proxy.
  return { ok: true as const, map: {} as Record<string, string> };
}
