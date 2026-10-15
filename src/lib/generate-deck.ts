import { JUW, lectureMeta } from "./brand";
import { seedCitations } from "./citations";
import { DISCIPLINES, getDiscipline, suggestDiscipline, type KnowledgeModule } from "./knowledge";
import { attachUniqueMedia } from "./media-catalog";
import { cycleTheme } from "./slide-themes";
import { inferFocus, topicCoreSlides } from "./topic-engine";
import { MAX_SLIDES, type Deck, type GenerateInput, type Slide } from "./types";
import { uid } from "./utils";

function emptySlide(partial: Partial<Slide> & Pick<Slide, "layout" | "title">): Slide {
  return {
    id: uid("s"),
    subtitle: "",
    bullets: [],
    leftBullets: [],
    rightBullets: [],
    notes: "",
    citations: [],
    media: [],
    theme: partial.layout === "title" ? "classic" : "gram",
    ...partial,
  };
}

function pickModules(disciplineName: string, topic: string, needed: number): KnowledgeModule[] {
  const disc = getDiscipline(disciplineName) ?? DISCIPLINES[0];
  const topicTerms = topic
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
  const score = (m: KnowledgeModule, fromSelected: boolean) => {
    const hay = `${m.title} ${m.keywords.join(" ")} ${m.bullets.join(" ")} ${m.notes}`.toLowerCase();
    let n = 0;
    for (const t of topicTerms) {
      if (hay.includes(t)) n += 3;
      if (m.title.toLowerCase().includes(t)) n += 4;
      if (m.keywords.some((k) => k.toLowerCase().includes(t) || t.includes(k.toLowerCase()))) n += 2;
    }
    if (fromSelected && n > 0) n += 2;
    return n;
  };
  const scored = [
    ...disc.modules.map((m) => ({ m, s: score(m, true) })),
    ...DISCIPLINES.filter((d) => d.name !== disc.name).flatMap((d) => d.modules.map((m) => ({ m, s: score(m, false) }))),
  ].sort((a, b) => b.s - a.s);

  // Only topic-relevant modules. Unrelated industrial/enzyme filler must never pad a deck.
  const relevant = scored.filter((x) => x.s >= 6);
  const taken = new Set<string>();
  const out: KnowledgeModule[] = [];
  for (const { m } of relevant) {
    const key = m.title.toLowerCase();
    if (taken.has(key)) continue;
    taken.add(key);
    out.push(m);
    if (out.length >= needed) return out;
  }
  return out;
}

function customise(text: string, topic: string): string {
  const t = topic.trim();
  if (!t) return text;
  return text.replace(/\b(this topic|the topic)\b/gi, t);
}

function weaveTitle(modTitle: string, topic: string): string {
  const t = topic.trim();
  if (!t) return modTitle;
  const hay = modTitle.toLowerCase();
  const terms = t.toLowerCase().split(/[^a-z0-9]+/).filter((x) => x.length > 2);
  if (terms.some((term) => hay.includes(term))) return modTitle;
  return `${modTitle} — ${t}`;
}

