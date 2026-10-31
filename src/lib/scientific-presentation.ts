import { passageContainsStatement } from "./generation-grounding.ts";
import type { Deck, Slide } from "./types";
/** A conservative disclosure, never evidence that a clinical value is current. */
export function guidelineNamedAndDated(slide: Slide, statement?: string) {
  return slide.citations.some(
    (c) =>
      /^\d{4}$/.test(c.year) &&
      /\b(?:CLSI|EUCAST|IDSA|CDC|WHO|guideline|guidance)\b/i.test(
        `${c.title} ${c.authors} ${c.publisher || ""}`,
      ) &&
      slide.claims?.some(
        (claim) =>
          claim.classification === "guideline" &&
          claim.evidence.some(
            (e) =>
              e.citationId === c.id &&
              [c.url, c.doi ? `https://doi.org/${c.doi}` : ""].includes(e.sourceUrl) &&
              e.access === "guideline" &&
              (!statement || passageContainsStatement(e.quote, statement)),
          ),
      ),
  );
}
export function needsGuideline(text: string) {
  const treatment = /\b(?:treat(?:ment|ed|ing)?|dos(?:e|age|ing)|therap(?:y|eutic))\b/i.test(text);
  // A subject label such as phage therapy is not itself a prescribing statement.
  const clinicalClaim =
    /\d|\b(?:recommend(?:ed|ation)?|prescrib\w*|administer\w*|effective|efficacy|patients?|regimen|contraindicat\w*)\b/i.test(
      text,
    );
  return (
    /\bfirst.line\b/i.test(text) ||
    (treatment && clinicalClaim) ||
    (/\d/.test(text) && /\b(?:MIC|breakpoint|incubat\w*)\b/i.test(text))
  );
}
export function sourcePresentation(slide: Slide, now = Date.now()) {
  if (!slide.citations.length) return "Source needed · retrieval date not recorded";
  return slide.citations
    .map((c) => {
      const evidence =
        slide.claims?.flatMap((claim) => claim.evidence).filter((e) => e.citationId === c.id) || [];
      const type = evidence.some((e) => e.access === "guideline")
        ? "Guideline"
        : c.evidenceKind === "textbook" || ["book", "chapter"].includes(c.type || "")
          ? "Textbook"
          : c.evidenceKind === "review"
            ? "Review"
            : c.evidenceKind === "primary"
              ? "Primary study"
              : "Source type unclassified";
      const year = /^\d{4}$/.test(c.year) ? c.year : "year not recorded";
      const historical =
        /^\d{4}$/.test(c.year) && new Date(now).getUTCFullYear() - Number(c.year) > 10;
      const at = Math.max(0, ...evidence.map((e) => e.checkedAt || 0));
      const date = at ? new Date(at).toISOString().slice(0, 10) : c.accessed || "not recorded";
      return `${type} · ${year}${historical ? " · historical" : ""} · retrieved ${date}`;
    })
    .filter((s, i, all) => all.indexOf(s) === i)
    .join(" / ");
}
/** Copy-only sanitation; never silently alter saved source records or add an export gate. */
export function defensibleExport(deck: Deck): Deck {
  return {
    ...deck,
    slides: deck.slides.map((slide) => {
      const omission = "Statement omitted: a named, dated guideline is required.";
      const proseKeys = new Set([
        "title",
        "subtitle",
        "bullets",
        "leftBullets",
        "rightBullets",
        "notes",
        "teaching",
        "protocol",
        "caseData",
        "scientificTable",
        "clinicalPearl",
        "keyTakeaway",
        "commonMisconceptions",
        "assessment",
      ]);
      function walk(value: unknown): unknown {
        if (typeof value === "string")
          return needsGuideline(value) && !guidelineNamedAndDated(slide, value) ? omission : value;
        if (Array.isArray(value)) return value.map(walk);
        if (value && typeof value === "object")
          return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]));
        return value;
      }
      const copy = { ...slide };
      if (copy.protocol)
        copy.protocol = {
          ...copy.protocol,
          steps: copy.protocol.steps.map((step) =>
            /incubat/i.test(step.action) &&
            /\d/.test(step.timing) &&
            !guidelineNamedAndDated(slide, `${step.action} ${step.timing}`)
              ? { ...step, timing: omission }
              : step,
          ),
        };
      if (
        copy.scientificTable &&
        /MIC|breakpoint/i.test(copy.scientificTable.headers.join(" ")) &&
        /\d/.test(JSON.stringify(copy.scientificTable.rows)) &&
        !guidelineNamedAndDated(slide, JSON.stringify(copy.scientificTable.rows))
      )
        copy.scientificTable = { ...copy.scientificTable, rows: [], caption: omission };
      if (
        copy.chart &&
        /MIC|breakpoint/i.test(copy.chart.title) &&
        !guidelineNamedAndDated(slide, JSON.stringify(copy.chart.points))
      )
        copy.chart = { ...copy.chart, points: [], title: omission };
      return Object.fromEntries(
        Object.entries(copy).map(([k, v]) => [k, proseKeys.has(k) ? walk(v) : v]),
      ) as unknown as Slide;
    }),
  };
}
