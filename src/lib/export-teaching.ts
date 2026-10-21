import { safeExportSvg } from "./export-svg";
import { preflightTeachingImages, decodeTeachingImage } from "./teaching-images";
import { assertTeachingReady } from "./teaching-readiness";
import { slideExportScene, sceneOverflow } from "./slide-export-scene";
import { exportPptx } from "./export-pptx";
import { saveFile } from "./desktop";
import { teachingReferences } from "./teaching-bibliography";
import type { Deck } from "./types";
import { JUW } from "./brand";

function name(deck: Deck) {
  return deck.title.replace(/[^\p{L}\p{N}-]/gu, "-").slice(0, 80) || "lecture";
}
const fontCache = new Map<string, Promise<string>>();
async function font(name: string) {
  if (!fontCache.has(name))
    fontCache.set(
      name,
      (async () => {
        const res = await fetch(`${import.meta.env.BASE_URL}fonts/${name}.ttf`);
        if (!res.ok)
          throw Error(
            "The PDF font could not be loaded. Retry when application assets are available.",
          );
        const bytes = new Uint8Array(await res.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192)
          binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        return btoa(binary);
      })().catch((e) => {
        fontCache.delete(name);
        throw e;
      }),
    );
  return fontCache.get(name)!;
}
export async function teachingPdfBytes(deck: Deck) {
  assertTeachingReady(deck);
  await preflightTeachingImages(deck);
  const [{ jsPDF }] = await Promise.all([import("jspdf"), import("svg2pdf.js")]);
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: [960, 540],
    compress: true,
    putOnlyUsedFonts: true,
  });
  pdf.addFileToVFS("DejaVuSans.ttf", await font("DejaVuSans"));
  pdf.addFont("DejaVuSans.ttf", "Teaching", "normal");
  pdf.addFileToVFS("DejaVuSans-Bold.ttf", await font("DejaVuSans-Bold"));
  pdf.addFont("DejaVuSans-Bold.ttf", "Teaching", "bold");
  pdf.setProperties({
    title: deck.title,
    author: deck.preparedBy,
    subject: `${JUW.version} · ${deck.courseCode}`,
  });
  for (let index = 0; index < deck.slides.length; index++) {
    if (index) pdf.addPage([960, 540], "landscape");
    const scene = await slideExportScene(deck, index);
    if (sceneOverflow(scene).length)
      throw Error(`Slide ${index + 1} overflows. Reduce content before PDF export.`);
    for (const item of scene) {
      const x = item.x * 0.75,
        y = item.y * 0.75,
        w = item.w * 0.75,
        h = item.h * 0.75;
      pdf.setGState(
        pdf.GState({
          opacity: item.opacity * (item.kind === "rect" ? (item.fillAlpha ?? 1) : 1),
          "stroke-opacity": item.opacity * (item.kind === "rect" ? (item.lineAlpha ?? 1) : 1),
        }),
      );
      if (item.kind === "text") {
        pdf.setFont("Teaching", item.bold ? "bold" : "normal");
        pdf.setFontSize(item.size * 0.75);
        pdf.setTextColor(`#${item.color}`);
        pdf.text(item.text, x, y + h * 0.8);
      } else if (item.kind === "rect") {
        if (item.fill) pdf.setFillColor(`#${item.fill}`);
        if (item.line) pdf.setDrawColor(`#${item.line}`);
        pdf.setLineWidth(Math.max(0.1, item.lineWidth * 0.75));
        const mode = item.fill && item.line ? "FD" : item.fill ? "F" : "S";
        if (item.shape === "line")
          pdf.line(x, item.flipV ? y + h : y, x + w, item.flipV ? y : y + h);
        else if (item.shape === "ellipse") pdf.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, mode);
        else pdf.rect(x, y, w, h, mode);
      } else if (item.src.startsWith("data:image/svg+xml")) {
        const comma = item.src.indexOf(","),
          data = item.src.slice(comma + 1);
        const xml = item.src.slice(0, comma).includes(";base64")
          ? atob(data)
          : decodeURIComponent(data);
        const doc = new DOMParser().parseFromString(safeExportSvg(xml), "image/svg+xml");
        if (doc.querySelector("parsererror")) throw Error(`Slide ${index + 1}: invalid SVG.`);
        for (const text of doc.querySelectorAll<SVGTextElement>("text,tspan"))
          text.style.fontFamily = "Teaching";
        await pdf.svg(doc.documentElement as unknown as SVGElement, { x, y, width: w, height: h });
      } else {
        const image = await decodeTeachingImage(item.src, index);
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(4096, image.naturalWidth);
        canvas.height = Math.round((canvas.width * image.naturalHeight) / image.naturalWidth);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw Error("Image rendering unavailable");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        // Match the preview's contain/cover crop in the destination rectangle.
        const fit = (item.cover ? Math.max : Math.min)(
            w / image.naturalWidth,
            h / image.naturalHeight,
          ),
          iw = image.naturalWidth * fit,
          ih = image.naturalHeight * fit;
        pdf.saveGraphicsState();
        pdf.rect(x, y, w, h);
        pdf.clip();
        pdf.discardPath();
        pdf.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          x + (w - iw) / 2,
          y + (h - ih) / 2,
          iw,
          ih,
        );
        pdf.restoreGraphicsState();
      }
    }
  }
  return new Uint8Array(pdf.output("arraybuffer"));
}
export async function exportTeachingPdf(deck: Deck) {
  return saveFile(`${name(deck)}.pdf`, await teachingPdfBytes(deck), "pdf");
}
export async function exportTeachingPack(deck: Deck) {
  assertTeachingReady(deck);
  const Zip = (await import("jszip")).default,
    zip = new Zip();
  const pptx = await exportPptx(deck, { returnBytes: true });
  if (!pptx) throw Error("PPTX generation failed.");
  for (const [i, slide] of deck.slides.entries())
    if (slide.teaching?.diagram) {
      const { teachingDiagramSvg } = await import("./export-diagram");
      zip.file(`editable-diagrams/slide-${i + 1}.svg`, await teachingDiagramSvg(slide));
    }
  zip.file("accessible-transcript.html", accessibleTranscript(deck));
  zip.file("slides.pptx", pptx);
  zip.file("slides.pdf", await teachingPdfBytes(deck));
  zip.file("references.txt", teachingReferences(deck).join("\n\n"));
  zip.file(
    "speaker-notes.md",
    deck.slides
      .map(
        (s, i) =>
          `# ${i + 1}. ${s.title}\n\n${s.notes}\n\n${s.teaching ? JSON.stringify(s.teaching, null, 2) : ""}`,
      )
      .join("\n\n"),
  );
  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        version: JUW.version,
        revision: deck.revisionId || null,
        deckId: deck.id,
        slides: deck.slides.length,
        preparedBy: deck.preparedBy,
        instructorVerification: deck.teachingVerification,
        reviewedContentUpdatedAt: new Date(deck.updatedAt).toISOString(),
        exportedAt: new Date().toISOString(),
        review: "Lecturer evidence gate clear; not independent scientific certification",
      },
      null,
      2,
    ),
  );
  const license = await fetch(`${import.meta.env.BASE_URL}fonts/LICENSE.txt`);
  if (!license.ok) throw Error("Font license unavailable");
  zip.file("fonts-LICENSE.txt", await license.text());
  zip.file(
    "Google-Slides-import.txt",
    "In Google Slides, use File > Import slides and select slides.pptx. Check imported typography, diagrams and accessibility before teaching. This package does not publish to a Google account. PDF embeds DejaVu fonts; PPTX uses system Arial/Georgia and editable native schematic shapes. PowerPoint fonts are not embedded.\n",
  );
  return saveFile(
    `${name(deck)}-teaching-pack.zip`,
    await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }),
    "zip",
  );
}