function uniqueBeats(topic: string, notes?: string): Slide[] {
  const t = topic.trim() || "this topic";
  const brief = notes ? `Instructor brief: ${notes.slice(0, 160)}` : `Ask one student to restate ${t} in a single sentence.`;
  const rows: Array<Partial<Slide> & Pick<Slide, "layout" | "title">> = [
    {
      layout: "content",
      title: `What ${t} actually is`,
      bullets: [
        `Give a one-sentence operational definition of ${t} that a first-year could mark.`,
        "Name the scale (molecule, cell, population, process) this lecture lives on.",
        "State what it is not — the nearest confusion students bring into the room.",
        "Write the noun you want on the exam script and nowhere else.",
      ],
      notes: `Open with the definition, not the history of ${t}.`,
    },
    {
      layout: "content",
      title: `Why ${t} was hard to see`,
      bullets: [
        "Which method first made the phenomenon visible (stain, culture, assay, sequence, sensor)?",
        "What did a negative result mean in that first method?",
        "Which modern method replaced it for treatment or process decisions?",
        "Flag one artefact that still fools student practicals.",
      ],
      notes: "Method first, organism second.",
    },
    {
      layout: "two-column",
      title: `${t}: compare and contrast`,
      leftBullets: ["What a novice confuses this with", "Shared jargon or surface features", "Where the textbooks overlap"],
      rightBullets: ["The discriminating test or structure", "The cost of getting it wrong", "The one sentence that should stay on the exam"],
      notes: "Fill one misconception live.",
    },
    {
      layout: "content",
      title: `Methods that make ${t} visible`,
      bullets: [
        `Name the first-line stain, culture, or assay you would run before specialised tests for ${t}.`,
        "State what a negative result does — and does not — rule out.",
        "Pair a rapid method with a confirmatory method and say which is used for a decision.",
        "Flag one biosafety or contamination trap in the student laboratory.",
      ],
      notes: `Walk the bench workflow for ${t}.`,
    },
    {
      layout: "full-image",
      title: `Read this figure — ${t}`,
      bullets: [
        "What is the specimen, stain, or schematic actually showing?",
        "Which labelled structure would be absent in a knockout or a failed process?",
        "Write one exam-style question whose answer is on this figure.",
      ],
      notes: "Do not talk over the figure for more than 90 seconds.",
    },
    {
      layout: "content",
      title: `Case vignette — ${t}`,
      bullets: [
        "Give the room a short stem (patient, plant, fermenter, or outbreak) with two red herrings.",
        `Ask which observation would change the working model of ${t}.`,
        "Require one cited mechanism, not a list of names.",
        brief,
      ],
      notes: "Do not reveal the answer until a student commits out loud.",
    },
    {
      layout: "content",
      title: `Quantitative check on ${t}`,
      bullets: [
        "Estimate an order of magnitude (size, doubling time, MIC, yield, Km, or CFU).",
        "Show the unit conversion students trip on.",
        "Sketch the expected curve, plate, or chromatogram — then the failure mode.",
        "Ask what would have to be true for the number to be 10-fold wrong.",
      ],
      notes: "Numbers beat adjectives.",
    },
    {
      layout: "content",
      title: `Quality, safety, and regulation for ${t}`,
      bullets: [
        "Which standard, pharmacopoeia, or biosafety level actually governs the work?",
        "Name a release test (sterility, endotoxin, activity, identity) and what failure looks like.",
        "Where does documentation (batch record, SOP, chain of custody) sit in the lecture hour?",
        "What would an auditor ask that a student cannot currently answer?",
      ],
      notes: "Do not skip this slide for industrial or clinical cohorts.",
    },
    {
      layout: "content",
      title: `Molecular mechanism of ${t}`,
      bullets: [
        "Name the molecules that have to meet, in order, for the process to start.",
        "Identify the rate-limiting step and how you would know it in a graph.",
        "State one mutation, inhibitor, or process fault that breaks the chain.",
        "Translate the mechanism into a laboratory observable (band, colony, titre, OD).",
      ],
      notes: "Mechanism must earn a figure.",
    },
    {
      layout: "two-column",
      title: `${t}: laboratory vs lecture`,
      leftBullets: ["What the protocol actually does", "The control that is not optional", "The number you record"],
      rightBullets: ["What the textbook drawing hides", "The failure that looks like success", "The sentence you write in the lab book"],
      notes: "Pair with the practical manual if one exists.",
    },
    {
      layout: "content",
      title: `History and evidence for ${t}`,
      bullets: [
        "Name the paper or experiment that first established the claim.",
        "What was measured, in what system, and what was the control?",
        "Which part of that evidence would not survive a modern methods review?",
        "What is the current consensus — and where is it still contested?",
      ],
      notes: "Cite on this slide, not in the appendix only.",
    },
    {
      layout: "content",
      title: `Diagnostics built on ${t}`,
      bullets: [
        "Is the test detecting antigen, nucleic acid, activity, or a host response?",
        "State sensitivity vs specificity in one spoken sentence.",
        "When would you still culture or sequence after a rapid test?",
        "Name a false-positive and a false-negative story.",
      ],
      notes: "Students over-trust a single rapid result.",
    },
    {
      layout: "content",
      title: `Therapeutics and inhibitors around ${t}`,
      bullets: [
        "What is the actual target — enzyme, wall, ribosome, polymerase, host factor?",
        "How does resistance arise in one mutational or horizontal step?",
        "Which combination or stewardship rule exists because monotherapy fails?",
        "What would you monitor in a patient, fermenter, or field after dosing?",
      ],
      notes: "Link mechanism to a named drug or process aid.",
    },
    {
      layout: "content",
      title: `Ecology of ${t}`,
      bullets: [
        "Where does this live when we are not looking — host, soil, food, reactor, fomite?",
        "Which abiotic factor (pH, aw, O2, T) actually limits it?",
        "Name one interaction (competition, biofilm, phage, quorum) that changes the outcome.",
        "What would an environmental sample look like on a plate or a graph?",
      ],
      notes: "Pathogenesis is ecology with a host.",
    },
    {
      layout: "content",
      title: `Industrial / process view of ${t}`,
      bullets: [
        "Titre, yield, productivity — which one is the bottleneck here?",
        "Upstream vs downstream: where does the money and the failure sit?",
        "What would you immobilise, recycle, or contain?",
        "Name a scale-up surprise (shear, oxygen, phage, foam, fouling).",
      ],
      notes: "Process numbers belong on the board.",
    },
    {
      layout: "content",
      title: `Exam traps on ${t}`,
      bullets: [
        "The lookalike organism, pathway, or term that costs a mark.",
        "The unit, stain, or temperature students swap under time pressure.",
        "A true statement that is not the answer to the question asked.",
        "One question you will actually set, with the marking point.",
      ],
      notes: "Write the exam question before the last week.",
    },
    {
      layout: "content",
      title: `Misconceptions about ${t}`,
      bullets: [
        "The school-biology sentence that is no longer true.",
        "The journalistic claim that overstates clinical or industrial impact.",
        "The figure students remember that is schematic, not a micrograph.",
        "The correction you want them to leave with.",
      ],
      notes: "Correct without humiliating.",
    },
    {
      layout: "two-column",
      title: `${t}: in vitro vs in vivo`,
      leftBullets: ["What a flask or plate can prove", "The variable you actually control", "The endpoint you measure"],
      rightBullets: ["What a host, soil, or plant adds", "The variable you cannot freeze", "The endpoint that matters clinically or in the field"],
      notes: "Do not let in-vitro MIC become the whole story.",
    },
    {
      layout: "content",
      title: `Genetics of ${t}`,
      bullets: [
        "Is the trait chromosomal, plasmid, phage, or regulatory?",
        "Name a screen or selection that found the gene.",
        "What does a knockout vs a knockdown vs a point mutant tell you?",
        "How would CRISPR or a reporter assay be used in this course?",
      ],
      notes: "Genotype must map to a phenotype they can name.",
    },
    {
      layout: "content",
      title: `Host response to ${t}`,
      bullets: [
        "Innate first: which cell and which PRR would see this?",
        "What soluble mediator changes the next 24 hours?",
        "Adaptive: antibody, CTL, or both — and what is the antigen?",
        "Immunopathology: when is the damage host-made?",
      ],
      notes: "Immunology slides need a cell, not a word cloud.",
    },
    {
      layout: "full-image",
      title: `Morphology that identifies ${t}`,
      bullets: [
        "Shape, arrangement, stain, and size — say them in that order.",
        "Which lookalike would a student call the same thing?",
        "What would SEM or TEM add that Gram cannot?",
      ],
      notes: "The figure is the teaching object.",
    },
    {
      layout: "content",
      title: `Biosafety for practicals on ${t}`,
      bullets: [
        "BSL and why — not the number in isolation, the route of exposure.",
        "PPE, sharps, and the one step students rush.",
        "Spill and inactivation: what actually kills it in this lab.",
        "What you will not culture in an undergraduate teaching room.",
      ],
      notes: "Safety is a slide, not a footnote.",
    },
    {
      layout: "content",
      title: `Data and statistics for ${t}`,
      bullets: [
        "n, replicate, and biological vs technical — which did the paper actually do?",
        "Error bars: SD, SEM, or CI — read the caption.",
        "A p-value that does not change a process decision.",
        "Sketch the graph you would accept as replication.",
      ],
      notes: "Biostatistics belongs inside the science slide.",
    },
    {
      layout: "content",
      title: `One key paper on ${t}`,
      bullets: [
        "Authors, year, journal — write them as a spoken citation.",
        "The figure that carries the claim.",
        "The limitation the authors themselves list.",
        "What experiment you would run next in this department.",
      ],
      notes: "Teach one paper well rather than ten badly.",
    },
    {
      layout: "content",
      title: `Field, clinic, or plant: ${t} in the real world`,
      bullets: [
        "A Pakistani, regional, or JUW-relevant example if one exists.",
        "Who pays, who is at risk, and who decides.",
        "What surveillance or QC currently exists.",
        "The sentence a graduate might say in a job interview.",
      ],
      notes: "Localise without inventing prevalence.",
    },
    {
      layout: "two-column",
      title: `${t}: advantages vs costs`,
      leftBullets: ["Why anyone uses or studies this", "The gain in titre, speed, or outcome", "The teaching value in MIC-4511"],
      rightBullets: ["Energy, money, time, or toxicity cost", "Failure mode at scale", "What you would not attempt in this lab"],
      notes: "Balance the hype slide.",
    },
    {
      layout: "content",
      title: `Kinetic / process curve for ${t}`,
      bullets: [
        "Label the axes before you draw.",
        "Mark the operating window (temperature, pH, load, time).",
        "Show the overload, inhibition, or washout shape.",
        "Ask what a 2× change in the x-axis does to the product.",
      ],
      notes: "A labelled curve is better than a paragraph.",
    },
    {
      layout: "content",
      title: `Immobilisation, containment, or formulation of ${t}`,
      bullets: [
        "Adsorption, entrapment, covalent, membrane — which fits this molecule or cell?",
        "What leaks, fouls, or denatures first?",
        "How many cycles until activity is half?",
        "What would you measure as a release test?",
      ],
      notes: "Favourite JUW practical territory.",
    },
    {
      layout: "content",
      title: `Contamination and failure modes of ${t}`,
      bullets: [
        "The most likely contaminant and how it announces itself.",
        "Phage, spore, mould, or chemical — pick the realistic one.",
        "The in-process test that would have caught it yesterday.",
        "What you throw away vs what you can rescue.",
      ],
      notes: "Failure is a teaching gift.",
    },
    {
      layout: "content",
      title: `Ethics, dual use, and claims around ${t}`,
      bullets: [
        "What must not be over-claimed in a student poster?",
        "Human, animal, or environmental subjects — what approval exists?",
        "Dual-use: where does curiosity become a problem?",
        "How you cite someone else's figure without stealing it.",
      ],
      notes: "Keep it concrete.",
    },
    {
      layout: "content",
      title: `Open questions still sitting on ${t}`,
      bullets: [
        "A measurement we still cannot make well.",
        "A mechanism that is inferred, not shown.",
        "A translation gap (bench → clinic / field / plant).",
        "A project a final-year student could finish in one term.",
      ],
      notes: "Leave research hunger, not despair.",
    },
    {
      layout: "content",
      title: `Glossary students must not mix for ${t}`,
      bullets: [
        "Term A vs term B that sound like synonyms.",
        "The abbreviation that means two things in two chapters.",
        "A unit that changes the claim if you drop a prefix.",
        "The phrase you will penalise on the script.",
      ],
      notes: "A glossary slide can be oral.",
    },
    {
      layout: "full-image",
      title: `Workflow schematic — ${t}`,
      bullets: [
        "Number the steps; say which one is rate-limiting.",
        "Circle the QC sample.",
        "Cross out the step you would never skip under time pressure.",
      ],
      notes: "Schematic, then silence.",
    },
    {
      layout: "content",
      title: `Sample to result: a path through ${t}`,
      bullets: [
        "Collection / sampling error that cannot be fixed later.",
        "Transport and holding time.",
        "The assay window.",
        "How the report is worded so a clinician or plant manager can act.",
      ],
      notes: "Pre-analytical error is most of error.",
    },
    {
      layout: "content",
      title: `Controls you will actually run for ${t}`,
      bullets: [
        "Positive, negative, and reagent blank — what each rules out.",
        "The control that is missing from a student protocol.",
        "What you do when the control fails and the sample looks fine.",
        "How many times you repeat before you believe it.",
      ],
      notes: "Controls are not decoration.",
    },
    {
      layout: "two-column",
      title: `${t}: classical vs molecular`,
      leftBullets: ["Culture, stain, biochemical", "Slow, cheap, phenotypic", "What it still catches that PCR misses"],
      rightBullets: ["NAAT, WGS, proteomics", "Fast, expensive, genotypic", "What a sequence cannot tell you about viability"],
      notes: "Both stay in the course.",
    },
    {
      layout: "content",
      title: `Public-health or One Health angle on ${t}`,
      bullets: [
        "Human, animal, and environment — where does the reservoir sit?",
        "A surveillance number you can cite without guessing.",
        "An intervention that is not a new drug (water, vaccine, hygiene, process).",
        "What a microbiology graduate adds to an outbreak or plant meeting.",
      ],
      notes: "Keep claims sourced.",
    },
    {
      layout: "content",
      title: `Instrumentation for ${t}`,
      bullets: [
        "The instrument in this department that actually measures it.",
        "Calibration and the blank.",
        "The artefact (bubble, path length, matrix) students ignore.",
        "When a cheaper method is scientifically better.",
      ],
      notes: "Name the machine.",
    },
    {
      layout: "content",
      title: `Design a mini-experiment on ${t}`,
      bullets: [
        "Hypothesis in one line.",
        "Independent and dependent variable.",
        "n and the control.",
        "The figure you would present, including axes.",
      ],
      notes: "Workshop slide — 4 minutes silent writing.",
    },
    {
      layout: "content",
      title: `What a good lab notebook page for ${t} looks like`,
      bullets: [
        "Date, strain or lot, operator.",
        "The raw number, not the processed one.",
        "Deviation from SOP, in the line it happened.",
        "The conclusion that a stranger could audit.",
      ],
      notes: "GMP-lite for undergraduates.",
    },
  ];
  return rows.map((row) => emptySlide(row));
}

