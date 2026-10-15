import { JUW, lectureMeta } from "./brand";
import type { Deck } from "./types";
import { formatCitation } from "./citations";
import { fallbackVisual } from "./media-catalog";
import { proxyImages } from "./media-search";
import { themeOf } from "./slide-themes";
import { mediaDisplaySrc } from "./utils";

type Box = { x: number; y: number; w: number; h: number };

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function absoluteSrc(src: string): string {
  if (!src) return src;
  if (src.startsWith("data:") || src.startsWith("blob:") || /^https?:/i.test(src)) return src;
  if (typeof window === "undefined") return src;
  try {
    return new URL(src, window.location.origin).href;
  } catch {
    return src;
  }
}

function isRasterDataUrl(src: string): boolean {
  return /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(src) && src.length > 80;
}

function isPptxSafeRaster(src: string): boolean {
  return /^data:image\/(png|jpe?g);base64,/i.test(src) && src.length > 80;
}

function asJpegDataUrl(src: string): string {
  return src.replace(/^data:image\/jpg;/i, "data:image/jpeg;");
}

function paintCard(title: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#f7f4ec";
  ctx.fillRect(0, 0, 1280, 720);
  ctx.strokeStyle = "#954a33";
  ctx.lineWidth = 8;
  ctx.strokeRect(24, 24, 1232, 672);
  ctx.fillStyle = "#0b1520";
  ctx.font = "600 36px Georgia, serif";
  ctx.fillText((title || "Lecture figure").slice(0, 64), 64, 120);
  ctx.fillStyle = "#4e8ea8";
  ctx.fillRect(64, 148, 120, 8);
  ctx.fillStyle = "#5c6b7a";
  ctx.font = "22px Calibri, sans-serif";
  ctx.fillText("JUW-MicroSlides teaching figure", 64, 200);
  ctx.fillStyle = "#c5d4de";
  ctx.fillRect(64, 260, 1152, 380);
  ctx.strokeStyle = "#2f6f86";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(120, 580);
  ctx.lineTo(320, 420);
  ctx.lineTo(520, 500);
  ctx.lineTo(760, 320);
  ctx.lineTo(1080, 540);
  ctx.stroke();
  return canvas.toDataURL("image/jpeg", 0.9);
}

function rasterizeBitmap(img: CanvasImageSource, w: number, h: number, max = 1400): string {
  const width = Math.max(1, w);
  const height = Math.max(1, h);
  const scale = Math.min(1, max / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.88);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    const timer = window.setTimeout(() => reject(new Error("timeout")), 8000);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("image load failed"));
    };
    img.src = src;
  });
}

function decodeSvg(src: string): string | null {
  if (src.startsWith("data:image/svg")) {
    const comma = src.indexOf(",");
    if (comma < 0) return null;
    const payload = src.slice(comma + 1);
    try {
      return src.includes(";base64") ? atob(payload) : decodeURIComponent(payload);
    } catch {
      return null;
    }
  }
  if (src.trim().startsWith("<svg")) return src;
  return null;
}

function withSvgSize(svg: string, w = 1280, h = 720): string {
  if (/\bwidth\s*=/.test(svg) && /\bheight\s*=/.test(svg)) return svg;
  return svg.replace(/<svg\b/i, `<svg width="${w}" height="${h}"`);
}