function accessibleTranscript(deck: Deck) {
  const esc = (s: string) =>
    s.replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
    );
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>${esc(deck.title)} — accessible teaching transcript</title><style>body{max-width:70ch;margin:2rem auto;padding:1rem;font:1.15rem/1.6 sans-serif;color:#111;background:#fff}section{border-top:1px solid;padding-top:1rem}dt{font-weight:bold}dd{margin-bottom:1rem}</style><main><h1>${esc(deck.title)}</h1><p>${esc(deck.courseCode)} · ${esc(deck.preparedBy)} · For educational use only</p>${deck.slides
    .map(
      (slide, i) =>
        `<section aria-labelledby="s${i}"><h2 id="s${i}">${i + 1}. ${esc(slide.title)}</h2><p>${esc(slide.subtitle)}</p><ul>${[...slide.bullets, ...slide.leftBullets, ...slide.rightBullets].map((b) => `<li>${esc(b)}</li>`).join("")}</ul>${
          slide.teaching
            ? `<dl>${Object.entries(slide.teaching)
                .filter(([k, v]) => typeof v === "string" && v && k !== "diagram")
                .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(String(v))}</dd>`)
                .join(
                  "",
                )}</dl><ol>${slide.teaching.steps.map((t) => `<li>${esc(t)}</li>`).join("")}</ol><table><caption>Comparison</caption><thead><tr><th>Criterion</th><th>Option A</th><th>Option B</th></tr></thead><tbody>${slide.teaching.comparison.map((r) => `<tr><th scope="row">${esc(r.criterion)}</th><td>${esc(r.left)}</td><td>${esc(r.right)}</td></tr>`).join("")}</tbody></table>${slide.teaching.quantitative.map((q) => `<p>${esc(q.metric)}: ${esc(q.value)} ${esc(q.units)}. ${esc(q.conditions)}. Source: ${esc(q.sourceUrl)}</p>`).join("")}`
            : ""
        }<h3>Speaker notes</h3><p>${esc(slide.notes).replace(/\n/g, "<br>")}</p></section>`,
    )
    .join("")}<section><h2>Complete references</h2><ol>${teachingReferences(deck)
    .map((r) => `<li>${esc(r)}</li>`)
    .join("")}</ol></section></main></html>`;
}