function moduleAspectSlides(modules: KnowledgeModule[], topic: string): Slide[] {
  const aspects: Array<{
    label: string;
    layout: Slide["layout"];
    bullets: (mod: KnowledgeModule) => string[];
    left?: (mod: KnowledgeModule) => string[];
    right?: (mod: KnowledgeModule) => string[];
    notes: string;
  }> = [
    {
      label: "how we visualise it",
      layout: "full-image",
      bullets: (mod) => [
        `Which stain, plate, chromatogram, or micrograph makes “${mod.title}” obvious in 10 seconds?`,
        "What would be missing in a knockout, a failed batch, or a negative control?",
        `Write one exam question whose answer is on the figure for ${topic}.`,
      ],
      notes: "Figure first, then silence.",
    },
    {
      label: "method that decides",
      layout: "content",
      bullets: (mod) => [
        customise(mod.bullets[0] ?? mod.title, topic),
        "Name the first-line assay and the confirmatory assay.",
        "State what a negative result does not rule out.",
        "Flag the biosafety or contamination trap on this bench.",
      ],
      notes: "Method first, then the decision.",
    },
    {
      label: "numbers",
      layout: "content",
      bullets: (mod) => [
        `Estimate an order of magnitude that belongs with ${mod.title.toLowerCase()} (${topic}).`,
        "Show the unit conversion students trip on.",
        "Sketch the expected curve, plate, or chromatogram — then the failure mode.",
        customise(mod.bullets[1] ?? "Name the control that makes the number believable.", topic),
      ],
      notes: "Numbers beat adjectives.",
    },
    {
      label: "compare",
      layout: "two-column",
      bullets: () => [],
      left: (mod) => ["Novice confusion", mod.keywords[0] ? `Looks like ${mod.keywords[0]}` : "Shared jargon", "Textbook overlap"],
      right: (mod) => ["Discriminating test", `Cost of getting ${mod.title.toLowerCase()} wrong`, "Exam sentence"],
      notes: "Fill one misconception live.",
    },
    {
      label: "failure modes",
      layout: "content",
      bullets: (mod) => [
        `The most likely way ${mod.title.toLowerCase()} fails in a student practical on ${topic}.`,
        "What the plate, peak, or stain looks like when it has already failed.",
        "The in-process test that would have caught it yesterday.",
        customise(mod.bullets[2] ?? "What you throw away vs what you can rescue.", topic),
      ],
      notes: "Failure is a teaching gift.",
    },
    {
      label: "exam trap",
      layout: "content",
      bullets: (mod) => [
        `The lookalike term next to ${mod.title.toLowerCase()} that costs a mark.`,
        customise(mod.bullets[3] ?? "A true statement that is not the answer asked.", topic),
        "The unit, stain, or temperature students swap under time pressure.",
        "One question you will actually set, with the marking point.",
      ],
      notes: "Write the exam question before the last week.",
    },
  ];

  const out: Slide[] = [];
  for (const mod of modules) {
    for (const aspect of aspects) {
      const two = aspect.layout === "two-column";
      out.push(
        emptySlide({
          layout: aspect.layout,
          title: `${customise(weaveTitle(mod.title, topic), topic)} — ${aspect.label}`,
          bullets: two ? [] : aspect.bullets(mod),
          leftBullets: two ? (aspect.left?.(mod) ?? []) : [],
          rightBullets: two ? (aspect.right?.(mod) ?? []) : [],
          notes: aspect.notes,
        }),
      );
    }
  }
  return out;
}

