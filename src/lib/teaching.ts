import { teachingSchema, type Teaching } from "./teaching-schema";
export { teachingSchema, DIAGRAMS, type Teaching } from "./teaching-schema";
import type { Deck, Slide } from "./types";
import { publicationCheckIsCurrent } from "./publication-status";
export function teachingOf(s: Slide): Teaching {
  return teachingSchema.parse(s.teaching || {});
}
export function methodSlide(s: Slide) {
  return /adsor|covalent|entrap|encapsul|cross.link|diffus|process|method|protocol|stain|PCR|sequenc|ferment|culture|immobiliz/i.test(
    s.title,
  );
}
export function suggestedDiagram(title: string): Teaching["diagram"] | undefined {
  for (const [pattern, kind] of [
    [/adsorp/i, "adsorption"],
    [/covalent/i, "covalent"],
    [/entrap|encapsul/i, "entrapment"],
    [/cross.link/i, "cross-linking"],
    [/diffus|mass transfer/i, "diffusion"],
    [/biofilm/i, "biofilm"],
    [/gram|peptidoglycan|cell wall/i, "gram-wall"],
    [/fluorescen/i, "fluorescence"],
    [/enzyme|biocatalys/i, "enzyme"],
  ] as const)
    if (pattern.test(title)) return kind;
}
export function prepareTeachingDeck(deck: Deck): Deck {
  return {
    ...deck,
    slides: deck.slides.map((s, i) => {
      if (s.layout === "bibliography") return s;
      if (i === 0 && s.layout === "title" && deck.slides.length > 1) return s;
      const diagram = suggestedDiagram(s.title);
      return {
        ...s,
        teaching: teachingSchema.parse({
          ...s.teaching,
          ...(diagram && !s.teaching?.diagram
            ? {
                diagram,
                diagramLabel: s.title,
                altText: `Conceptual ${s.title.toLowerCase()} schematic; not to scale.`,
              }
            : {}),
        }),
      };
    }),
  };
}
export function citationMatchesUrl(c: import("./types").Citation, url: string) {
  try {
    const u = new URL(url),
      doi = c.doi?.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "").toLowerCase();
    return (
      c.url === url ||
      (!!doi &&
        ["doi.org", "dx.doi.org"].includes(u.hostname.toLowerCase()) &&
        decodeURIComponent(u.pathname.slice(1)).toLowerCase() === doi) ||
      (!!c.pmid &&
        u.hostname.toLowerCase() === "pubmed.ncbi.nlm.nih.gov" &&
        u.pathname.replace(/^\/|\/$/g, "") === c.pmid)
    );
  } catch {
    return false;
  }
}
export function teachingFindings(deck: Deck) {
  const issues: Array<{ index: number; message: string }> = [];
  deck.slides.forEach((s, index) => {
    if (s.citations.some((c) => !publicationCheckIsCurrent(c)))
      issues.push({
        index,
        message:
          "Verify every attached reference with a current bibliographic identity and publication-status check; repair or remove unverifiable records.",
      });
    if (index === 0 && s.layout === "title" && deck.slides.length > 1) return;
    const p = teachingOf(s),
      add = (message: string) => issues.push({ index, message });
    if (s.layout === "bibliography") {
      if (!deck.slides.some((slide) => slide.citations.length))
        add("A bibliography requires attached references.");
      return;
    }
    if (!p.diagram && !s.media.some((m) => m.kind !== "video"))
      add("Add a teaching visual or schematic; decorative branding does not count.");
    if (!s.citations.some((c) => c.evidenceKind === "primary" && publicationCheckIsCurrent(c)))
      add("Link at least one verified primary reference and classify its evidence type.");
    if (!p.altText.trim()) add("Describe the teaching figure with meaningful alt text.");
    if (!p.takeaway.trim()) add("Record the key takeaway.");
    if (!p.definition.trim()) add("Explain the core definition for this audience.");
    if (methodSlide(s) && (!p.pitfall.trim() || !p.advantage.trim() || !p.limitation.trim()))
      add("Method slides require advantages, limitations and a misconception/pitfall.");
    if (deck.level !== "Undergraduate" && !p.mechanism.trim())
      add("Graduate/medical/research slides require an explicit mechanism.");
    if (!p.quantitative.length)
      add("Add a source-linked quantitative observation with units and experimental conditions.");
    for (const q of p.quantitative) {
      if (
        !q.metric.trim() ||
        !q.value.trim() ||
        !q.units.trim() ||
        !q.conditions.trim() ||
        q.quote.length < 20 ||
        !/\d/.test(q.value) ||
        !/^https:\/\//.test(q.sourceUrl)
      )
        add(
          "Quantitative data need a numeric value, units, HTTPS source quotation and experimental conditions.",
        );
      if (q.value.trim() && !q.quote.includes(q.value.trim()))
        add(
          "The numerical value must occur in the saved-source quotation; explain derived calculations in notes.",
        );
      const source = deck.sourceDocuments?.find((d) => d.url === q.sourceUrl);
      if (!source || !source.text.replace(/\s+/g, " ").includes(q.quote.replace(/\s+/g, " ")))
        add("Quantitative quotation must occur in a saved source document.");
      if (
        !s.citations.some(
          (c) =>
            c.evidenceKind === "primary" &&
            publicationCheckIsCurrent(c) &&
            citationMatchesUrl(c, q.sourceUrl),
        )
      )
        add("Attach and verify the quantitative source citation.");
    }
    if (
      deck.level === "PhD / research seminar" &&
      (!p.equation.trim() || !p.assumptions.trim() || !p.discussion.trim())
    )
      add("Research slides require an equation/model, assumptions and critical discussion.");
    if (
      deck.level === "PhD / research seminar" &&
      /immobili|diffus|mass transfer/i.test(deck.topic + " " + s.title) &&
      (!/η|effectiveness/i.test(p.equation + " " + p.discussion) ||
        !/Thiele|φ/i.test(p.equation + " " + p.discussion))
    )
      add(
        "Address effectiveness factor/Thiele modulus where reaction–diffusion modelling applies.",
      );
    const bullets = [...s.bullets, ...s.leftBullets, ...s.rightBullets];
    if (
      bullets.length > 5 ||
      bullets.some((b) => b.length > 180) ||
      bullets.join(" ").split(/\s+/).length > 100
    )
      add("Reduce bullet density: at most five concise points and 100 bullet words.");
    if (
      /immobili.{0,35}always.{0,25}(stabil|activ)|no diffusion limitation|100% (activity|recovery).*always/i.test(
        [s.title, ...bullets, p.mechanism, p.advantage].join(" "),
      )
    )
      add("Remove the unsupported universal claim; immobilization outcomes depend on the system.");
    if (p.diagramLabel.length > 40) add("Keep the schematic heading at 40 characters or fewer.");
    const visible = [
      p.definition,
      p.mechanism,
      p.advantage,
      p.limitation,
      p.equation,
      p.assumptions,
      p.discussion,
      ...bullets,
      ...p.steps,
      ...p.quantitative.flatMap((q) => [q.metric, q.value, q.units, q.conditions]),
      ...p.comparison.flatMap((r) => [r.criterion, r.left, r.right]),
    ].join(" ");
    if (visible.trim().split(/\s+/).length > 180)
      add("Reduce slide density to 180 teaching words; move detail to speaker notes.");
    if (p.quantitative.length > 2)
      add("Show at most two quantitative observations per slide; put supporting data in notes.");
    if (s.layout === "comparison" && !p.comparison.length) add("Complete the comparison table.");
    if (s.layout === "process-flow" && !p.steps.length) add("Add numbered process steps.");
    if (p.scaleBar && (p.diagram || !s.media[0] || s.media[0].kind === "video"))
      add("Scale bars apply only to calibrated attached images, not conceptual diagrams.");
    if (p.scaleBar && !p.scaleBar.calibrationSource.trim())
      add("Scale bars require a calibration source.");
  });
  if (!deck.preparedBy.trim())
    issues.push({ index: 0, message: "Record the verifying instructor name." });
  return issues;
}
export function lectureMinutes(deck: Deck) {
  return Math.ceil(
    deck.slides.reduce(
      (t, s) =>
        t +
        0.7 +
        [...s.bullets, ...s.leftBullets, ...s.rightBullets].join(" ").split(/\s+/).length / 65 +
        (s.teaching?.diagram ? 0.5 : 0),
      0,
    ),
  );
}
/** Suggest only verbatim numeric observations, never universal benchmark values. */
export function quantitativeCandidate(deck: Deck): Teaching["quantitative"][number] | undefined {
  for (const source of deck.sourceDocuments || []) {
    for (const passage of source.text.split(/\n+/)) {
      const match = passage.match(
        /\b(\d+(?:\.\d+)?)\s*(%|nm\b|[µμu]m\b|mm\b|mg\b|mM\b|s[-−]1\b|cm2\s*s[-−]1)/,
      );
      if (match && passage.length >= 20 && passage.length <= 1000)
        return {
          metric: "Identify the measured quantity",
          value: match[1],
          units: match[2],
          conditions: "",
          sourceUrl: source.url,
          quote: passage.trim(),
        };
    }
  }
}

/** Candidate discovery must never replace an instructor's reviewed record. */
export function mergeCitationCandidates(
  existing: import("./types").Citation[],
  candidates: import("./types").Citation[],
) {
  const doi = (value: string | undefined) =>
    value
      ?.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
      .trim()
      .toLowerCase();
  const result = [...existing];
  for (const candidate of candidates)
    if (
      !result.some(
        (c) =>
          c.id === candidate.id ||
          (c.pmid && candidate.pmid && c.pmid.trim() === candidate.pmid.trim()) ||
          (doi(c.doi) && doi(c.doi) === doi(candidate.doi)) ||
          (c.url && c.url === candidate.url),
      )
    )
      result.push(candidate);
  return result;
}
export function teachingResearchContext(deck: Deck, slide: Slide) {
  return JSON.stringify([
    deck.topic,
    deck.discipline,
    deck.level,
    slide.title,
    slide.subtitle,
    slide.bullets,
    slide.leftBullets,
    slide.rightBullets,
    slide.teaching,
  ]);
}
