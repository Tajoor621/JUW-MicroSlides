import { lookupTaxonomy } from "./taxonomy-source";
import { populateLabelledFields, groundedModelFields } from "./lecture-extraction";
import type { Deck, GenerateInput, Slide, Layout } from "./types";
import { uid } from "./utils";
import { generateLocalDeck, introSlide } from "./generate-deck";
import { enrichTopicEvidence } from "./topic-evidence";
import { prepareTeachingDeck } from "./teaching";
import { reconcileDeck } from "./deck-integrity";
import { assertCompleteDeck } from "./deck-completion";
import { MODE_NAMES } from "./lecture-schema";
type Section = {
  detailIndex?: number;
  title: string;
  kind: NonNullable<Slide["sectionType"]>;
  query: string;
  layout: Layout;
  misconception: string;
};
export function sectionNotes(notes: string, title: string) {
  const target = title.replace(/ — evidence.*$/, "").toLowerCase();
  const sections = notes.split(/^#{1,3}\s+/m).slice(1);
  const match = sections.find((s) => {
    const heading = s.split("\n")[0].trim().toLowerCase();
    return heading === target;
  });
  return match ? match.split("\n").slice(1).join("\n").trim() : "";
}
export async function generateCourseModule(
  input: GenerateInput,
  signal?: AbortSignal,
  progress?: (s: string) => void,
  writer?: (i: GenerateInput) => Promise<Deck>,
): Promise<Deck[]> {
  const topics = (input.moduleTopics || []).map((s) => s.trim()).filter(Boolean);
  if (
    topics.length < 2 ||
    topics.length > 12 ||
    new Set(topics.map((t) => t.toLowerCase())).size !== topics.length
  )
    throw Error("Enter 2–12 distinct curriculum lecture topics, one per line.");
  const courseId = uid("course"),
    decks: Deck[] = [];
  for (const [i, topic] of topics.entries()) {
    signal?.throwIfAborted();
    progress?.(`Lecture ${i + 1}/${topics.length}: ${topic}`);
    const lectureInput = { ...input, topic, generationMode: "standard" as const };
    const reserve =
      input.count > 2
        ? (input.includeObjectives === false ? 0 : 1) + (input.includeAssessment ? 2 : 0)
        : 0;
    const sourceInput = { ...lectureInput, count: input.count - reserve };
    let deck = writer ? await writer(sourceInput) : generateLocalDeck(sourceInput);
    if (
      input.includeAssessment &&
      deck.slides.filter((s) => s.claims?.some((c) => c.evidence.length)).length < 3
    )
      deck = { ...deck, slides: deck.slides[0]?.layout === "title" ? [deck.slides[0]] : [] };
    if (
      deck.slides.length < sourceInput.count ||
      deck.slides.some((s) => s.title === "Evidence required")
    )
      deck = await enrichTopicEvidence(deck, sourceInput, signal, progress);
    deck = applyStandardPedagogy(deck, lectureInput);
    deck.courseSeries = {
      id: courseId,
      title: input.topic,
      order: i + 1,
      prerequisites: decks.length ? [decks.at(-1)!.id] : [],
    };
    deck = assertCompleteDeck(deck, input.count);
    decks.push(deck);
  }
  return decks;
}
export const PATHOGEN_SECTIONS: Section[] = [
  {
    title: "Taxonomy & nomenclature",
    kind: "taxonomy",
    query: "taxonomy nomenclature genome classification",
    layout: "taxonomy-tree",
    misconception:
      "A familiar species name does not establish current genome-based classification.",
  },
  {
    title: "Morphology & staining",
    kind: "morphology",
    query: "morphology microscopy staining",
    layout: "pathogen-card",
    misconception: "A staining phenotype alone does not establish species identity.",
  },
  {
    title: "Culture & growth requirements",
    kind: "culture",
    query: "culture growth medium atmosphere colony",
    layout: "pathogen-card",
    misconception:
      "Failure to grow under one set of culture conditions does not exclude infection.",
  },
  {
    title: "Virulence factors & mechanisms",
    kind: "virulence",
    query: "virulence mechanism factors",
    layout: "pathogen-card",
    misconception:
      "Detection of a virulence-associated gene is not equivalent to demonstrated expression or disease.",
  },
  {
    title: "Pathogenesis & clinical syndromes",
    kind: "pathogenesis",
    query: "pathogenesis clinical syndromes",
    layout: "process-flow",
    misconception: "Colonization and infection require different clinical interpretations.",
  },
  {
    title: "Laboratory diagnosis",
    kind: "diagnosis",
    query: "diagnosis molecular serology culture sensitivity specificity",
    layout: "differential-table",
    misconception:
      "A laboratory result must be interpreted with the specimen, timing and clinical context.",
  },
  {
    title: "Susceptibility & resistance",
    kind: "treatment",
    query: "antimicrobial susceptibility resistance mechanisms",
    layout: "comparison-matrix",
    misconception: "A resistance gene, an MIC and a clinical response are different measurements.",
  },
  {
    title: "Epidemiology, transmission & prevention",
    kind: "epidemiology",
    query: "epidemiology transmission prevention vaccine infection control",
    layout: "process-flow",
    misconception: "Prevention recommendations depend on setting, population and current guidance.",
  },
];
export const LAB_SECTIONS: Section[] = [
  {
    title: "Reagents & materials",
    kind: "protocol",
    query: "reagents materials preparation",
    layout: "lab-protocol",
    misconception: "Reagent formulation and storage conditions can alter assay performance.",
  },
  {
    title: "Protocol steps & timing",
    kind: "protocol",
    query: "protocol method steps incubation timing",
    layout: "lab-protocol",
    misconception: "A timing value from another method variant is not an interchangeable protocol.",
  },
  {
    title: "Expected results & interpretation",
    kind: "diagnosis",
    query: "results interpretation positive negative",
    layout: "differential-table",
    misconception: "A positive signal does not by itself establish diagnostic specificity.",
  },
  {
    title: "Quality control",
    kind: "protocol",
    query: "quality control positive negative controls",
    layout: "lab-protocol",
    misconception: "An acceptable control does not eliminate every pre-analytical error.",
  },
  {
    title: "Biosafety & PPE",
    kind: "protocol",
    query: "biosafety risk assessment personal protective equipment",
    layout: "lab-protocol",
    misconception: "Containment and PPE require an activity-specific local risk assessment.",
  },
  {
    title: "Common errors & troubleshooting",
    kind: "protocol",
    query: "limitations errors troubleshooting",
    layout: "lab-protocol",
    misconception:
      "Repeating a failed procedure without identifying the cause can reproduce the error.",
  },
];
export function modeMinimum(
  input: Pick<
    GenerateInput,
    "generationMode" | "includeObjectives" | "includeAssessment" | "clinicalCases"
  >,
) {
  const extras = (input.includeObjectives === false ? 0 : 1) + (input.includeAssessment ? 2 : 0);
  return input.generationMode === "pathogen"
    ? 11 + extras
    : input.generationMode === "laboratory"
      ? 9 + extras
      : input.generationMode === "clinical-cases"
        ? 3 + 2 * (input.clinicalCases || 3) + extras
        : input.generationMode === "curriculum"
          ? (input.includeAssessment ? 4 : 2) + extras
          : (input.includeAssessment ? 4 : 1) + extras;
}
export function blankLectureSlide(title: string, layout: Layout = "content"): Slide {
  return {
    id: uid("s"),
    title,
    layout,
    theme: "molecular",
    subtitle: "",
    bullets: [],
    leftBullets: [],
    rightBullets: [],
    notes: "",
    citations: [],
    media: [],
    difficulty: "core",
    evidenceFlags: ["needs-verification"],
  };
}
export function objectivesFor(input: GenerateInput) {
  const verbs =
    input.level === "Undergraduate"
      ? ["Describe", "Compare", "Interpret"]
      : input.level === "Medical school"
        ? ["Differentiate", "Interpret", "Justify"]
        : ["Analyze", "Evaluate", "Design"];
  return [
    `${verbs[0]} the defining features and mechanisms of ${input.topic}.`,
    `${verbs[1]} the evidence, limitations and alternative explanations relevant to ${input.topic}.`,
    `${verbs[2]} an appropriate investigation or application using the supplied evidence.`,
  ];
}
export function assessmentSlides(deck: Deck): Slide[] {
  const sources = deck.slides.filter(
    (s) => s.claims?.some((c) => c.evidence.length) && s.bullets.length,
  );
  if (sources.length < 3)
    throw Error(
      "Assessment generation needs three distinct source-backed teaching slides. Add evidence or turn assessment off.",
    );
  const items = sources.slice(0, 3).map((s, i) => {
    const claim = s.claims!.find((c) => c.evidence.length)!;
    const other = sources
      .filter((x) => x.id !== s.id)
      .slice(0, 3)
      .map((x) => x.title);
    return {
      kind: "mcq" as const,
      question: `Which teaching section is directly supported by this source passage? “${claim.text}”`,
      options: [...other.slice(0, i % 3), s.title, ...other.slice(i % 3)],
      answer: s.title,
      rationale: claim.evidence[0].quote,
      sourceUrl: claim.evidence[0].sourceUrl,
    };
  });
  const mcq: Slide = {
    ...blankLectureSlide("Evidence interpretation questions", "assessment"),
    sectionType: "assessment" as const,
    assessment: items,
    bullets: [],
    notes:
      "Instructor answers are stored in the question records and included in speaker-note exports.",
    citations: sources.flatMap((s) => s.citations),
  };
  const short: Slide = {
    ...blankLectureSlide("Short-answer & image discussion", "assessment"),
    sectionType: "assessment" as const,
    assessment: [
      {
        kind: "short-answer" as const,
        question: `Which observation most changes your interpretation of ${deck.topic}, and why?`,
        options: [],
        answer: "Instructor discussion; justify using a cited passage.",
        rationale: "Evaluate reasoning against the reviewed lecture sources.",
      },
      {
        kind: "short-answer" as const,
        question: "What alternative explanation or method limitation must be excluded?",
        options: [],
        answer: "Instructor discussion; identify a source-supported limitation.",
        rationale: "Distinguish observation from inference.",
      },
    ],
    bullets: [],
    citations: sources[0].citations,
  };
  const image = deck.slides.flatMap((s) => s.media).find((m) => m.kind !== "video");
  if (image) {
    short.media = [image];
    short.assessment!.push({
      kind: "image",
      mediaId: image.id,
      question:
        "Describe the attached image before proposing an interpretation. What cannot be inferred from it alone?",
      options: [],
      answer: "Instructor must verify the figure-specific answer and legend.",
      rationale: "Separate visible features from diagnostic inference.",
    });
  }
  return [mcq, short];
}
export function applyStandardPedagogy(deck: Deck, input: GenerateInput): Deck {
  const made = structuredClone(deck);
  const visualTheme = {
    morphology: "gram",
    molecular: "molecular",
    clinical: "clinical",
    epidemiology: "outbreak",
  } as const;
  if (input.visualEmphasis)
    made.slides = made.slides.map((s) => ({
      ...s,
      theme: s.layout === "title" ? "classic" : visualTheme[input.visualEmphasis!],
    }));
  made.lectureOptions = {
    generationMode: input.generationMode || "standard",
    includeObjectives: input.includeObjectives !== false,
    includeAssessment: !!input.includeAssessment,
    focusDepth: input.focusDepth || "standard",
    visualEmphasis: input.visualEmphasis || "morphology",
    clinicalCases: input.clinicalCases || 3,
    moduleTopics: input.moduleTopics?.map((s) => s.trim()).filter(Boolean),
  };
  if (input.count <= 2 && input.generationMode === "standard") {
    if (input.includeObjectives !== false)
      made.slides[made.slides.length - 1].learningObjectives = objectivesFor(input).slice(0, 1);
    return prepareTeachingDeck(made);
  }
  if (input.includeObjectives !== false) {
    const objectives = objectivesFor(input);
    made.slides.splice(1, 0, {
      ...blankLectureSlide("Learning objectives", "learning-objectives"),
      learningObjectives: objectives,
      bullets: objectives,
    });
  }
  if (input.includeAssessment) made.slides.push(...assessmentSlides(made));
  made.requestedCount = input.count;
  if (["pathogen", "laboratory"].includes(input.generationMode || ""))
    made.slides = made.slides.map((s) =>
      /Common misconceptions/i.test(s.notes)
        ? s
        : {
            ...s,
            notes: `${s.notes}\n\nCommon misconceptions\n${s.commonMisconceptions?.map((x) => `- ${x}`).join("\n") || ""}`,
          },
    );
  return prepareTeachingDeck(reconcileDeck(made));
}
export async function generateModeDeck(
  input: GenerateInput,
  signal?: AbortSignal,
  progress?: (s: string) => void,
  writer?: (i: GenerateInput) => Promise<Deck>,
): Promise<Deck> {
  const minimum = modeMinimum(input);
  if (input.count < minimum)
    throw Error(
      `${MODE_NAMES[input.generationMode || "standard"]} needs at least ${minimum} slides with these options. Increase the slide count or disable optional assessments.`,
    );
  let sections: Section[] =
    input.generationMode === "pathogen"
      ? PATHOGEN_SECTIONS
      : input.generationMode === "laboratory"
        ? LAB_SECTIONS
        : input.generationMode === "clinical-cases"
          ? Array.from({ length: input.clinicalCases || 3 }, (_, i) => [
              {
                title: `Case ${i + 1}: presentation & work-up`,
                kind: "case" as const,
                query: `clinical case report presentation differential diagnosis laboratory investigation ${i + 1}`,
                layout: "clinical-case" as const,
                misconception: "A teaching vignette cannot replace a complete patient assessment.",
              },
              {
                title: `Case ${i + 1}: resolution & management`,
                kind: "case" as const,
                query: `clinical case diagnosis management infection control outcome ${i + 1}`,
                layout: "clinical-case" as const,
                misconception:
                  "A management decision in a case report is not automatically a current guideline recommendation.",
              },
            ]).flat()
          : [
              {
                title: "Course overview & prerequisites",
                kind: "other",
                query: "fundamentals concepts overview",
                layout: "learning-objectives",
                misconception:
                  "Prerequisites describe learning preparation, not a guarantee of mastery.",
              },
            ];
  const assessmentCount = input.includeAssessment ? 2 : 0,
    objectivesCount = input.includeObjectives === false ? 0 : 1;
  const contentSlots = input.count - 1 - objectivesCount - assessmentCount - 2;
  const sectionCount = sections.length;
  sections = sections.flatMap((section, i) =>
    Array.from(
      {
        length: Math.floor(contentSlots / sectionCount) + (i < contentSlots % sectionCount ? 1 : 0),
      },
      (_, detailIndex) => ({
        ...section,
        detailIndex,
        title: section.title + (detailIndex ? ` — evidence ${detailIndex + 1}` : ""),
      }),
    ),
  );
  const base = generateLocalDeck({ ...input, count: 2 });
  const made: Deck = {
    ...base,
    slides: [introSlide(input.topic, input.notes, input.discipline)],
    sourceDocuments: [],
    contentWarnings: [
      "Structured source excerpts are drafts. Check taxonomy, protocol variants, patient context and guideline applicability before teaching.",
    ],
  };
  const result: Slide[] = Array(sections.length);
  let cursor = 0;

  async function work() {
    while (cursor < sections.length) {
      const index = cursor++,
        section = sections[index];
      signal?.throwIfAborted();
      progress?.(`Building ${section.title} (${index + 1}/${sections.length})…`);
      const queryInput = {
        ...input,
        generationMode: "standard" as const,
        includeObjectives: false,
        includeAssessment: false,
        topic: `${input.topic} ${section.query}`,
        count: 3 + (section.detailIndex || 0),
      };
      let research: Deck = {
        ...base,
        topic: input.topic,
        slides: [introSlide(input.topic)],
        sourceDocuments: base.sourceDocuments,
      };
      const noteContent = sectionNotes(input.notes, section.title);
      if (noteContent)
        research = {
          ...research,
          slides: [
            research.slides[0],
            {
              ...blankLectureSlide(section.title),
              bullets: noteContent
                .split(/\n+/)
                .filter(Boolean)
                .slice((section.detailIndex || 0) * 3, (section.detailIndex || 0) * 3 + 3)
                .map((s) => s.replace(/^[-*]\s*/, "")),
              notes:
                "Instructor-supplied section notes; scientific evidence has not been verified.",
            },
          ],
        };
      else {
        research = await enrichTopicEvidence(research, queryInput, signal);
      }
      const candidates = research.slides.filter(
        (s) => s.layout !== "title" && s.title !== "Evidence required",
      );
      const content = noteContent ? candidates[0] : candidates[section.detailIndex || 0];
      if (
        !content ||
        !content.bullets.length ||
        (!noteContent && !content.claims?.some((c) => c.evidence.length))
      )
        throw Error(
          `No source-backed content was found for ${section.title}. Save a relevant source in Review or add lecture notes and retry; your current deck is preserved.`,
        );
      const s: Slide = {
        ...content,
        id: uid("mode"),
        title: section.title,
        layout: section.layout,
        sectionType: section.kind,
        difficulty:
          input.focusDepth === "exhaustive"
            ? "advanced"
            : input.focusDepth === "overview"
              ? "core"
              : "intermediate",
        evidenceFlags: ["needs-verification"],
        commonMisconceptions: [section.misconception],
        notes: `${content.notes}\n\nCommon misconceptions\n- ${section.misconception}\n\nSource scope: these excerpts retain study-specific limitations; confirm suitability for this section.`,
      };
      if (input.generationMode === "laboratory")
        s.protocol = {
          materials: section.title.includes("materials") ? s.bullets : [],
          steps: section.title.includes("steps")
            ? s.bullets.map((action) => ({
                action,
                timing:
                  action.match(
                    /\b\d+(?:[.−–-]\d+)?\s*(?:seconds?|minutes?|hours?|s|min|h)\b/i,
                  )?.[0] || "",
                sourceUrl: content.claims?.[0]?.evidence[0]?.sourceUrl || "",
              }))
            : [],
          interpretation: /interpretation/i.test(section.title) ? s.bullets.join(" ") : "",
          qc: section.title.includes("control") ? s.bullets.join(" ") : "",
          biosafety: section.title.includes("Biosafety") ? s.bullets.join(" ") : "",
          troubleshooting: section.title.includes("errors") ? s.bullets.join(" ") : "",
        };
      if (section.kind === "case") {
        const caseNumber = Number(section.title.match(/Case (\d+)/)?.[1] || 1);
        s.caseData = {
          caseNumber,
          vignette: !section.title.includes("resolution") ? s.bullets.join(" ") : "",
          differential: "",
          workup: "",
          results: "",
          diagnosis: "",
          management: "",
          questions: ["Which source-supported findings discriminate between the alternatives?"],
          phase: !section.title.includes("resolution") ? "presentation" : "resolution",
        };
        s.notes += noteContent
          ? "\nInstructor-supplied teaching case; source verification required."
          : "\nCase excerpts retain their published source context. Complete the structured case fields from the cited source.";
      }
      let populated = populateLabelledFields(s, noteContent || s.bullets.join("\n"));
      if (section.kind === "taxonomy" && !populated.taxonomy?.length && !noteContent) {
        const taxon = await lookupTaxonomy(input.topic, signal);
        if (taxon) {
          populated.taxonomy = taxon.nodes;
          populated.notes += `\nTaxonomy source: ${taxon.source.url}; retrieved ${new Date(taxon.source.retrievedAt).toISOString()}. Nomenclatural and genome-based status still requires review.`;
          research.sourceDocuments = [...(research.sourceDocuments || []), taxon.source];
        }
      }

      if (writer) {
        const sourceText = [
          ...s.bullets,
          ...(s.claims || []).flatMap((c) => c.evidence.flatMap((e) => [e.quote, e.sourceUrl])),
          noteContent,
        ].join("\n");
        const drafted = await writer({
          ...input,
          count: 1,
          topic: input.topic,
          notes: `Organize only the supplied source wording into the ${section.title} section. Copy scientific strings verbatim. Leave missing timings, findings and management fields empty. Return structured protocol or caseData fields as appropriate. Do not add identifiers or scientific facts.\nSource text:\n${sourceText}`,
        });
        if (drafted.slides[0])
          populated = groundedModelFields(populated, drafted.slides[0], sourceText);
      }
      result[index] = populated;
      if (research.lastLiteratureCheck)
        made.lastLiteratureCheck = Math.max(
          made.lastLiteratureCheck || 0,
          research.lastLiteratureCheck,
        );
      made.sourceDocuments = [
        ...new Map(
          [...(made.sourceDocuments || []), ...(research.sourceDocuments || [])].map((d) => [
            d.id,
            d,
          ]),
        ).values(),
      ];
      if (made.sourceDocuments.length > 200)
        throw Error(
          "This module exceeds the 200-source project limit. Reduce scope or split the lecture.",
        );
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, sections.length) }, work));
  made.slides.push(...result);
  const takeaways = result.slice(0, 3).map((s) => s.bullets[0]);
  made.slides.push({
    ...blankLectureSlide("Key takeaways & clinical pearls", "key-takeaway"),
    bullets: [],
    keyTakeaway: takeaways[0],
    citations: result.slice(0, 3).flatMap((s) => s.citations),
    claims: result.slice(0, 3).flatMap((s) => s.claims || []),
  });
  made.slides.push({
    ...blankLectureSlide("References & evidence", "bibliography"),
    bullets: ["Full source list; confirm every record and claim before teaching."],
  });

  return applyStandardPedagogy(made, input);
}