function stationBank(topic: string, notes?: string): Slide[] {
  const t = topic.trim() || "this topic";
  const enzymeTopic = /immobil|enzyme|ferment|bioreactor|kinetics|downstream/.test(t.toLowerCase());
  const tasks = [
    ["claim station", "Write one falsifiable claim.", "Name the control.", "Name the endpoint.", "Name the figure."],
    ["stain station", "Pick Gram, acid-fast, spore, or capsule.", "What colour is a positive?", "What does negative not rule out?", "Biosafety note."],
    ["plate station", "Choose selective vs differential.", "Colony you expect.", "Colony that means contamination.", "Incubation time and atmosphere."],
    ["curve station", "Label both axes.", "Mark lag / log / stationary — or Km / Vmax.", "Draw the failure shape.", "What a 2× x-axis change does."],
    ["MIC station", "Dilution series you would pour.", "First clear well means…", "Why turbidity is not CFU.", "Quality-control organism."],
    ["PCR station", "Target gene and why.", "Controls: extraction, NTC, positive.", "What a band does not prove.", "Contamination trap."],
    ["ELISA station", "Antigen vs antibody capture.", "Blank, standard, sample.", "Hook effect in one sentence.", "When you still culture."],
    ["fermenter station", "Batch vs fed-batch vs immobilised.", "DOT, pH, foam — which alarms first?", "Harvest criterion.", "Phage or contamination signature."],
    ["immobilisation station", "Adsorption, entrapment, covalent, membrane.", "What leaks first?", "Cycles to 50% activity.", "Release test."],
    ["downstream station", "Centrifuge vs filter vs chromatography.", "Yield vs purity trade-off.", "Where the money sits.", "A scale-up surprise."],
    ["biofilm station", "Attachment → EPS → mature → disperse.", "Why MIC lies.", "Device or plant surface.", "How you would image it."],
    ["outbreak station", "Case definition.", "Reservoir vs vehicle.", "First control measure that is not a new drug.", "What the lab must report today."],
    ["AMR station", "The gene or the phenotype?", "Horizontal vs mutational.", "Stewardship sentence.", "A Pakistani or regional example if sourced."],
    ["vaccine station", "Antigen actually in the vial.", "Live, killed, subunit, mRNA.", "Correlates of protection — or their absence.", "Cold chain."],
    ["notebook station", "Date, strain/lot, operator.", "Raw number, not the processed one.", "Deviation in the line it happened.", "Audit sentence."],
    ["ethics station", "What you will not over-claim on a poster.", "Whose figure is this, and the licence?", "Dual-use line you will not cross.", "Approval that exists — or does not."],
    ["instrument station", "Name the machine in this department.", "Blank and calibration.", "The artefact students ignore.", "When a cheaper method is better."],
    ["One Health station", "Human / animal / environment reservoir.", "Surveillance number you can cite.", "Intervention that is not a new drug.", "What a graduate adds in the meeting."],
    ["QC station", "Identity, potency, sterility, endotoxin — pick one.", "Pharmacopoeia or SOP clause.", "OOS: retest vs reject.", "Auditor question."],
    ["imaging station", "Bright-field vs fluorescence vs SEM/TEM.", "Resolution vs the structure you claim.", "Artefact that looks like a vesicle.", "Scale bar sentence."],
  ].filter((row) => enzymeTopic || !/immobilisation|fermenter|downstream/.test(row[0]));
  return tasks.map((row, i) => {
    const [label, a, b, c, d] = row;
    const two = i % 5 === 3;
    return emptySlide({
      layout: two ? "two-column" : i % 6 === 2 ? "full-image" : "content",
      title: `${t}: ${label}`,
      bullets: two ? [] : [a, b, c, d, notes ? `Instructor brief: ${notes.slice(0, 120)}` : `Keep this station on ${t} only — do not recycle another lecture’s figure.`].slice(0, 4),
      leftBullets: two ? [a, b] : [],
      rightBullets: two ? [c, d] : [],
      notes: `Station ${i + 1} — unique to ${t}.`,
    });
  });
}

