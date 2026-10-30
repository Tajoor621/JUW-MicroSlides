import type { Citation, Deck, Slide, Claim } from "./types";

export type Passage = {
  citation: Citation;
  quote: string;
  sourceUrl: string;
  locator: string;
  access: Claim["evidence"][number]["access"];
  checkedAt: number;
};
export const passageText = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim();
/** A substring inside a qualification/negation is not an independently supported sentence. */
export function passageContainsStatement(quote: string, statement: string) {
  const full = passageText(quote),
    text = passageText(statement);
  if (!text) return false;
  if (text === full) return true;
  let from = 0;
  while (from < full.length) {
    const at = full.indexOf(text, from);
    if (at < 0) return false;
    const before = full.slice(0, at).trimEnd();
    const after = full.slice(at + text.length);
    const abbreviation = /(?:\b(?:e\.g|i\.e|et al|Fig|Dr|Mr|Ms|Prof|sp|spp|vs)|\b[A-Z])\.$/.test(
      before,
    );
    if (
      (!before || (/[.!?]$/.test(before) && !abbreviation)) &&
      (!after || (/[.!?]$/.test(text) && /^\s/.test(after)))
    )
      return true;
    from = at + 1;
  }
  return false;
}
function urlKey(raw: string) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password) return "";
    u.hash = "";
    return u.href.replace(/\/$/, "");
  } catch {
    return "";
  }
}
/** Bibliographic IDs bind a stored passage to its reference; they do not verify its scientific meaning. */
export function sourcePassages(deck: Pick<Deck, "slides" | "sourceDocuments">): Passage[] {
  const found = new Map<string, Passage>();
  for (const s of deck.slides)
    for (const claim of s.claims || [])
      for (const e of claim.evidence) {
        const citation = s.citations.find((c) => c.id === e.citationId);
        if (!citation || !passageText(claim.text) || !passageContainsStatement(e.quote, claim.text))
          continue;
        const source = urlKey(e.sourceUrl);
        const links = [
          citation.url,
          citation.doi ? `https://doi.org/${citation.doi}` : "",
          citation.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${citation.pmid}/` : "",
        ]
          .filter((u): u is string => !!u)
          .map(urlKey);
        if (!source || !links.includes(source)) continue;
        const document = deck.sourceDocuments?.find((d) => urlKey(d.url) === source);
        if (document && !passageText(document.text).includes(passageText(e.quote))) continue;
        found.set(`${citation.id}\n${e.quote}`, {
          citation,
          quote: e.quote,
          sourceUrl: e.sourceUrl,
          locator: e.locator,
          access: e.access,
          checkedAt: e.checkedAt,
        });
      }
  return [...found.values()];
}
export type ScientificField = {
  field: string;
  text: string;
  kind: "text" | "label" | "pedagogy" | "visual";
  parts?: string[];
};
/** Enumerate every visible scientific leaf, including structured/numeric content. No slide-ID exemption. */
export function scientificFields(s: Slide): ScientificField[] {
  const result: ScientificField[] = [];
  const add = (field: string, value: unknown, kind: ScientificField["kind"] = "text") => {
    if (typeof value === "string" && value.trim()) result.push({ field, text: value, kind });
  };
  add("title", s.title, "label");
  add("subtitle", s.subtitle, "label");
  add("notes", s.notes);
  for (const name of ["bullets", "leftBullets", "rightBullets", "commonMisconceptions"] as const)
    (s[name] || []).forEach((v, i) =>
      add(`${name}.${i}`, v, s.layout === "learning-objectives" ? "pedagogy" : "text"),
    );
  for (const name of ["clinicalPearl", "keyTakeaway"] as const) add(name, s[name]);
  (s.learningObjectives || []).forEach((v, i) => add(`learningObjectives.${i}`, v, "pedagogy"));
  for (const [key, value] of Object.entries(s.teaching || {})) {
    if (key === "diagram") {
      add("teaching.diagram", value, "visual");
      continue;
    }
    if (typeof value === "string") add(`teaching.${key}`, value);
  }
  for (const name of ["steps", "labels"] as const)
    (s.teaching?.[name] || []).forEach((v, i) =>
      add(`teaching.${name}.${i}`, typeof v === "string" ? v : v.text),
    );
  (s.teaching?.quantitative || []).forEach((q, i) =>
    result.push({
      field: `teaching.quantitative.${i}`,
      text: `${q.metric}: ${q.value} ${q.units}; ${q.conditions}`,
      kind: "text",
      parts: [q.metric, `${q.value} ${q.units}`.trim(), q.conditions].filter(Boolean),
    }),
  );
  (s.teaching?.comparison || []).forEach((r, i) =>
    add(`teaching.comparison.${i}`, `${r.criterion}: ${r.left} / ${r.right}`),
  );
  if (s.teaching?.scaleBar) {
    const b = s.teaching.scaleBar;
    add(
      "teaching.scaleBar",
      `${b.pixels} original pixels = ${b.physicalLength} ${b.unit}; ${b.calibrationSource}`,
    );
  }
  if (s.protocol) {
    for (const key of ["interpretation", "qc", "biosafety", "troubleshooting"] as const)
      add(`protocol.${key}`, s.protocol[key]);
    s.protocol.materials.forEach((v, i) => add(`protocol.materials.${i}`, v));
    s.protocol.steps.forEach((step, i) =>
      result.push({
        field: `protocol.steps.${i}`,
        text: `${step.action}${step.timing ? ` · ${step.timing}` : ""}`,
        kind: "text",
        parts: [step.action, step.timing].filter(Boolean),
      }),
    );
  }
  if (s.caseData) {
    for (const key of [
      "vignette",
      "differential",
      "workup",
      "results",
      "diagnosis",
      "management",
    ] as const)
      add(`caseData.${key}`, s.caseData[key]);
    s.caseData.questions.forEach((v, i) => add(`caseData.questions.${i}`, v, "pedagogy"));
  }
  (s.assessment || []).forEach((q, i) => {
    add(`assessment.${i}.question`, q.question, "pedagogy");
    q.options.forEach((v, j) => add(`assessment.${i}.options.${j}`, v, "pedagogy"));
    add(`assessment.${i}.answer`, q.answer);
    add(`assessment.${i}.rationale`, q.rationale);
  });
  if (s.scientificTable) {
    const t = s.scientificTable;
    add("scientificTable.caption", t.caption, "label");
    t.headers.forEach((v, i) => add(`scientificTable.headers.${i}`, v, "label"));
    t.rows.forEach((row, i) =>
      add(`scientificTable.rows.${i}`, row.map((v, j) => `${t.headers[j]}: ${v}`).join("; ")),
    );
  }
  if (s.chart) {
    const c = s.chart;
    for (const k of ["title", "xLabel", "yLabel"] as const) add(`chart.${k}`, c[k], "label");
    c.points.forEach((p, i) =>
      add(`chart.points.${i}`, `${c.xLabel}: ${p.x}; ${c.yLabel}: ${p.y}`),
    );
  }
  (s.taxonomy || []).forEach((n, i) =>
    add(
      `taxonomy.${i}`,
      `${n.label}; parent: ${n.parent < 0 ? "root" : s.taxonomy?.[n.parent]?.label || "missing"}`,
    ),
  );
  s.media.forEach((m, i) => add(`media.${i}`, `${m.title} · ${m.source}`, "visual"));
  return result;
}
export function passageFor(field: ScientificField, bank: Passage[]) {
  if (field.kind === "label")
    return bank.find((p) => passageText(p.quote).includes(passageText(field.text)));
  if (field.parts && field.field.startsWith("protocol.steps.")) {
    const [action, ...details] = field.parts;
    return bank.find(
      (p) =>
        passageContainsStatement(p.quote, action) &&
        details.every((v) => passageText(action).includes(passageText(v))),
    );
  }
  return bank.find((p) => passageContainsStatement(p.quote, field.text));
}
export function slideGrounding(deck: Deck, slide: Slide) {
  const bank = sourcePassages({ slides: [slide], sourceDocuments: deck.sourceDocuments });
  return scientificFields(slide).map((f) => {
    const passage = passageFor(f, bank);
    return {
      ...f,
      status:
        f.kind === "visual"
          ? "visual-unverified"
          : passage
            ? "exact-passage"
            : f.kind === "label"
              ? "label"
              : f.kind === "pedagogy"
                ? "pedagogical"
                : slide.citations.length
                  ? "reference-only"
                  : "source-needed",
      sourceUrl: passage?.sourceUrl,
      locator: passage?.locator,
    };
  });
}
export function generationGroundingSummary(deck: Deck) {
  const fields = deck.slides.flatMap((s) => slideGrounding(deck, s));
  return {
    checked: fields.length,
    exact: fields.filter((f) => f.status === "exact-passage").length,
    unmatched: fields.filter((f) => f.status === "reference-only" || f.status === "source-needed")
      .length,
    visuals: fields.filter((f) => f.status === "visual-unverified").length,
  };
}
