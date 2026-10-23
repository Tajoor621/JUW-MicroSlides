import type { Slide } from "./types";
export const escapeLectureHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
/** Learner-visible structured fields only. Answer keys stay in instructor notes. */
export function lectureStructuredHtml(s: Slide) {
  const esc = escapeLectureHtml;
  const paragraph = (label: string, value: string) =>
    value ? `<p><strong>${esc(label)}:</strong> ${esc(value)}</p>` : "";
  const list = (values: string[]) => `<ul>${values.map((v) => `<li>${esc(v)}</li>`).join("")}</ul>`;
  return (
    (s.learningObjectives?.length
      ? `<h3>Learning objectives</h3>${list(s.learningObjectives)}`
      : "") +
    (s.scientificTable
      ? `<table><caption>${esc(s.scientificTable.caption)}</caption><thead><tr>${s.scientificTable.headers.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${s.scientificTable.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`
      : "") +
    (s.protocol
      ? `<h3>Protocol</h3>${paragraph("Materials", s.protocol.materials.join("; "))}<ol>${s.protocol.steps.map((p) => `<li>${esc(p.action)} — ${esc(p.timing)} (${esc(p.sourceUrl)})</li>`).join("")}</ol>${paragraph("Interpretation", s.protocol.interpretation)}${paragraph("Quality control", s.protocol.qc)}${paragraph("Biosafety / PPE", s.protocol.biosafety)}${paragraph("Troubleshooting", s.protocol.troubleshooting)}`
      : "") +
    (s.caseData
      ? `<h3>Case ${s.caseData.caseNumber}</h3>${paragraph("Vignette", s.caseData.vignette)}${paragraph("Differential", s.caseData.differential)}${paragraph("Work-up", s.caseData.workup)}${paragraph("Results", s.caseData.results)}${paragraph("Diagnosis", s.caseData.diagnosis)}${paragraph("Management", s.caseData.management)}${list(s.caseData.questions)}`
      : "") +
    (s.assessment?.map((q) => `<h3>${esc(q.question)}</h3>${list(q.options)}`).join("") || "") +
    (s.chart
      ? `<h3>${esc(s.chart.title)}</h3><table><thead><tr><th scope="col">${esc(s.chart.xLabel)}</th><th scope="col">${esc(s.chart.yLabel)}</th></tr></thead><tbody>${s.chart.points.map((p) => `<tr><td>${p.x}</td><td>${p.y}</td></tr>`).join("")}</tbody></table>${paragraph("Source", s.chart.sourceUrl)}`
      : "") +
    (s.taxonomy?.length
      ? `<h3>Taxonomy</h3>${list(s.taxonomy.map((n) => `${n.parent >= 0 ? s.taxonomy![n.parent]?.label + " → " : ""}${n.label}`))}`
      : "") +
    paragraph("Key takeaway", s.keyTakeaway || "") +
    paragraph("Clinical pearl", s.clinicalPearl || "")
  );
}

export function teachingStructuredHtml(s: Slide) {
  const p = s.teaching,
    esc = escapeLectureHtml;
  if (!p) return "";
  return (
    `<dl>${Object.entries(p)
      .filter(([k, v]) => typeof v === "string" && v && k !== "diagram")
      .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(String(v))}</dd>`)
      .join("")}</dl><ol>${p.steps.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>` +
    (p.comparison.length
      ? `<table><caption>Comparison</caption><thead><tr><th scope="col">Criterion</th><th scope="col">Option A</th><th scope="col">Option B</th></tr></thead><tbody>${p.comparison.map((r) => `<tr><th scope="row">${esc(r.criterion)}</th><td>${esc(r.left)}</td><td>${esc(r.right)}</td></tr>`).join("")}</tbody></table>`
      : "") +
    p.quantitative
      .map(
        (q) =>
          `<p>${esc(q.metric)}: ${esc(q.value)} ${esc(q.units)}. ${esc(q.conditions)}. Source: ${esc(q.sourceUrl)}</p>`,
      )
      .join("")
  );
}