function uniqueBeatSlide(topic: string, n: number, notes?: string): Slide {
  const t = topic.trim() || "this topic";
  const angles: Array<[string, string, string, string, string]> = [
    ["Cell envelope", `Name the wall, membrane, or coat that actually bounds ${t}.`, "Which stain or dye reports that layer?", "What a mutant missing it would look like on a plate.", "The antibiotic or process step that hits this layer."],
    ["Genome", `Chromosome, plasmid, or segmented genome — which does ${t} use?`, "Name one gene a practical would actually amplify.", "What a knockout changes in the phenotype.", "What sequencing cannot say about viability."],
    ["Growth", `Lag, log, stationary, or intracellular cycle — where ${t} spends this lecture.`, "The measurement: OD, CFU, genome copies, or antigen.", "The nutrient or host factor that is limiting.", "What a flat curve means."],
    ["Virulence or activity", `The factor that makes ${t} do damage or do work.`, "How you would show it is necessary, not just present.", "The host, substrate, or reactor it needs.", "The mutant or inhibitor that abolishes it."],
    ["Transmission or input", `How ${t} arrives: person, food, water, vector, fomite, or feedstock.`, "The dose or load that matters, with units.", "The barrier that actually stops it.", "The sample you would take first."],
    ["Diagnosis", `First-line test for ${t}, then the confirmatory test.`, "What a negative first test does not rule out.", "A false positive students will believe.", "Turnaround time versus the decision that cannot wait."],
    ["Treatment or control", `The class of drug, process change, or hygiene step used against ${t}.`, "The target molecule or step.", "How resistance or escape appears in one step.", "What you monitor after you intervene."],
    ["Ecology", `Where ${t} lives when the practical is over.`, "pH, oxygen, water activity, or temperature — the limiter.", "One neighbour (phage, competitor, host cell) that changes the outcome.", "What an environmental plate or graph would show."],
    ["Immune or host response", `The first host cell or sensor that notices ${t}.`, "Innate mediator in the next day.", "Antibody, T cell, or neither.", "When the damage is made by the host."],
    ["Resistance", `The gene or the phenotype — which one the lab reports for ${t}.`, "Mutational versus horizontal.", "The drug class it defeats.", "The stewardship sentence for this case."],
    ["Structure you can draw", `The labelled part a student must point to for ${t}.`, "The scale bar or magnification.", "The lookalike structure on the next organism.", "The part a detergent, heat, or enzyme removes."],
    ["Pathway", `Number the steps of ${t}. Mark the slow one.`, "The substrate in and the product out.", "The cofactor or host factor.", "The step you assay, not the step you narrate."],
    ["Practical design", `Hypothesis in the words of ${t}.`, "Independent variable, dependent variable, and the control.", "The figure you would accept.", "The result that would falsify the claim."],
    ["Biosafety", `The exposure route that matters for ${t}.`, "What this teaching lab will not grow or amplify.", "Inactivation that actually works.", "The spill step students skip."],
    ["Epidemiology", `Who is at risk from ${t}, and who is not.`, "Reservoir versus vehicle.", "The first control that is not a new drug.", "A number you may cite, and a number you must not invent."],
    ["Lookalike", `The organism or process students swap with ${t}.`, "The one test that separates them.", "The shared jargon that causes the swap.", "The mark scheme sentence."],
    ["History", `Who first showed ${t}, and what they measured.`, "The control in that experiment.", "What would fail a modern methods review.", "The part that is still contested."],
    ["One paper", `One paper on ${t}: the figure that carries the claim.`, "The system they used.", "The limitation they admit.", "The next experiment this department could run."],
    ["Quality", `Identity, potency, sterility, or endotoxin — which applies to ${t}.`, "The SOP clause.", "Out of specification: retest or reject.", "The auditor’s question."],
    ["One Health", `Human, animal, or environment — where ${t} actually circulates.`, "The surveillance signal.", "The intervention that is not a new molecule.", "What a graduate adds in the meeting."],
    ["Statistics", `n and replicate for a claim about ${t}.`, "Biological versus technical replicate.", "The error bar in the caption.", "A p-value that would not change the decision."],
    ["Scale-up or clinic", `What changes when ${t} leaves the teaching practical.`, "Shear, oxygen, immunity, or adherence — the surprise.", "The endpoint that matters outside the flask.", "What you would not attempt here."],
    ["Ethics", `The claim you will not print about ${t}.`, "Whose figure, and which licence.", "The dual-use line.", "Approval that exists, or does not."],
    ["Exam", `One question on ${t}, with the marking point.`, "A true sentence that is not the answer.", "The unit students swap.", "The structure they must label."],
  ];
  const idx = Math.max(0, n - 1);
  const row = angles[idx % angles.length];
  const pass = Math.floor(idx / angles.length);
  const lenses = ["bench record", "exam mark", "host", "field sample", "paper", "safety", "control", "figure"];
  const lens = lenses[pass % lenses.length];
  const [label, a, b, c, d] = row;
  if (pass === 0) {
    return emptySlide({
      layout: n % 5 === 0 ? "full-image" : n % 4 === 0 ? "two-column" : "content",
      title: `${t}: ${label}`,
      bullets: n % 4 === 0 ? [] : [a, b, c, d],
      leftBullets: n % 4 === 0 ? [a, b] : [],
      rightBullets: n % 4 === 0 ? [c, d] : [],
      notes: notes ? `Instructor brief: ${notes.slice(0, 140)}` : `Distinct beat on ${t}: ${label}. Do not reuse another slide’s figure.`,
    });
  }
  return emptySlide({
    layout: n % 5 === 0 ? "full-image" : n % 3 === 0 ? "two-column" : "content",
    title: `${t}: ${label} — ${lens}`,
    bullets:
      n % 3 === 0
        ? []
        : [
            `From the ${lens}, what new fact about ${label.toLowerCase()} belongs on this ${t} slide?`,
            `Name one control the ${lens} requires that the earlier ${label.toLowerCase()} slide did not.`,
            `What would falsify the ${lens} claim about ${t}?`,
            `Write the single sentence this ${lens} slide is allowed to add.`,
          ],
    leftBullets: n % 3 === 0 ? [`${label} seen only through the ${lens}`, `A ${t} observation the first slide omitted`] : [],
    rightBullets: n % 3 === 0 ? [`What the ${lens} cannot show about ${t}`, `The limit you will say out loud`] : [],
    notes: `A ${lens} pass on ${label} for ${t}. New sentences and a new figure — do not repeat the earlier slide.`,
  });
}

