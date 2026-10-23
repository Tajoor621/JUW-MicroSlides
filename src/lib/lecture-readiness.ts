import type { Deck } from "./types";
export function lectureFindings(deck: Deck) {
  return deck.slides.flatMap((s, index) => {
    const findings: { index: number; message: string }[] = [];
    const add = (message: string) => findings.push({ index, message });
    if (s.evidenceFlags?.includes("needs-verification"))
      add(
        "Resolve the explicit Needs verification flag after inspecting the source and scientific context.",
      );
    if (s.layout === "learning-objectives" && !s.learningObjectives?.length)
      add("Add level-appropriate learning objectives.");
    if (s.layout === "lab-protocol") {
      if (!s.protocol) add("Complete the structured lab protocol fields.");
      else if (
        !s.protocol.steps.length &&
        !s.protocol.materials.length &&
        ![
          s.protocol.interpretation,
          s.protocol.qc,
          s.protocol.biosafety,
          s.protocol.troubleshooting,
        ].some((v) => v.trim())
      )
        add(
          "The lab protocol layout needs substantive structured procedure, materials or interpretation content.",
        );
      for (const step of s.protocol?.steps || [])
        if (!step.action.trim() || !step.timing.trim() || !/^https:\/\//.test(step.sourceUrl))
          add(
            "Every protocol step needs an action, source-specific timing and an HTTPS protocol source.",
          );
    }
    if (s.layout === "clinical-case" && !s.caseData)
      add("Complete the structured clinical case fields.");
    if (
      ["comparison-matrix", "differential-table"].includes(s.layout) &&
      !s.scientificTable?.rows.length
    )
      add("Complete the editable differential/comparison table.");
    if (s.layout === "growth-curve" && !s.chart?.points.length)
      add("Supply source-linked numerical chart data.");
    if (s.layout === "taxonomy-tree" && !s.taxonomy?.length)
      add(
        "Supply a source-linked taxonomy tree; familiar names are not proof of current classification.",
      );
    if (s.layout === "clinical-case" && s.caseData) {
      const c = s.caseData;
      if (c.phase === "presentation" && (!c.vignette || !c.differential || !c.workup))
        add("Complete the case vignette, differential and laboratory work-up.");
      if (
        c.phase === "resolution" &&
        (!c.results || !c.diagnosis || !c.management || !c.questions.length)
      )
        add(
          "Complete case results, diagnosis, management/infection control and teaching questions.",
        );
    }
    if (s.layout === "assessment")
      for (const q of s.assessment || []) {
        if (
          q.kind === "image" &&
          (!q.mediaId || !s.media.some((m) => m.id === q.mediaId && m.kind !== "video"))
        )
          add("Attach and identify the teaching figure used by this image question.");
        if (!q.question || !q.answer || !q.rationale)
          add("Every assessment item needs a question, instructor answer and rationale.");
        if (
          q.kind === "mcq" &&
          (q.options.length < 3 ||
            q.options.length > 6 ||
            !q.options.includes(q.answer) ||
            new Set(q.options).size !== q.options.length)
        )
          add("MCQs need 3–6 distinct options including the correct answer.");
      }
    if (
      s.scientificTable &&
      s.scientificTable.rows.some((r) => r.length !== s.scientificTable!.headers.length)
    )
      add("Scientific table rows must match the column headings.");
    if (
      s.chart &&
      (!s.chart.points.length ||
        !s.chart.xLabel ||
        !s.chart.yLabel ||
        !/^https:\/\//.test(s.chart.sourceUrl))
    )
      add("A data chart needs data, labelled axes/units and an HTTPS source.");
    if (s.taxonomy?.some((n, i) => n.parent >= i || n.parent < -1))
      add("Taxonomy parents must precede their children; cyclic trees are invalid.");
    if (deck.lectureOptions?.generationMode === "laboratory" && s.layout === "lab-protocol") {
      if (/materials/i.test(s.title) && !s.protocol?.materials.length)
        add("Supply the method's reagents and materials.");
      if (/steps/i.test(s.title) && !s.protocol?.steps.length)
        add("Supply exact source-linked protocol steps and timing.");
      if (/quality control/i.test(s.title) && !s.protocol?.qc)
        add("Supply the protocol quality-control points.");
      if (/biosafety/i.test(s.title) && !s.protocol?.biosafety)
        add(
          "Record the locally reviewed containment/PPE requirements and risk-assessment context.",
        );
    }
    return findings;
  });
}
