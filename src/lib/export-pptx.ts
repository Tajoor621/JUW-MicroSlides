import { scientificPreflight } from "./scientific-format";
import { embedPortableFonts, loadPortableFonts } from "./pptx-fonts";
import { lectureSpeakerNotes } from "./lecture-notes";
import { safeExportSvg } from "./export-svg";
import { preflightTeachingImages } from "./teaching-images";
import { assertTeachingReady, teachingReady } from "./teaching-readiness";
import { MAX_SLIDES } from "./types";
import { integrityAudit } from "./deck-integrity";
import { isDesktop, saveFile } from "./desktop";
import { formatCitation } from "./citations";
import type { Deck } from "./types";
import { slideExportScene, sceneOverflow } from "./slide-export-scene";
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

export async function exportPptx(
  deck: Deck,
  options: { classroom?: boolean; returnBytes?: boolean } = {},
) {
  // Reviewed release remains strict; ordinary downloads explicitly use draft mode.
  options = { ...options, classroom: options.classroom === true };
  if (options.classroom) assertTeachingReady(deck);
  if (deck.slides.length < 1 || deck.slides.length > MAX_SLIDES)
    throw new Error(
      "PPTX requires 1–50 slides. Your legacy project is preserved; export a reduced copy.",
    );
  const findings = integrityAudit(deck);
  let ready = teachingReady(deck);
  let sceneDeck = deck;
  const exportWarnings: string[] = [];
  if (options.classroom && !ready)
    throw new Error("Resolve critical evidence and repetition findings before reviewed export.");
  if (options.classroom) await preflightTeachingImages(deck);
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "JUW_PREVIEW", width: 1280 / 96, height: 720 / 96 });
  pptx.layout = "JUW_PREVIEW";
  pptx.author = "JUW-MicroSlides";
  pptx.title = deck.title;
  pptx.subject = `${deck.discipline} · ${deck.topic}`;
  let portable: Awaited<ReturnType<typeof loadPortableFonts>> | undefined;
  if (deck.exportTypography === "portable") {
    try {
      portable = await loadPortableFonts();
    } catch (error) {
      if (options.classroom) throw error;
      sceneDeck = { ...deck, exportTypography: "original" };
      ready = false;
      exportWarnings.push(
        "Portable fonts were unavailable. This editable draft uses system fonts; inspect typography before presenting.",
      );
    }
  }
  pptx.theme = portable
    ? { headFontFace: "DejaVu Sans", bodyFontFace: "DejaVu Sans" }
    : { headFontFace: "Georgia", bodyFontFace: "Arial" };
  const images = new Map<string, string | null>();
  async function imageData(src: string, width: number, height: number, cover: boolean) {
    // Native SVG stays vector in PowerPoint: do not rasterize icons or topic art.
    if (/^data:image\/svg\+xml[;,]/i.test(src)) {
      if (options.classroom) await loadImage(src);
      // PptxGenJS expects a base64-encoded SVG payload; percent-encoded data
      // URIs may be silently omitted from the generated slide XML.

      try {
        const comma = src.indexOf(",");
        const raw = src.slice(comma + 1);
        const svg = safeExportSvg(
          src.slice(0, comma).includes(";base64")
            ? new TextDecoder().decode(Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)))
            : decodeURIComponent(raw),
        );
        const bytes = new TextEncoder().encode(svg);
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192)
          binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        return `data:image/svg+xml;base64,${btoa(binary)}`;
      } catch (error) {
        if (options.classroom) throw error;
        return null;
      }
    }
    const key = `${src}:${width}:${height}:${cover}`;
    if (!images.has(key)) {
      let data: string | null = null;
      try {
        const image = await loadImage(src);
        const canvas = document.createElement("canvas");
        // Rasterize bitmap artwork only. Export at up to 3x, bounded by source pixels;
        // upscaling a small image cannot restore missing photographic detail.
        const resolution = Math.max(
          1,
          Math.min(
            3,
            4096 / width,
            2304 / height,
            image.naturalWidth / width,
            image.naturalHeight / height,
          ),
        );
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
    const scene = await slideExportScene(sceneDeck, i, { draft: !options.classroom });
    const overflow = sceneOverflow(scene);
    if (options.classroom && overflow.length)
      throw new Error(
        `Slide ${i + 1} contains overflowing text. Rephrase it before reviewed export.`,
      );
    if (overflow.length)
      slide.addNotes(
        `Layout warning: ${overflow.length} text lines extend outside the slide. This draft requires layout correction.`,
      );
    for (const item of scene) {
      const box = { x: item.x / 96, y: item.y / 96, w: item.w / 96, h: item.h / 96 };
      const transparency = Math.round((1 - item.opacity) * 100);
      if (item.kind === "rect") {
        slide.addShape(pptx.ShapeType[item.shape || "rect"], {
          flipV: item.flipV,
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
          italic: item.italic,
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
          if (options.classroom)
            throw new Error(
              `Slide ${i + 1}: a required image could not be decoded. Repair or remove it and review the slide again.`,
            );
          slide.addText("Original image unavailable", {
            ...box,
            fontFace: "Arial",
            fontSize: 10,
            color: "5C6B7A",
            margin: 0,
          });
          continue;
        }
        slide.addImage({ data, ...box, transparency, altText: item.alt || "Teaching figure" });
      }
    }
    if (!ready)
      slide.addText("DRAFT — evidence review required", {
        x: 2,
        y: 0.18,
        w: 7,
        h: 0.2,
        fontFace: "Arial",
        fontSize: 9,
        color: "8A6A1A",
        margin: 0,
      });
    slide.addNotes(
      [
        `Integrity status: ${ready ? "Lecturer evidence gate clear; not independent certification" : "DRAFT"}. ${findings.length} screening findings.`,
        ready && deck.teachingVerification
          ? `Last verified by ${deck.teachingVerification.instructor} on ${new Date(deck.teachingVerification.at).toISOString().slice(0, 10)}. Lecturer self-attestation, not independent certification.`
          : "Draft — current deck has not cleared lecturer evidence review.",
        ...exportWarnings,
        lectureSpeakerNotes(source),
        scientificPreflight({ ...deck, slides: [source] })
          .map((f) => f.message)
          .join("\n"),
        source.teaching
          ? "Teaching design and discussion:\n" + JSON.stringify(source.teaching, null, 2)
          : "",
        source.surfaceReviews?.length
          ? "Lecturer decisions for headings, notes and figures (not independent certification):\n" +
            source.surfaceReviews
              .map(
                (r) =>
                  `${r.field}: ${r.verdict} · ${r.rationale}\n${r.sourceUrl || "Nonfactual label"} · ${r.locator || ""}\n${r.quote || ""}`,
              )
              .join("\n\n")
          : "",
        source.claims?.length
          ? "Claim evidence trail:\n" +
            source.claims
              .map(
                (c) =>
                  `${c.text} [${c.classification}; ${c.status}]\n${c.evidence.map((e) => `${e.sourceUrl} · ${e.locator} · ${e.access} · checked ${new Date(e.checkedAt).toISOString()}\n${e.quote}`).join("\n")}`,
              )
              .join("\n\n")
          : "",
        source.citations.some((c) => c.publicationCheck)
          ? "Publication-status checks (provider metadata, not scientific certification):\n" +
            source.citations
              .filter((c) => c.publicationCheck)
              .map(
                (c) =>
                  `${c.title}: ${c.publicationCheck!.status}; checked ${new Date(c.publicationCheck!.checkedAt).toISOString()}; ${c.publicationCheck!.providers.join(", ")}; complete=${c.publicationCheck!.complete}\n${c.publicationCheck!.notices.map((n) => `${n.type}: ${n.url}`).join("\n")}`,
              )
              .join("\n")
          : "",
        deck.sourceDocuments
          ?.filter((d) => source.claims?.some((c) => c.evidence.some((e) => e.sourceUrl === d.url)))
          .map(
            (d) =>
              `Source document: ${d.title} · ${d.publisher} · ${d.url}\n${d.locator} · ${d.license} · version ${d.publishedDate || "unspecified"} · jurisdiction ${d.jurisdiction || "unspecified"} · retrieved ${new Date(d.retrievedAt).toISOString()} · ${d.acquisition}`,
          )
          .join("\n"),
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
  const name = pptxFileName(sceneDeck);
  if (portable || isDesktop() || options.returnBytes) {
    const data = (await pptx.write({
      outputType: "arraybuffer",
      compression: true,
    })) as ArrayBuffer;
    const bytes = portable
      ? await embedPortableFonts(
          new Uint8Array(data),
          portable.regular,
          portable.bold,
          portable.license,
          portable.italic,
          portable.boldItalic,
        )
      : new Uint8Array(data);
    if (options.returnBytes) return bytes;
    await saveFile(name, bytes, "pptx");
  } else await pptx.writeFile({ compression: true, fileName: name });
}

export function pptxFileName(deck: Deck) {
  return `${teachingReady(deck) ? "" : "draft-"}${slug(deck.title)}.pptx`;
}

function slug(s: string) {
  return (
    s
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "juw-deck"
  );
}
