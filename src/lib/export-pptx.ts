import { formatCitation } from "./citations";
import type { Deck } from "./types";
import { slideExportScene } from "./slide-export-scene";
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    if (/^https?:/i.test(src)) img.crossOrigin = "anonymous";
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

export async function exportPptx(deck: Deck) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "JUW_PREVIEW", width: 1280 / 96, height: 720 / 96 });
  pptx.layout = "JUW_PREVIEW";
  pptx.author = "JUW-MicroSlides";
  pptx.title = deck.title;
  pptx.subject = `${deck.discipline} · ${deck.topic}`;
  pptx.theme = { headFontFace: "Georgia", bodyFontFace: "Arial" };
  const images = new Map<string, string | null>();
  async function imageData(src: string, width: number, height: number, cover: boolean) {
    const key = `${src}:${width}:${height}:${cover}`;
    if (!images.has(key)) {
      let data: string | null = null;
      try {
        const image = await loadImage(src);
        const canvas = document.createElement("canvas");
        // Rasterise artwork alone, at 2× resolution. Text is never rasterised.
        const resolution = Math.min(2, 3200 / width, 1800 / height);
        canvas.width = Math.max(1, Math.round(width * resolution));
        canvas.height = Math.max(1, Math.round(height * resolution));
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const fit = (cover ? Math.max : Math.min)(
            canvas.width / image.naturalWidth,
            canvas.height / image.naturalHeight,
          );
          const w = image.naturalWidth * fit,
            h = image.naturalHeight * fit;
          ctx.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
          data = canvas.toDataURL("image/png");
        }
      } catch {
        /* Preserve failure explicitly instead of substituting unrelated art. */
      }
      images.set(key, data);
    }
    return images.get(key);
  }
  for (let i = 0; i < deck.slides.length; i++) {
    const source = deck.slides[i];
    const slide = pptx.addSlide();
    const scene = await slideExportScene(deck, i);
    for (const item of scene) {
      const box = { x: item.x / 96, y: item.y / 96, w: item.w / 96, h: item.h / 96 };
      const transparency = Math.round((1 - item.opacity) * 100);
      if (item.kind === "rect") {
        slide.addShape(pptx.ShapeType.rect, {
          ...box,
          fill: {
            color: item.fill || "FFFFFF",
            transparency: item.fill
              ? Math.round((1 - item.opacity * (item.fillAlpha ?? 1)) * 100)
              : 100,
          },
          line: {
            color: item.line || "FFFFFF",
            width: item.lineWidth * 0.75,
            transparency: item.line
              ? Math.round((1 - item.opacity * (item.lineAlpha ?? 1)) * 100)
              : 100,
          },
        });
      } else if (item.kind === "text") {
        slide.addText(item.text, {
          ...box,
          w: box.w + 0.04,
          h: box.h + 0.015,
          fontFace: item.font,
          fontSize: item.size * 0.75,
          bold: item.bold,
          color: item.color,
          transparency,
          margin: 0,
          wrap: false,
          breakLine: false,
          valign: "middle",
          paraSpaceAfter: 0,
        });
      } else {
        const data = await imageData(item.src, item.w, item.h, item.cover);
        if (!data) {
          slide.addText("Original image unavailable", {
            ...box,
            fontFace: "Arial",
            fontSize: 10,
            color: "5C6B7A",
            margin: 0,
          });
          continue;
        }
        slide.addImage({ data, ...box, transparency });
      }
    }
    slide.addNotes(
      [
        source.notes,
        source.citations.length
          ? "Full slide references:\n" +
            source.citations
              .map(
                (c) =>
                  `${formatCitation(c, deck.citationStyle)}${c.doi ? ` https://doi.org/${c.doi}` : c.pmid ? ` https://pubmed.ncbi.nlm.nih.gov/${c.pmid}/` : ""}`,
              )
              .join("\n")
          : "",
        source.media.length
          ? "Attached media provenance:\n" +
            source.media
              .map((m) => `${m.title} · ${m.credit} · ${m.license} · ${m.originalSrc || m.src}`)
              .join("\n")
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
  }
  await pptx.writeFile({ compression: true, fileName: `${slug(deck.title)}.pptx` });
}

function slug(s: string) {
  return (
    s
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "juw-deck"
  );
}