async function svgToJpeg(svg: string): Promise<string | null> {
  const sized = withSvgSize(svg);
  const blob = new Blob([sized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const w = img.naturalWidth || img.width || 1280;
    const h = img.naturalHeight || img.height || 720;
    return rasterizeBitmap(img, w, h);
  } catch {
    try {
      const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sized)}`;
      const img = await loadImage(uri);
      return rasterizeBitmap(img, img.naturalWidth || 1280, img.naturalHeight || 720);
    } catch {
      return null;
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function rasterizeBlob(blob: Blob): Promise<string | null> {
  if (!blob.size) return null;
  const type = (blob.type || "").toLowerCase();
  if (type.includes("svg") || type.includes("xml") || type === "text/plain") {
    const text = await blob.text();
    if (text.includes("<svg")) return svgToJpeg(text);
  }
  if (/^image\/jpe?g$/i.test(type) && blob.size > 24) {
    try {
      const url = await blobToDataUrl(blob);
      if (isPptxSafeRaster(url)) return asJpegDataUrl(url);
    } catch {
      /* fall through to bitmap */
    }
  }
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await loadImage(objectUrl);
    return rasterizeBitmap(img, img.naturalWidth || 1280, img.naturalHeight || 720);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function fetchEmbeddable(src: string): Promise<string | null> {
  try {
    const res = await fetch(absoluteSrc(src), { referrerPolicy: "no-referrer" });
    if (!res.ok) return null;
    return rasterizeBlob(await res.blob());
  } catch {
    return null;
  }
}

async function toEmbeddable(src: string | null | undefined): Promise<string | null> {
  if (!src) return null;
  if (isPptxSafeRaster(src)) return asJpegDataUrl(src);
  if (isRasterDataUrl(src)) {
    try {
      const img = await loadImage(src);
      return rasterizeBitmap(img, img.naturalWidth || 1280, img.naturalHeight || 720);
    } catch {
      /* fall through */
    }
  }
  const svg = decodeSvg(src);
  if (svg) return svgToJpeg(svg);
  return fetchEmbeddable(src);
}

async function asPptxImage(src: string, proxied?: string | null, fallbackTitle = "Figure"): Promise<string> {
  const display = mediaDisplaySrc(src);
  const candidates = [proxied, display, src, src ? absoluteSrc(display) : ""].filter(
    (s, i, arr) => Boolean(s) && arr.indexOf(s) === i,
  ) as string[];
  for (const candidate of candidates) {
    const jpeg = await toEmbeddable(candidate);
    if (jpeg && isPptxSafeRaster(jpeg)) return jpeg;
  }
  try {
    const vis = fallbackVisual(fallbackTitle);
    const jpeg = await toEmbeddable(vis.src);
    if (jpeg && isPptxSafeRaster(jpeg)) return jpeg;
  } catch {
    /* paint a card instead */
  }
  return paintCard(fallbackTitle);
}

/** pptxgenjs wants `image/jpeg;base64,...` without the `data:` prefix. */
function pptxData(dataUrl: string): string {
  if (!dataUrl) return "";
  const raw = dataUrl.replace(/^data:/i, "");
  if (/^image\/(png|jpe?g|webp|gif);base64,/i.test(raw)) {
    return raw.replace(/^image\/jpg;/i, "image/jpeg;");
  }
  if (raw.includes("base64,")) {
    const payload = raw.split("base64,").pop() || "";
    if (payload.length > 80) return `image/jpeg;base64,${payload}`;
  }
  return "";
}

async function proxyAll(srcs: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(srcs.filter((s) => /^https?:/i.test(s)))];
  const map: Record<string, string> = {};
  for (let i = 0; i < unique.length; i += 10) {
    const chunk = unique.slice(i, i + 10);
    try {
      const proxied = await proxyImages({ data: { srcs: chunk } });
      if (proxied.ok) Object.assign(map, proxied.map);
    } catch {
      /* client rasterizer still has teaching visuals */
    }
  }
  return map;
}

export async function exportPptx(deck: Deck) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.author = "JUW-MicroSlides";
  pptx.title = deck.title;
  pptx.subject = `${deck.discipline} · ${deck.topic}`;
  pptx.layout = "LAYOUT_WIDE";
  const meta = lectureMeta(deck);

  const remote = [
    ...deck.slides.flatMap((s) => s.media.map((m) => mediaDisplaySrc(m.src))),
    absoluteSrc(JUW.crest),
    absoluteSrc(JUW.microscope),
  ];
  const proxyMap = await proxyAll(remote);

  const crest = await asPptxImage(JUW.crest, proxyMap[absoluteSrc(JUW.crest)] ?? null, "JUW crest");
  const scope = await asPptxImage(JUW.microscope, proxyMap[absoluteSrc(JUW.microscope)] ?? null, "Department of Microbiology");

  const figureCache = new Map<string, string>();
  async function figureData(src: string, title: string): Promise<string> {
    const key = mediaDisplaySrc(src);
    const hit = figureCache.get(key);
    if (hit) return hit;
    const data = await asPptxImage(src, proxyMap[key] ?? proxyMap[src] ?? proxyMap[absoluteSrc(key)] ?? null, title);
    figureCache.set(key, data);
    return data;
  }

  let imgSeq = 0;
  const addJpeg = (s: { addImage: (opts: Record<string, unknown>) => unknown }, dataUrl: string, box: Box) => {
    const payload = pptxData(dataUrl);
    if (!payload) return false;
    imgSeq += 1;
    s.addImage({
      data: payload,
      path: `preencoded-${imgSeq}.jpeg`,
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
    });
    return true;
  };

  for (let idx = 0; idx < deck.slides.length; idx++) {
    const slide = deck.slides[idx];
    const tokens = themeOf(slide.theme);
    const s = pptx.addSlide();
    s.background = { color: tokens.band.replace("#", "") };
    s.addShape(pptx.ShapeType.rect, {
      x: 0.12,
      y: 0.12,
      w: 13.09,
      h: 7.26,
      fill: { color: tokens.slide.replace("#", "") },
      line: { color: tokens.frame.replace("#", ""), pt: 2.25 },
    });

    const ink = tokens.ink.replace("#", "");
    const navy = tokens.navy.replace("#", "");
    const muted = tokens.muted.replace("#", "");
    const accent = tokens.accent.replace("#", "");

    addJpeg(s, crest, { x: 0.28, y: 0.24, w: 1.18, h: 1.18 });
    if (slide.layout === "title") {
      addJpeg(s, scope, { x: 10.35, y: 0.18, w: 2.7, h: 1.7 });
    } else {
      s.addShape(pptx.ShapeType.rect, {
        x: 0.12,
        y: 0.12,
        w: 0.08,
        h: 7.26,
        fill: { color: accent },
      });
      s.addText(tokens.label.toUpperCase(), {
        x: 10.4,
        y: 0.42,
        w: 2.5,
        h: 0.28,
        fontSize: 9,
        fontFace: "Calibri",
        color: muted,
        align: "right",
        margin: 0,
      });
    }

    if (slide.layout !== "title") {
      s.addText(`${String(idx + 1).padStart(2, "0")} / ${String(deck.slides.length).padStart(2, "0")}`, {
        x: 0.35,
        y: 7.0,
        w: 1.6,
        h: 0.22,
        fontSize: 9,
        fontFace: "Calibri",
        color: muted,
        margin: 0,
      });
    }

    const fig = slide.layout === "title" ? undefined : slide.media[0];
    const data = fig ? await figureData(fig.src, fig.title || slide.title) : "";
    const hasFig = Boolean(fig && pptxData(data));

    if (slide.layout === "title") {
      s.addText(slide.title, {
        x: 0.8,
        y: 2.35,
        w: 11.7,
        h: 1.6,
        fontSize: 34,
        fontFace: "Georgia",
        color: ink,
        bold: true,
        align: "center",
        margin: 0,
      });
      s.addShape(pptx.ShapeType.rect, {
        x: 10.55,
        y: 4.55,
        w: 0.7,
        h: 0.06,
        fill: { color: accent },
      });
      s.addText(
        [meta.course, meta.courseCode, `PREPARED BY: ${meta.preparedBy}`, meta.department].join("\n"),
        {
          x: 7.4,
          y: 4.75,
          w: 5.2,
          h: 1.5,
          fontSize: 12,
          fontFace: "Calibri",
          color: ink,
          align: "right",
          bold: true,
          margin: 0,
        },
      );
    } else {
      s.addText(slide.title, {
        x: 0.5,
        y: 1.4,
        w: 12.3,
        h: 0.6,
        fontSize: 22,
        fontFace: "Georgia",
        color: navy,
        bold: true,
        margin: 0,
      });
      if (slide.layout === "two-column") {
        s.addText(
          slide.leftBullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
          { x: 0.5, y: 2.15, w: 6, h: hasFig ? 3.05 : 4.4, fontSize: 15, fontFace: "Calibri", color: ink, valign: "top" },
        );
        s.addText(
          slide.rightBullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
          { x: 6.8, y: 2.15, w: 5.9, h: hasFig ? 3.05 : 4.4, fontSize: 15, fontFace: "Calibri", color: ink, valign: "top" },
        );
      } else if (slide.bullets.length) {
        s.addText(
          slide.bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
          {
            x: 0.5,
            y: 2.15,
            w: hasFig && slide.layout !== "full-image" ? 7.4 : 12.3,
            h: 4.4,
            fontSize: 16,
            fontFace: "Calibri",
            color: ink,
            valign: "top",
          },
        );
      }
    }

    if (slide.citations.length && slide.layout !== "title") {
      s.addText(
        slide.citations
          .slice(0, 2)
          .map((c) => formatCitation(c, deck.citationStyle))
          .join("  ·  "),
        {
          x: 2.1,
          y: 6.95,
          w: 10.6,
          h: 0.28,
          fontSize: 9,
          fontFace: "Calibri",
          color: muted,
          margin: 0,
        },
      );
    }

    if (hasFig) {
      const box: Box =
        slide.layout === "full-image"
          ? { x: 7.15, y: 2.15, w: 5.6, h: 4.35 }
          : slide.layout === "two-column"
            ? { x: 0.5, y: 5.25, w: 4.4, h: 1.55 }
            : { x: 8.15, y: 2.15, w: 4.7, h: 4.15 };
      addJpeg(s, data, box);
      s.addText(`${fig?.title ?? slide.title}  ·  ${fig?.credit ?? "JUW-MicroSlides"}  ·  ${fig?.license ?? "CC0"}`, {
        x: box.x,
        y: box.y + box.h + 0.02,
        w: box.w,
        h: 0.22,
        fontSize: 8,
        fontFace: "Calibri",
        color: muted,
        margin: 0,
      });
    }
  }

  await pptx.writeFile({ fileName: `${slug(deck.title)}.pptx` });
}

function slug(s: string) {
  return s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60) || "juw-deck";
}
