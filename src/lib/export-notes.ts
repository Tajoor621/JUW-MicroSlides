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
  const [{ jsPDF }] = await Promise.all([import("jspdf"), import("svg2pdf.js")]);
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
  ] as const) {
    pdf.addFileToVFS(file + ".ttf", await font(file));
    pdf.addFont(file + ".ttf", "Notes", style);
  }
  const [crest, seal] = await Promise.all(
    [JUW.crest, JUW.deptSeal].map(async (url) => {
      const r = await fetch(url);
      if (!r.ok)
        throw Error(
          "Notes branding could not be loaded. Retry after the application assets are available.",
        );
      return new DOMParser().parseFromString(await r.text(), "image/svg+xml").documentElement;
    }),
  );
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
    pageContent.push([]);
    y = bodyTop;
  }
  function write(text: string, size = 10, bold = false) {
    pdf.setFont("Notes", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, width) as string[];
    for (const line of lines) {
      if (y + size * 0.48 > bodyBottom) addPage();
      pdf.text(line, margin, y);
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
  write("Explain the retrieved source statements, compare their scope and identify limitations.");
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
      `${i + 1}. ${ref.title} (${ref.year}). ${ref.doi ? `DOI: ${ref.doi}` : `PMID: ${ref.pmid}`}`,
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
    pdf.setGState(pdf.GState({ opacity: 0.06, "stroke-opacity": 0.06 }));
    await pdf.svg(crest.cloneNode(true) as SVGElement, { x: 55, y: 98, width: 100, height: 100 });
    pdf.restoreGraphicsState();
    pdf.saveGraphicsState();
    await pdf.svg(seal.cloneNode(true) as SVGElement, { x: 20, y: 8, width: 13, height: 13 });
    pdf.restoreGraphicsState();
    pdf.setFont("Notes", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor("#203248");
    pdf.text(NOTES_LABEL, 36, 13);
    pdf.text(pdf.splitTextToSize(note.topic, 150).slice(0, 2), 36, 18);
    pdf.setDrawColor("#aab4bd");
    pdf.line(20, 27, 190, 27);
    pdf.text(
      `Page ${page} of ${pages} · For personal educational use. Not for distribution.`,
      20,
      285,
    );
  }
  pdf.setProperties({
    title: note.topic,
    subject: NOTES_LABEL,
    keywords: "A4 portrait; watermark opacity 0.06; personal educational use; V6.2.1",
  });
  return { bytes: new Uint8Array(pdf.output("arraybuffer")), pages, pageContent };
}
