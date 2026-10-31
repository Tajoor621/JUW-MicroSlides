import { scientificRuns } from "./scientific-format";
import { decodeTeachingImage } from "./teaching-images";
import { OPENSTAX_ATTRIBUTION } from "./textbook-concepts";
import { JUW } from "./brand";
import { font } from "./export-teaching";
import {
  assertNoteSources,
  NOTES_LABEL,
  treatmentStatement,
  type EducationalNote,
} from "./educational-notes";
/** A4 portrait only. No note-to-PPTX path. */
export async function educationalNotesPdfBytes(raw: EducationalNote) {
  const note = assertNoteSources(raw);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });
  for (const [file, style] of [
    ["DejaVuSans", "normal"],
    ["DejaVuSans-Bold", "bold"],
    ["DejaVuSans-Oblique", "italic"],
    ["DejaVuSans-BoldOblique", "bolditalic"],
  ] as const) {
    pdf.addFileToVFS(file + ".ttf", await font(file));
    pdf.addFont(file + ".ttf", "Notes", style);
  }
  // Rasterise the original seal once at 600 px for this small PDF header.
  // Repeated svg2pdf calls can leak page graphics state; the source stays SVG.
  const sealImage = await decodeTeachingImage(JUW.deptSeal, 0);
  const sealCanvas = document.createElement("canvas");
  sealCanvas.width = 600;
  sealCanvas.height = 600;
  const sealContext = sealCanvas.getContext("2d");
  if (!sealContext)
    throw Error("The department seal could not be prepared for notes. Retry PDF preparation.");
  sealContext.drawImage(sealImage, 0, 0, 600, 600);
  const sealPng = sealCanvas.toDataURL("image/png");
  // Render the official SVG once; use a plain image draw so SVG graphics states
  // cannot override the page watermark opacity. Keep it behind all body text.
  const crestImage = await decodeTeachingImage(JUW.crest, 0);
  const canvas = document.createElement("canvas");
  canvas.width = crestImage.naturalWidth;
  canvas.height = crestImage.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw Error("The official crest could not be prepared for notes.");
  context.drawImage(crestImage, 0, 0);
  const crestPng = canvas.toDataURL("image/png");
  function drawWatermark() {
    pdf.saveGraphicsState();
    pdf.setGState(pdf.GState({ opacity: 0.06, "stroke-opacity": 0.06 }));
    pdf.addImage(crestPng, "PNG", 55, 98, 100, 100, "notes-official-crest", "FAST");
    pdf.restoreGraphicsState();
  }
  drawWatermark();
  const margin = 20,
    width = 170,
    bodyTop = 39,
    bodyBottom = 273;
  let y = bodyTop;
  const pageContent: string[][] = [[]];
  function addPage() {
    if (pdf.getNumberOfPages() >= 12)
      throw Error("Notes exceed 12 pages. Narrow the topic; no text was truncated.");
    pdf.addPage("a4", "portrait");
    drawWatermark();
    pageContent.push([]);
    y = bodyTop;
  }
  function write(text: string, size = 10, bold = false) {
    pdf.setFont("Notes", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, width) as string[];
    const spans: { start: number; end: number; italic: boolean }[] = [];
    let length = 0;
    for (const run of scientificRuns(text)) {
      spans.push({ start: length, end: length + run.text.length, italic: run.italic });
      length += run.text.length;
    }
    let searchFrom = 0;
    for (const line of lines) {
      if (y + size * 0.48 > bodyBottom) addPage();
      const at = text.indexOf(line, searchFrom);
      let x = margin;
      if (at >= 0) {
        for (const span of spans.filter((s) => s.start < at + line.length && s.end > at)) {
          const part = text.slice(Math.max(at, span.start), Math.min(at + line.length, span.end));
          pdf.setFont(
            "Notes",
            span.italic ? (bold ? "bolditalic" : "italic") : bold ? "bold" : "normal",
          );
          pdf.text(part, x, y);
          x += pdf.getTextWidth(part);
        }
        searchFrom = at + line.length;
      } else {
        pdf.setFont("Notes", bold ? "bold" : "normal");
        pdf.text(line, margin, y);
      }
      pageContent.at(-1)!.push(line);
      y += size * 0.48;
    }
    y += 2;
  }
  function heading(text: string) {
    if (y + 18 > bodyBottom) addPage();
    write(text, 12, true);
  }
  function fact(text: string, sourceId: string) {
    const index = note.sources.findIndex((s) => s.id === sourceId) + 1;
    write(`${text} [${index}]`);
    if (treatmentStatement(text)) {
      write(`Guideline year: ${note.sources[index - 1].year}`);
      write("Check current guidance before clinical use.");
    }
  }
  write(note.topic, 17, true);
  write(`${note.level} · ${note.date}`);
  write(NOTES_LABEL, 9);
  heading("Learning outcomes");
  for (const outcome of note.learningOutcomes?.length
    ? note.learningOutcomes
    : ["Explain the retrieved source statements, compare their scope and identify limitations."])
    write(outcome);
  for (const section of note.sections) {
    heading(section.heading);
    if (!section.statements.length)
      write("No source-supported passage retrieved for this section.");
    for (const s of section.statements) fact(s.text, s.sourceId);
  }
  heading("Self-check questions with answers");
  for (const q of note.questions) {
    write(q.question, 10, true);
    fact(`Answer: ${q.answer.text}`, q.answer.sourceId);
  }
  heading("References");
  for (const [i, ref] of note.sources.entries()) {
    write(
      `${i + 1}. ${ref.title} (${ref.year}). ${ref.doi ? `DOI: ${ref.doi}` : ref.pmid ? `PMID: ${ref.pmid}` : `Textbook chapter: ${ref.chapter}`}`,
    );
    write(ref.url, 9);
  }
  heading("Glossary");
  if (!note.glossary.length) write("No explicit source definitions were retrieved.");
  for (const entry of note.glossary)
    fact(`${entry.term}: ${entry.definition.text}`, entry.definition.sourceId);
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.saveGraphicsState();
    pdf.setGState(pdf.GState({ opacity: 1, "stroke-opacity": 1 }));
    pdf.addImage(sealPng, "PNG", 20, 8, 13, 13, "notes-department-seal", "FAST");
    pdf.restoreGraphicsState();
    pdf.setFont("Notes", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor("#203248");
    pdf.text(NOTES_LABEL, 36, 13);
    pdf.text("Not yet expert-reviewed", 36, 24);
    pdf.text(pdf.splitTextToSize(note.topic, 150).slice(0, 2), 36, 18);
    pdf.setDrawColor("#aab4bd");
    pdf.line(20, 27, 190, 27);
    if (note.sources.some((s) => s.kind === "textbook" && s.title.includes("Microbiology"))) {
      pdf.setFontSize(6.5);
      pdf.text(OPENSTAX_ATTRIBUTION, 20, 291);
      pdf.setFontSize(8);
    }
    pdf.text(
      `Page ${page} of ${pages} · For personal educational use. Not for distribution.`,
      20,
      285,
    );
  }
  pdf.setProperties({
    title: `${JUW.name} · ${note.topic}`,
    subject: `${JUW.name} ${JUW.version} · ${NOTES_LABEL} · Not yet expert-reviewed`,
    keywords: "A4 portrait; watermark opacity 0.06; personal educational use; V6.2.1",
  });
  return { bytes: new Uint8Array(pdf.output("arraybuffer")), pages, pageContent };
}