export function dedicatedLecture(topic: string, discipline: string) {
  const home = (inferFocus(topic, discipline).discipline || discipline || "General Microbiology").trim();
  if (/\b(enzyme|immobil)/i.test(topic)) {
    return { course: JUW.course, courseCode: JUW.courseCode };
  }
  return { course: home, courseCode: JUW.courseCode };
}

export function introSlide(topic: string, notes?: string, discipline?: string): Slide {
  const name = topic.trim();
  const home = discipline?.trim();
  return emptySlide({
    layout: "title",
    theme: "classic",
    title: name,
    subtitle: "",
    notes:
      notes ||
      `Opening slide dedicated to ${name}${home ? ` — ${home}` : ""}. Official JUW frame. The course line follows this topic and stays editable.`,
  });
}

export function withOfficialIntro(deck: Deck, input: GenerateInput): Deck {
  const topic = input.topic.trim() || deck.topic || deck.title;
  const discipline = input.discipline || deck.discipline;
  const dedicated = dedicatedLecture(topic, discipline);
  const meta = lectureMeta({
    ...input,
    course: input.course?.trim() || dedicated.course,
    courseCode: input.courseCode?.trim() || dedicated.courseCode,
  });
  let slides = deck.slides.map((s) => ({ ...s }));
  const intro = introSlide(topic, input.notes, discipline);
  if (!slides.length || slides[0].layout !== "title") {
    slides = [intro, ...slides];
  } else {
    slides[0] = {
      ...slides[0],
      ...intro,
      id: slides[0].id,
      layout: "title",
      theme: "classic",
      title: topic,
      subtitle: "",
      bullets: [],
      leftBullets: [],
      rightBullets: [],
      media: [],
    };
  }
  slides = slides.map((s, i) => ({ ...s, theme: cycleTheme(i, s.layout) }));
  return {
    ...deck,
    ...meta,
    title: topic,
    topic,
    discipline,
    level: input.level || deck.level,
    mediaPool: deck.mediaPool ?? [],
    slides,
  };
}

