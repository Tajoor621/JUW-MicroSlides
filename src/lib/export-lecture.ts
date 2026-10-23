import {
  escapeLectureHtml,
  lectureStructuredHtml,
  teachingStructuredHtml,
} from "./lecture-transcript";
import { decodeTeachingImage } from "./teaching-images";
import { font } from "./export-teaching";
import { assertTeachingReady } from "./teaching-readiness";
import { saveFile } from "./desktop";
import { teachingReferences } from "./teaching-bibliography";
import type { Deck } from "./types";
const filename = (d: Deck) => d.title.replace(/[^\p{L}\p{N}-]/gu, "-").slice(0, 80) || "lecture";
export function lectureMarkdown(deck: Deck) {
  return (
    `# ${deck.title}\n\nDraft status: ${deck.teachingVerification ? "Instructor attestation recorded; validate its revision on import" : "Evidence review required"}\n\n` +
    deck.slides
      .map(
        (s, i) =>
          `## ${i + 1}. ${s.title}\n\n${s.bullets.map((b) => `- ${b}`).join("\n")}\n\n${s.learningObjectives?.map((o) => `- Objective: ${o}`).join("\n") || ""}\n\n${s.notes}\n\n`,
      )
      .join("\n") +
    `## Complete editable backup\n\nThe following recovery block preserves every structured field, source, reference, course membership and review record.\n\n\`\`\`juw-microslides-json\n${JSON.stringify({ format: "juw-microslides", schemaVersion: 1, decks: [deck] }, null, 2)}\n\`\`\`\n`
  );
}
export async function exportMarkdownBackup(deck: Deck) {
  return saveFile(`${filename(deck)}.md`, new TextEncoder().encode(lectureMarkdown(deck)), "md");
}
export async function exportLectureHandout(deck: Deck, protocolOnly = false) {
  assertTeachingReady(deck);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  pdf.addFileToVFS("DejaVuSans.ttf", await font("DejaVuSans"));
  pdf.addFont("DejaVuSans.ttf", "Teaching", "normal");
  pdf.addFileToVFS("DejaVuSans-Bold.ttf", await font("DejaVuSans-Bold"));
  pdf.addFont("DejaVuSans-Bold.ttf", "Teaching", "bold");
  let y = 40;
  const margin = 40,
    width = 515;
  function write(text: string, size = 11, bold = false) {
    pdf.setFont("Teaching", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    for (const line of pdf.splitTextToSize(text, width)) {
      if (y + size * 1.4 > 800) {
        if (protocolOnly)
          throw Error(
            "The protocol exceeds one printable page. Shorten the card or export a teaching pack; no steps were truncated.",
          );
        pdf.addPage();
        y = 40;
      }
      pdf.text(line, margin, y);
      y += size * 1.4;
    }
    y += 5;
  }
  write(deck.title, 18, true);
  write(`${deck.courseCode} · For educational use only`, 10);
  write(
    `Last verified by ${deck.teachingVerification!.instructor} on ${new Date(deck.teachingVerification!.at).toISOString().slice(0, 10)}; lecturer self-attestation.`,
    9,
  );
  const slides = protocolOnly ? deck.slides.filter((s) => s.protocol) : deck.slides;
  if (protocolOnly && !slides.some((s) => s.protocol?.steps.length))
    throw Error(
      "The protocol card requires reviewed procedural steps. Add the source-linked steps before printing.",
    );
  if (protocolOnly && !slides.length) throw Error("This deck contains no structured lab protocol.");
  for (const s of slides) {
    write(s.title, 13, true);
    if (protocolOnly && s.protocol) {
      const p = s.protocol;
      if (p.materials.length) write(`Materials: ${p.materials.join("; ")}`, 10);
      p.steps.forEach((step, i) =>
        write(`${i + 1}. ${step.action} (${step.timing}) — ${step.sourceUrl}`, 10),
      );
      for (const [label, value] of [
        ["Interpretation", p.interpretation],
        ["QC", p.qc],
        ["Biosafety / PPE", p.biosafety],
        ["Troubleshooting", p.troubleshooting],
      ])
        if (value) write(`${label}: ${value}`, 10);
    } else {
      [...s.bullets, ...s.leftBullets, ...s.rightBullets].forEach((b) => write(b));
      if (s.teaching) {
        for (const [key, value] of Object.entries(s.teaching))
          if (typeof value === "string" && value && key !== "diagram")
            write(`${key}: ${value}`, 10);
        s.teaching.steps.forEach((step, i) => write(`${i + 1}. ${step}`, 10));
        s.teaching.comparison.forEach((r) => write(`${r.criterion}: ${r.left} | ${r.right}`, 10));
        s.teaching.quantitative.forEach((q) =>
          write(`${q.metric}: ${q.value} ${q.units}; ${q.conditions}; ${q.sourceUrl}`, 10),
        );
      }
      if (s.layout !== "assessment" && s.notes) write(`Notes: ${s.notes}`, 10);
      if (s.learningObjectives?.length)
        s.learningObjectives.forEach((o) => write(`Objective: ${o}`, 11));
      if (s.scientificTable) {
        write(s.scientificTable.caption, 12, true);
        write(s.scientificTable.headers.join(" | "), 10, true);
        s.scientificTable.rows.forEach((r) => write(r.join(" | "), 10));
      }
      if (s.protocol) {
        write(`Materials: ${s.protocol.materials.join("; ")}`, 10);
        s.protocol.steps.forEach((p, i) =>
          write(`${i + 1}. ${p.action} — ${p.timing} (${p.sourceUrl})`, 10),
        );
        for (const [key, value] of Object.entries(s.protocol))
          if (typeof value === "string" && value) write(`${key}: ${value}`, 10);
      }
      if (s.caseData)
        for (const [key, value] of Object.entries(s.caseData))
          if (typeof value === "string" && key !== "phase" && value) write(`${key}: ${value}`, 11);
      if (s.chart) {
        write(`${s.chart.title}: ${s.chart.xLabel} / ${s.chart.yLabel}`, 11, true);
        write(s.chart.points.map((p) => `${p.x}, ${p.y}`).join("; "), 10);
      }
      s.taxonomy?.forEach((n) => write(n.label, 11));
      for (const [i, q] of (s.assessment || []).entries()) {
        write(`${i + 1}. ${q.question}`);
        q.options.forEach((o, j) => write(`${String.fromCharCode(65 + j)}. ${o}`, 10));
        if (q.kind === "image") {
          const media = s.media.find((m) => m.id === q.mediaId);
          if (!media) throw Error("An image question is missing its figure.");
          const image = await decodeTeachingImage(media.src, deck.slides.indexOf(s));
          const canvas = document.createElement("canvas");
          const scale = Math.min(1, 1000 / image.naturalWidth);
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const ctx = canvas.getContext("2d");
          if (!ctx) throw Error("Could not prepare the question figure.");
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          const fit = Math.min(300 / canvas.width, 180 / canvas.height),
            w = canvas.width * fit,
            h = canvas.height * fit;
          if (y + h > 790) {
            pdf.addPage();
            y = 40;
          }
          pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, y, w, h);
          y += h + 8;
          write(`Figure: ${media.title} · ${media.credit} · ${media.license} · ${media.source}`, 9);
        }
      }
    }
    if (s.keyTakeaway) write(`Key takeaway: ${s.keyTakeaway}`, 11, true);
    if (s.clinicalPearl) write(`Clinical pearl: ${s.clinicalPearl}`, 11, true);
    if (s.caseData) s.caseData.questions.forEach((q) => write(`Question: ${q}`, 11));
  }
  if (!protocolOnly) {
    write("References", 14, true);
    teachingReferences(deck).forEach((r) => write(r, 9));
  }
  return saveFile(
    `${filename(deck)}-${protocolOnly ? "protocol-card" : "student-handout"}.pdf`,
    new Uint8Array(pdf.output("arraybuffer")),
    "pdf",
  );
}
export async function exportAccessibleLecture(deck: Deck) {
  assertTeachingReady(deck);
  const esc = escapeLectureHtml;
  const body = deck.slides
    .map(
      (s, i) =>
        `<section aria-labelledby="slide-${i}"><h2 id="slide-${i}">${esc(s.title)}</h2><p>${esc(s.subtitle)}</p><ul>${[...s.bullets, ...s.leftBullets, ...s.rightBullets].map((b) => `<li>${esc(b)}</li>`).join("")}</ul>${teachingStructuredHtml(s)}${lectureStructuredHtml(s)}${s.media.map((m) => `<p>Figure description: ${esc(s.teaching?.altText || m.title)}. ${esc(m.credit)} — ${esc(m.license)} — ${esc(m.source)}</p>`).join("")}</section>`,
    )
    .join("");
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(deck.title)}</title><style>body{max-width:70ch;margin:2rem auto;padding:1rem;font:1.25rem/1.7 sans-serif;color:#000;background:#fff}section{border-top:2px solid;padding-top:1rem}table{border-collapse:collapse}th,td{border:2px solid;padding:.5rem}@media print{section{break-before:page}}</style><main><h1>${esc(deck.title)}</h1><p>${esc(deck.courseCode)} · For educational use only</p><p>Last verified by ${esc(deck.teachingVerification!.instructor)} on ${new Date(deck.teachingVerification!.at).toISOString().slice(0, 10)}; lecturer self-attestation.</p>${body}<h2>References</h2><ol>${teachingReferences(
    deck,
  )
    .map((r) => `<li>${esc(r)}</li>`)
    .join("")}</ol></main></html>`;
  return saveFile(`${filename(deck)}-accessible.html`, new TextEncoder().encode(html), "html");
}