export function generateLocalDeck(input: GenerateInput): Deck {
  const topic = input.topic.trim() || input.discipline || "Microbiology";
  const discipline = input.discipline || "General Microbiology";
  const count = Math.min(MAX_SLIDES, Math.max(1, Math.round(input.count || 10)));
  const focus = inferFocus(topic, discipline);
  const teaching = focus.kind !== "general" && focus.discipline ? focus.discipline : discipline;
  const seeds = seedCitations(teaching);
  const dedicated = dedicatedLecture(topic, discipline);
  const meta = lectureMeta({
    ...input,
    course: input.course?.trim() || dedicated.course,
    courseCode: input.courseCode?.trim() || dedicated.courseCode,
  });
  const slides: Slide[] = [];
  const titles = new Set<string>();
  const bodies = new Set<string>();
  const stems = new Set<string>();
  const families = new Set<string>();
  const usedLines = new Set<string>();
  const prints: Set<string>[] = [];
  const topicRe = new RegExp(topic.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  const normLine = (line: string) =>
    line
      .toLowerCase()
      .replace(topicRe, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const fingerprint = (slide: Slide) => {
    const stop = new Set(["the", "and", "for", "with", "that", "this", "from", "into", "what", "which", "would", "does", "not", "one", "name", "have", "been", "your", "will"]);
    const skip = new Set(topic.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2));
    const text = [slide.title, ...slide.bullets, ...slide.leftBullets, ...slide.rightBullets].join(" ");
    return new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 3 && !stop.has(w) && !skip.has(w)),
    );
  };
  const tooClose = (next: Set<string>) => {
    if (next.size < 4) return false;
    for (const prev of prints) {
      let inter = 0;
      for (const token of next) if (prev.has(token)) inter += 1;
      const union = next.size + prev.size - inter;
      if (union > 0 && inter / union > 0.46) return true;
    }
    return false;
  };

  const familyOf = (title: string) => {
    if (/\(\d+\.\d+\)/.test(title)) return "";
    const s = title.toLowerCase();
    if (/learning objective/.test(s)) return "objectives";
    if (/take-home|take home/.test(s)) return "takehome";
    if (/reference/.test(s)) return "references";
    if (/what .* actually is|place .* in microbiology/.test(s)) return "identity";
    if (/made visible|methods that make|figure contract|read this figure|morphology that/.test(s)) return "visible";
    if (/compare and contrast|what it is, and what it is not|classical bench|classical vs molecular|lookalike/.test(s)) return "compare";
    if (/mechanism that actually|molecular mechanism|life cycle, pathway/.test(s)) return "mechanism";
    if (/case vignette|bench decision/.test(s)) return "case";
    if (/quantitative check|numbers worth knowing/.test(s)) return "numbers";
    if (/biosafety|ethics, dual use/.test(s)) return "safety";
    if (/history and evidence|evidence standard|one key paper/.test(s)) return "evidence";
    if (/exam trap|lookalikes and exam/.test(s)) return "exam";
    if (/ecology of|where .* lives/.test(s)) return "ecology";
    if (/therapeutics and inhibitors|control, treatment/.test(s)) return "control";
    return "";
  };

  const push = (slide: Slide) => {
    const key = slide.title.trim().toLowerCase();
    const body = [...slide.bullets, ...slide.leftBullets, ...slide.rightBullets]
      .map((line) => line.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())
      .filter(Boolean)
      .sort()
      .join(" || ");
    const stem = body
      .replace(new RegExp(topic.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "")
      .replace(/\b(the|and|for|with|that|this|from|into|what|which|would|does|not|one|name)\b/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);
    const family = familyOf(slide.title);
    const print = fingerprint(slide);
    const slideLines = [...slide.bullets, ...slide.leftBullets, ...slide.rightBullets]
      .map(normLine)
      .filter((line) => line.length > 28);
    if (!key || titles.has(key)) return false;
    if (body && bodies.has(body)) return false;
    if (stem && stems.has(stem)) return false;
    if (family && families.has(family)) return false;
    if (slide.layout !== "title" && tooClose(print)) return false;
    if (slideLines.some((line) => usedLines.has(line))) return false;
    titles.add(key);
    if (body) bodies.add(body);
    if (stem) stems.add(stem);
    if (family) families.add(family);
    if (print.size) prints.push(print);
    slideLines.forEach((line) => usedLines.add(line));
    slides.push(slide);
    return true;
  };

  push(introSlide(topic, input.notes ? `Instructor brief: ${input.notes}` : undefined, discipline));
  if (slides[0]) slides[0].citations = seeds.slice(0, 1);

  const closing = count >= 6 ? 3 : count >= 4 ? 2 : 0;
  const wantObjectives = count >= 3;
  const contentNeeded = Math.max(0, count - 1 - (wantObjectives ? 1 : 0) - closing);
  const modules = pickModules(teaching, topic, Math.max(contentNeeded, 80));

  if (wantObjectives) {
    push(
      emptySlide({
        layout: "content",
        title: `Learning objectives — ${topic}`,
        bullets: [
          `Define ${topic} in one sentence a first-year in ${discipline} could mark.`,
          `Explain the structure, life cycle, or mechanism that makes ${topic} itself — not its lookalike.`,
          `Name the method that makes ${topic} visible, and the method that confirms it.`,
          `Apply ${topic} to a case, plate, outbreak, food, or process decision.`,
        ],
        notes: `These four lines are the exam contract for ${topic}. Do not import another lecture.`,
      }),
    );
  }

  for (const core of topicCoreSlides(topic, teaching, input.level, input.notes)) {
    if (slides.length >= count - closing) break;
    push(core);
  }

  modules.forEach((mod, idx) => {
    if (slides.length >= count - closing) return;
    const isTwo = idx % 5 === 3 && mod.bullets.length >= 4;
    push(
      emptySlide({
        layout: isTwo ? "two-column" : idx % 7 === 2 ? "full-image" : "content",
        title: weaveTitle(customise(mod.title, topic), topic),
        bullets: isTwo ? [] : mod.bullets.map((b) => customise(b, topic)),
        leftBullets: isTwo ? mod.bullets.slice(0, Math.ceil(mod.bullets.length / 2)) : [],
        rightBullets: isTwo ? mod.bullets.slice(Math.ceil(mod.bullets.length / 2)) : [],
        notes: mod.notes,
        citations: idx === 0 ? seeds.slice(0, 1) : idx === 1 ? seeds.slice(1, 2) : [],
      }),
    );
  });

  const industrial = /enzyme|immobil|ferment|bioreactor|downstream|industrial|biotech/i.test(`${topic} ${discipline}`);
  for (const extra of uniqueBeats(topic, input.notes)) {
    if (slides.length >= count - closing) break;
    if (!industrial && /immobil|ferment|process curve|industrial \/ process|formulation of/i.test(extra.title)) continue;
    push(extra);
  }

  for (const built of moduleAspectSlides(modules, topic)) {
    if (slides.length >= count - closing) break;
    push(built);
  }

  for (const station of stationBank(topic, input.notes)) {
    if (slides.length >= count - closing) break;
    push(station);
  }

  let beat = 1;
  while (slides.length < count - closing && beat < 600) {
    const ok = push(uniqueBeatSlide(topic, beat, input.notes));
    beat += 1;
    if (!ok) continue;
  }

  if (closing >= 3) {
    push(
      emptySlide({
        layout: "content",
        title: `Why ${topic} matters`,
        bullets: [
          `Connect ${topic} to diagnostics, therapeutics, or environmental practice the class will meet this term.`,
          "Identify one misconception a first-year student typically brings into the room.",
          "Name a method (stain, culture, PCR, serology, sequencing) that makes the organism or process visible.",
          input.notes
            ? `Instructor emphasis: ${input.notes.slice(0, 180)}`
            : "Leave five minutes for a single exam-style question on this slide.",
        ],
        notes: "This is the transfer slide — do not introduce new jargon here.",
        citations: seeds.slice(-1),
      }),
    );
  }
  if (closing >= 2) {
    push(
      emptySlide({
        layout: "content",
        title: `Take-home points — ${topic}`,
        bullets: [
          `State the operational definition of ${topic}.`,
          `Name the method that makes ${topic} visible, and what a negative result does not rule out.`,
          `Write the discriminating feature that separates ${topic} from its lookalike.`,
          "One exam sentence — then stop talking.",
        ],
        notes: "Stop talking after this slide. Let the room write one sentence.",
      }),
    );
  }
  if (closing >= 3) {
    const used = new Map<string, (typeof seeds)[number]>();
    slides.forEach((s) => s.citations.forEach((c) => used.set(c.id, c)));
    seeds.forEach((c) => used.set(c.id, c));
    push(
      emptySlide({
        layout: "content",
        title: `Selected references — ${topic}`,
        bullets: [...used.values()].map((c) => `${c.authors} (${c.year}). ${c.title}.`),
        notes: "These are canonical starting citations. Attach PubMed hits per slide in the Cite panel.",
        citations: [...used.values()],
      }),
    );
  }

  const seenTitle = new Set<string>();
  const seenBody = new Set<string>();
  const unique = slides.filter((slide) => {
    const key = slide.title.trim().toLowerCase();
    const body = [...slide.bullets, ...slide.leftBullets, ...slide.rightBullets]
      .map((line) => line.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())
      .filter(Boolean)
      .sort()
      .join(" || ");
    if (!key || seenTitle.has(key) || (body && seenBody.has(body))) return false;
    seenTitle.add(key);
    if (body) seenBody.add(body);
    return true;
  });

  const deck: Deck = {
    id: uid("deck"),
    title: topic,
    topic,
    discipline,
    level: input.level,
    citationStyle: "Vancouver",
    ...meta,
    slides: unique.slice(0, count).map((s, i) => ({ ...s, theme: cycleTheme(i, s.layout) })),
    mediaPool: [],
    updatedAt: Date.now(),
  };
  return attachUniqueMedia(deck);
}

export function sampleDeck(): Deck {
  const deck = generateLocalDeck({
    topic: "Enzyme Immobilization",
    discipline: "Industrial & Biotechnology Microbiology",
    count: 12,
    level: "Undergraduate",
    notes: "JUW MIC-4511 Microbial Enzyme Technology. Prepared by Ms. Noor.",
    mode: "manual",
    course: "Microbial Enzyme Technology",
    courseCode: "MIC-4511",
    preparedBy: "Ms. Noor",
    department: "Department of Microbiology",
  });
  deck.id = "sample-enzyme-mic4511";
  deck.updatedAt = 1;
  deck.slides.forEach((slide, i) => {
    slide.id = `sample-s-${i}`;
  });
  return deck;
}
