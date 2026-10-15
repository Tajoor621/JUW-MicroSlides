import type { Level, Slide } from "./types";
import { uid } from "./utils";

export type TopicKind =
  | "bacterium"
  | "virus"
  | "fungus"
  | "parasite"
  | "alga"
  | "archaeon"
  | "method"
  | "process"
  | "general";

export interface TopicFocus {
  topic: string;
  kind: TopicKind;
  discipline: string | null;
  setting: "clinical" | "industrial" | "environmental" | "food" | "molecular" | "teaching";
}

const RULES: Array<{ re: RegExp; kind: TopicKind; discipline: string; setting?: TopicFocus["setting"] }> = [
  { re: /\b(enzyme|immobil|bioreactor|downstream|biotech|kinetics)\b/i, kind: "process", discipline: "Industrial & Biotechnology Microbiology", setting: "industrial" },
  { re: /\b(ferment|starter culture|yoghurt|yogurt|cheese|wine|beer|silage)\b/i, kind: "process", discipline: "Food & Dairy Microbiology", setting: "food" },
  { re: /\b(food|dairy|spoilage|haccp|pasteuri[sz]ation|canning)\b/i, kind: "process", discipline: "Food & Dairy Microbiology", setting: "food" },
  { re: /\b(soil|nitrogen|nitrif|denitrif|rhizob|wastewater|biogeochem|compost|methanogen|bioremediation)\b/i, kind: "process", discipline: "Environmental & Soil Microbiology", setting: "environmental" },
  { re: /\b(plant|agri|nodule|phytophthora|xanthomonas|agrobacterium|rust|blight)\b/i, kind: "process", discipline: "Agricultural Microbiology", setting: "environmental" },
  { re: /\b(qpcr|rt-?pcr|pcr|16s|plasmid|crispr|genome|operon|metagenom|sequenc|maldi|cloning|recombinant)\b/i, kind: "method", discipline: "Microbial Genetics & Molecular Biology", setting: "molecular" },
  { re: /\b(amr|antibiotic|stewardship|beta-lactam|carbapenem|esbl|vancomycin|fluoroquinolone|mdr|breakpoint)\b/i, kind: "process", discipline: "Antimicrobial Resistance & Pharmacology", setting: "clinical" },
  { re: /\b(immun|antibod|complement|cytokine|vaccine|antigen|mhc|opson)\b/i, kind: "process", discipline: "Immunology", setting: "clinical" },
  { re: /\b(virus|viral|influenza|hiv|herpes|phage|hepatitis|dengue|rabies|polio|measles|ebola|zika|rotavirus|norovirus|coronavirus|sars|covid|baltimore)\b/i, kind: "virus", discipline: "Virology" },
  { re: /\b(candida|aspergillus|fung|yeast|mould|mold|azole|mycolog|cryptococcus|histoplasma|dermatophyte|mucor|rhizopus)\b/i, kind: "fungus", discipline: "Mycology" },
  { re: /\b(plasmodium|giardia|parasite|trypanosom|amoeb|helminth|malaria|leishmania|toxoplasma|schistosoma|ascaris|taenia|cryptosporidium)\b/i, kind: "parasite", discipline: "Parasitology" },
  { re: /\b(alga|chlorella|cyanobacter|phycolo|diatom|spirulina)\b/i, kind: "alga", discipline: "Phycology", setting: "environmental" },
  { re: /\b(archaea|extremophil|halophil|thermophil|methanogen)\b/i, kind: "archaeon", discipline: "General Microbiology", setting: "environmental" },
  { re: /\b(brucella|leptospir|rickettsia|coxiella|ehrlichia|bartonella|nocardia|actinomyces|burkholderia|acinetobacter|proteus|serratia|enterobacter|yersinia|gardnerella|bacteroides|fusobacterium)\b/i, kind: "bacterium", discipline: "Bacteriology" },
  { re: /\b(brucellosis|leptospirosis|q fever|typhus|lyme|relapsing fever|melioidosis|tularemia|trachoma|psittacosis|legionnaires)\b/i, kind: "bacterium", discipline: "Medical / Clinical Microbiology", setting: "clinical" },
  { re: /\b(ebv|epstein[-\s]?barr|cytomegalovirus|\bcmv\b|varicella|\bvzv\b|hsv|herpes simplex|measles|mumps|rubella|rabies|dengue|zika|chikungunya)\b/i, kind: "virus", discipline: "Virology" },
  { re: /\b(histoplasma|blastomyces|coccidioid|sporothrix|paracoccidioid|dermatophyte|tinea|ringworm)\b/i, kind: "fungus", discipline: "Mycology" },
  { re: /\b(entamoeba|trichomonas|toxoplasma|cryptosporid|cyclospora|babesia|echinococcus|wuchereria|ascaris|taenia|hookworm|pinworm|filaria)\b/i, kind: "parasite", discipline: "Parasitology" },
  { re: /\b(sepsis|meningitis|pneumonia|uti|endocarditis|infection|pathogen|virulence|clinical|tuberculosis|cholera|typhoid|diphtheria)\b/i, kind: "bacterium", discipline: "Medical / Clinical Microbiology", setting: "clinical" },
  { re: /\b(prion|proteinaceous infectious)\b/i, kind: "process", discipline: "Medical / Clinical Microbiology", setting: "clinical" },
  { re: /\b(microbiome|microbiota|probiotic|prebiotic|normal flora|gut flora|dysbiosis)\b/i, kind: "process", discipline: "Medical / Clinical Microbiology", setting: "clinical" },
  { re: /\b(biofilm|quorum|sporulation|endospore|capsule|flagell|pilus|pili)\b/i, kind: "process", discipline: "General Microbiology" },
  { re: /\b(sterili[sz]|autoclave|disinfect|antiseptic|pasteuri[sz]|decontamin)\b/i, kind: "method", discipline: "General Microbiology", setting: "teaching" },
  { re: /\b(elisa|western blot|serolog|immunofluorescen|flow cytometry|maldi)\b/i, kind: "method", discipline: "Immunology", setting: "clinical" },
  { re: /\b(endotoxin|exotoxin|lps|toxin|superantigen)\b/i, kind: "bacterium", discipline: "Bacteriology", setting: "clinical" },
  { re: /\b(coliform|indicator organism|potable|wastewater|waterborne)\b/i, kind: "bacterium", discipline: "Environmental & Soil Microbiology", setting: "environmental" },
  { re: /\b(nosocomial|hospital-acquired|hai|opportunistic)\b/i, kind: "bacterium", discipline: "Medical / Clinical Microbiology", setting: "clinical" },
  { re: /\b(phage therapy|bacteriophage therapy)\b/i, kind: "virus", discipline: "Virology" },
  { re: /\b(hpv|papilloma|adenovirus|poxvirus|mpox|arbovirus|chikungunya|yellow fever|west nile|rotavirus|norovirus|rhinovirus|enterovirus)\b/i, kind: "virus", discipline: "Virology" },
  { re: /\b(syphilis|gonorrhoe?a|chancroid|pertussis|whooping|anthrax|tetanus|botulism|diphtheria|leprosy|typhoid|plague)\b/i, kind: "bacterium", discipline: "Medical / Clinical Microbiology", setting: "clinical" },
  { re: /\b(aflatoxin|mycotoxin|ergot|ringworm|tinea|pneumocystis)\b/i, kind: "fungus", discipline: "Mycology" },
  { re: /\b(hookworm|pinworm|tapeworm|filaria|entamoeba|trichomonas|babesia|cyclospora)\b/i, kind: "parasite", discipline: "Parasitology" },
  { re: /\b(conjugation|transduction|transformation|transposon|horizontal gene|binary fission|chemostat|diauxie|generation time|peptidoglycan|lipopolysaccharide|gram-positive|gram-negative)\b/i, kind: "process", discipline: "General Microbiology", setting: "teaching" },
  { re: /\b(kirby|disk diffusion|susceptibility|broth microdilution)\b/i, kind: "method", discipline: "Antimicrobial Resistance & Pharmacology", setting: "clinical" },
  { re: /\b(zoonos|one health|vector-borne|mosquito|tick-borne)\b/i, kind: "process", discipline: "Medical / Clinical Microbiology", setting: "clinical" },
  { re: /\b(sewage|activated sludge|nitrogen fixation|bioremediation)\b/i, kind: "process", discipline: "Environmental & Soil Microbiology", setting: "environmental" },
  { re: /\b(gram stain|acid-fast|ziehl|culture medium|koch|pasteur|growth curve|bright-field|phase contrast)\b/i, kind: "method", discipline: "General Microbiology", setting: "teaching" },
  { re: /\b(metabol|glycolys|tca|krebs|respiration|fermentative|photosynth|lithotroph|chemolitho|anox)\b/i, kind: "process", discipline: "General Microbiology", setting: "teaching" },
  { re: /\b(lac operon|trp operon|transcription|translation|ribosome|codon|operon|regulon|quorum sensing)\b/i, kind: "process", discipline: "Microbial Genetics & Molecular Biology", setting: "molecular" },
  { re: /\b(peptidoglycan|teichoic|lipopolysaccharide|outer membrane|cell wall|gram[-\s]?positive|gram[-\s]?negative|mycolic)\b/i, kind: "bacterium", discipline: "Bacteriology", setting: "teaching" },
  { re: /\b(motil|chemotax|flagell|pilus|pili|fimbria|capsule|endospore|sporulat)\b/i, kind: "bacterium", discipline: "Bacteriology" },
  { re: /\b(macconkey|blood agar|chocolate agar|emb agar|\bimvic\b|catalase|coagulase|oxidase|urease|tsi\b|culture media|biochemical test)\b/i, kind: "method", discipline: "Bacteriology", setting: "teaching" },
  { re: /\b(dark[-\s]?field|fluorescence microscop|electron microscop|\bsem\b|\btem\b|confocal|phase[-\s]?contrast)\b/i, kind: "method", discipline: "General Microbiology", setting: "teaching" },
  { re: /\b(water microbiology|air microbiology|milk microbiology|coliform|most probable number|\bmpn\b|potable)\b/i, kind: "process", discipline: "Environmental & Soil Microbiology", setting: "environmental" },
  { re: /\b(normal flora|microbiota|opportunistic|probiotic|prebiotic|dysbiosis|gut flora)\b/i, kind: "process", discipline: "Medical / Clinical Microbiology", setting: "clinical" },
  { re: /\b(urinary|wound infection|abscess|pyogen|otitis|pharyngitis|impetigo|cellulitis)\b/i, kind: "bacterium", discipline: "Medical / Clinical Microbiology", setting: "clinical" },
  { re: /\b(\btb\b|tuberculosis|mdr-tb|xdr|mycobacterium tuberculosis|leprosy|hansen)\b/i, kind: "bacterium", discipline: "Medical / Clinical Microbiology", setting: "clinical" },
  { re: /\b(antifungal|antiprotozo|anthelmint|bacteriocin|antimicrobial peptide)\b/i, kind: "process", discipline: "Antimicrobial Resistance & Pharmacology", setting: "clinical" },
  { re: /\b(algal bloom|eutroph|lichen|mycorrhiz|rhizosphere|single cell protein|biogas)\b/i, kind: "process", discipline: "Environmental & Soil Microbiology", setting: "environmental" },
  { re: /\b(monoclonal|hybridoma|serolog|widal|vdrl|agglutination|complement fixation)\b/i, kind: "method", discipline: "Immunology", setting: "clinical" },
  { re: /\b(oncogenic|oncovirus|retrovirus|reverse transcript|integrase|protease inhibitor)\b/i, kind: "virus", discipline: "Virology" },
  { re: /\b(secretion system|type iii|type vi|exotoxin|endotoxin|superantigen|hemolysin)\b/i, kind: "bacterium", discipline: "Bacteriology", setting: "clinical" },
  { re: /\b(binary fission|generation time|diauxie|chemostat|turbidostat|growth rate)\b/i, kind: "process", discipline: "General Microbiology", setting: "teaching" },
  { re: /\b(phage|lysogen|lytic cycle|transduction|prophage)\b/i, kind: "virus", discipline: "Virology", setting: "molecular" },
];

const ORGANISMS: Array<{ re: RegExp; kind: TopicKind; discipline: string; setting?: TopicFocus["setting"] }> = [
  { re: /\b(staphylococ|mrsa|mssa|s\.\s*aureus)\b/i, kind: "bacterium", discipline: "Bacteriology", setting: "clinical" },
  { re: /\b(streptococ|s\.\s*pyogenes|s\.\s*pneumoniae|pneumococ|group a strep)\b/i, kind: "bacterium", discipline: "Bacteriology", setting: "clinical" },
  { re: /\b(enterococ|vre\b)\b/i, kind: "bacterium", discipline: "Bacteriology", setting: "clinical" },
  { re: /\b(escherichia|e\.?\s*coli|stec|etec|epec|ehec)\b/i, kind: "bacterium", discipline: "Bacteriology", setting: "clinical" },
  { re: /\b(salmonella|shigella|klebsiella|proteus|serratia|enterobacter|yersinia|citrobacter)\b/i, kind: "bacterium", discipline: "Bacteriology", setting: "clinical" },
  { re: /\b(pseudomonas|acinetobacter|burkholderia|stenotrophomonas)\b/i, kind: "bacterium", discipline: "Bacteriology", setting: "clinical" },
  { re: /\b(vibrio|campylobacter|helicobacter|h\.\s*pylori)\b/i, kind: "bacterium", discipline: "Bacteriology", setting: "clinical" },
  { re: /\b(neisseria|gonorrh|meningococ)\b/i, kind: "bacterium", discipline: "Bacteriology", setting: "clinical" },
  { re: /\b(clostridi|c\.\s*diff|c\.?\s*difficile|c\.\s*tetani|c\.\s*botulinum|c\.\s*perfringens)\b/i, kind: "bacterium", discipline: "Bacteriology", setting: "clinical" },
  { re: /\b(bacillus|listeria|corynebacter|mycobacter|nocardia|actinomyces)\b/i, kind: "bacterium", discipline: "Bacteriology", setting: "clinical" },
  { re: /\b(haemophilus|bordetella|legionella|francisella|brucella|leptospir)\b/i, kind: "bacterium", discipline: "Bacteriology", setting: "clinical" },
  { re: /\b(treponema|borrelia|chlamydia|chlamydophila|mycoplasma|ureaplasma|rickettsia)\b/i, kind: "bacterium", discipline: "Bacteriology", setting: "clinical" },
  { re: /\b(hepatitis\s*[a-e]|hbv|hcv|hav|hepadna|flavivirus|coronavirus|sars-cov|sars cov|influenza|orthomyxo|paramyxo|rabies|lyssavirus|rotavirus|norovirus|adenovirus|papillomavirus|hpv|poxvirus|arbovirus)\b/i, kind: "virus", discipline: "Virology", setting: "clinical" },
  { re: /\b(candida|aspergillus|cryptococcus|mucor|rhizopus|fusarium|pneumocystis|dermatophyte|tinea|histoplasma|blastomyces|coccidioides|sporothrix)\b/i, kind: "fungus", discipline: "Mycology" },
  { re: /\b(plasmodium|malaria|babesia|leishmania|trypanosom|giardia|entamoeba|trichomonas|toxoplasma|cryptosporid|cyclospora|schistosom|ascaris|taenia|echinococcus|wuchereria|hookworm|pinworm|filaria)\b/i, kind: "parasite", discipline: "Parasitology" },
  { re: /\b(chlorella|spirulina|diatom|cyanobacter|microcystis|algal bloom)\b/i, kind: "alga", discipline: "Phycology", setting: "environmental" },
  { re: /\b(methanogen|halobacter|thermococcus|sulfolobus|pyrococcus|archaea)\b/i, kind: "archaeon", discipline: "General Microbiology", setting: "environmental" },
];

export function inferFocus(topic: string, discipline?: string): TopicFocus {
  const text = topic.trim();
  for (const rule of ORGANISMS) {
    if (rule.re.test(text)) {
      return {
        topic: text,
        kind: rule.kind,
        discipline: rule.discipline,
        setting: rule.setting ?? defaultSetting(rule.kind),
      };
    }
  }
  for (const rule of RULES) {
    if (rule.re.test(text)) {
      return {
        topic: text,
        kind: rule.kind,
        discipline: rule.discipline,
        setting: rule.setting ?? defaultSetting(rule.kind),
      };
    }
  }
  if (/\b[A-Z][a-z]{2,}\s+[a-z]{3,}\b/.test(text)) {
    return { topic: text, kind: "bacterium", discipline: "Bacteriology", setting: "clinical" };
  }
  return {
    topic: text,
    kind: "general",
    discipline: discipline?.trim() || "General Microbiology",
    setting: "teaching",
  };
}

function defaultSetting(kind: TopicKind): TopicFocus["setting"] {
  if (kind === "virus" || kind === "parasite" || kind === "fungus" || kind === "bacterium") return "clinical";
  if (kind === "method") return "molecular";
  if (kind === "alga" || kind === "archaeon") return "environmental";
  return "teaching";
}

function slide(
  layout: Slide["layout"],
  title: string,
  bullets: string[],
  notes: string,
  two?: { left: string[]; right: string[] },
): Slide {
  return {
    id: uid("s"),
    layout,
    theme: "gram",
    title,
    subtitle: "",
    bullets: two ? [] : bullets,
    leftBullets: two?.left ?? [],
    rightBullets: two?.right ?? [],
    notes,
    citations: [],
    media: [],
  };
}

function kindSlides(focus: TopicFocus, t: string, home: string): Slide[] {
  const rows: Array<[Slide["layout"], string, string[]]> = [];
  const add = (layout: Slide["layout"], title: string, bullets: string[]) => rows.push([layout, title, bullets]);
  if (focus.kind === "bacterium") {
    add("content", `Gram identity of ${t}`, [
      `Gram reaction, shape, and arrangement of ${t}, in that order.`,
      "Spore, capsule, or flagellum — which structure changes the practical.",
      "Atmosphere and temperature a teaching plate actually uses.",
      "The colony a student should not call contamination.",
    ]);
    add("two-column", `${t} on the plate vs in the host`, [
      "Selective or differential medium",
      "Colony and haemolysis you expect",
      "Biochemical test that confirms, not the one that overlaps",
      "Specimen, not a swab of convenience",
      "Virulence factor that has to be present, not just the species name",
      "What a commensal isolate of the same genus does not do",
    ]);
    add("content", `Toxins and wall targets of ${t}`, [
      "Endotoxin, exotoxin, or neither — name the molecule.",
      "The cell-wall or ribosome step an antibiotic in this lecture actually hits.",
      "One resistance step that defeats that drug.",
      "The lab report line: organism, site, and one susceptibility.",
    ]);
  } else if (focus.kind === "virus") {
    add("content", `Genome and envelope of ${t}`, [
      `DNA or RNA, enveloped or naked, and the Baltimore class of ${t}.`,
      "Segmented or not — what that does to reassortment or packaging.",
      "The cell and, if known, the receptor it must use.",
      "Detergent, heat, or a vaccine: which particle part each one hits.",
    ]);
    add("content", `Replication site of ${t}`, [
      "Where the genome is copied: nucleus or cytoplasm.",
      "The viral enzyme the host does not have.",
      "Cytopathic effect versus a latent or persistent pattern.",
      "What a PCR positive does not say about infectious virus.",
    ]);
    add("full-image", `Spread and control of ${t}`, [
      "Respiratory, blood, vector, faecal-oral, or vertical — one route.",
      "The specimen taken before antivirals, if treatment is in scope.",
      "Vaccine, antiviral class, or hygiene — the intervention that matches the particle.",
      "The control that is not a new drug.",
    ]);
  } else if (focus.kind === "fungus") {
    add("content", `Form of ${t} at two temperatures`, [
      "Yeast, mould, or dimorphic — what the bench sees at 25 °C and at 37 °C.",
      "Hyphae, pseudohyphae, spore, or yeast cell on the teaching slide.",
      "KOH, lactophenol cotton blue, or culture — the first look.",
      "Ergosterol or glucan: the drug target if treatment is in this hour.",
    ]);
    add("content", `Where ${t} is a pathogen and where it is a mould`, [
      "Host factor that turns a coloniser into disease.",
      "The specimen that is not a contaminant: tissue, not a dry swab.",
      "A lookalike yeast or mould students will name instead.",
      "What an azole failure looks like on the plate or in the patient.",
    ]);
  } else if (focus.kind === "parasite") {
    add("content", `Life-cycle stage of ${t} that infects`, [
      "Protozoan or helminth, and the stage people actually acquire.",
      "Vector, water, food, or soil — the route, not a map.",
      "The diagnostic stage: ring, cyst, egg, trophozoite, or microfilaria.",
      "The stage a drug kills, which may not be the stage you diagnose.",
    ]);
    add("full-image", `Blood film or stool finding in ${t}`, [
      "What must be in the figure for it to be this parasite and not a stain artefact.",
      "Species or stage features a first-year is expected to point at.",
      "The lookalike (platelet, yeast, pollen, other species).",
      "How many fields, or which concentration method, before you call it negative.",
    ]);
  } else if (focus.kind === "method") {
    add("content", `What ${t} actually detects`, [
      "Antigen, nucleic acid, activity, colony, or sequence — pick one.",
      "The positive control that makes a band or a well believable.",
      "The negative control that catches contamination.",
      "A result that looks real and is an artefact.",
    ]);
    add("two-column", `${t}: when it decides, and when it does not`, [
      "The decision this result is allowed to change",
      "Turnaround versus the bedside or the process clock",
      "What you still confirm with culture or a second method",
      "A false positive students will trust",
      "A false negative the specimen causes",
      "The sentence you will not let a poster claim",
    ]);
  } else if (focus.kind === "process") {
    add("content", `Inputs and the slow step of ${t}`, [
      "The molecules or cells that must meet before anything happens.",
      "Substrate in, product out, and the unit.",
      "The rate-limiting step and the graph that would show it.",
      "One inhibitor, mutation, or process fault that stops it.",
    ]);
    add("content", `Failure signature of ${t}`, [
      "What the curve, plate, or chromatogram looks like when it fails.",
      "Contamination, shear, oxygen, phage, or the wrong pH — the realistic one.",
      "The control you would not skip.",
      "What you repeat, and what you throw away.",
    ]);
  } else if (focus.kind === "alga" || focus.kind === "archaeon") {
    add("content", `Why ${t} is not the nearest lookalike`, [
      `${t} sits in ${home}. Name the pigment, lipid, or wall that proves it.`,
      "The niche: light, salt, heat, methane, or a bloom.",
      "Why a Gram stain is the wrong first test.",
      "The biotech or environmental reason this hour exists.",
    ]);
  } else {
    add("content", `Working definition of ${t}`, [
      `One sentence a marker could score, using only words that belong to ${t}.`,
      "Molecule, cell, population, or ecosystem — the scale of this hour.",
      "The nearest term students will swap in.",
      "The noun that is allowed on the exam script.",
    ]);
    add("content", `Bench test that belongs to ${t}`, [
      "The first method you would actually run in this department.",
      "What a negative result does not rule out.",
      "The confirmatory method, and which one changes a decision.",
      "The figure you will accept, with a scale bar or labelled axes.",
    ]);
  }
  return rows.map(([layout, title, bullets]) =>
    layout === "two-column"
      ? slide(layout, title, [], `Kind-specific beat for ${t}. Do not reuse another topic’s figure.`, {
          left: bullets.slice(0, 3),
          right: bullets.slice(3),
        })
      : slide(layout, title, bullets, `Kind-specific beat for ${t} in ${home}.`),
  );
}

export function topicCoreSlides(topic: string, discipline: string, level: Level, notes?: string): Slide[] {
  const focus = inferFocus(topic, discipline);
  const t = focus.topic || discipline || "this subject";
  const home = focus.discipline || discipline || "General Microbiology";
  const senior = level === "Graduate" || level === "PhD / research seminar" || level === "Medical school";
  const brief = notes?.trim() ? `Use the instructor note: ${notes.trim().slice(0, 140)}` : `Stay on ${t}. Do not import another lecture’s example.`;
  const voice = senior
    ? "Name the evidence and the control, not a textbook slogan."
    : "Define the term, then show the bench observation a first-year can mark.";

  const identity = identityBullets(focus, t);
  const see = visibilityBullets(focus, t);
  const mechanism = mechanismBullets(focus, t);
  const decision = decisionBullets(focus, t);

  const shared = [
    slide("content", `Place ${t} in microbiology`, [
      `${t} belongs in ${home}. Say the domain, group, or process class before any story.`,
      identity[0],
      `Scale for this hour: molecule, cell, population, or ecosystem — pick one and stay there.`,
      `Nearest lookalike students will confuse with ${t}, and the one feature that separates them.`,
    ], voice),
    slide("content", `How ${t} is made visible`, see, `Method before narrative. ${brief}`),
    slide("two-column", `${t}: what it is, and what it is not`, [], "Fill the right column from a student guess.", {
      left: [`Working definition of ${t}`, identity[1], "Shared jargon with the lookalike"],
      right: ["The discriminating test or structure", "What a negative result does not rule out", "The exam sentence"],
    }),
    slide("content", `Mechanism that actually runs ${t}`, mechanism, senior ? "Contest one step that is inferred, not shown." : "One step, one observable."),
    slide("full-image", `Figure contract for ${t}`, [
      `The figure must show ${t} — stain, plate, film, cycle, or curve — not a generic microbe.`,
      see[1],
      "Write one exam question whose answer is on this figure.",
      "Say what would be absent in the negative control.",
    ], "Ninety seconds on the figure, then silence."),
    slide("content", `Bench decision on ${t}`, decision, "Walk the workflow out loud."),
    slide("content", `Numbers worth knowing for ${t}`, numberBullets(focus, t), "Order of magnitude, with units. Do not invent a prevalence."),
    slide("content", `Where ${t} lives when the lab is closed`, habitatBullets(focus, t), "Pathogenesis is ecology with a host, or a process with a reactor."),
    slide("two-column", `${t}: classical bench vs molecular`, [], "Both stay in the course.", {
      left: ["Stain, culture, or direct look", "What that method still catches", "The slow or cheap control"],
      right: ["NAAT, antigen, sequence, or activity assay", "What a sequence cannot say about viability", `When ${t} still needs the old method`],
    }),
    slide("content", `Failure modes peculiar to ${t}`, [
      `The artefact that makes students think they have seen ${t} when they have not.`,
      decision[2],
      "Contamination, inhibitor, or wrong specimen — name the realistic one.",
      "What you repeat, and what you throw away.",
    ], "Failure is a teaching gift."),
    slide("content", `Control, treatment, or stewardship of ${t}`, controlBullets(focus, t), "No unnamed wonder drug. Name the class or the intervention."),
    slide("content", `Evidence standard for ${t}`, [
      "Who first showed it, what they measured, and what the control was.",
      senior ? "Which part of that evidence would fail a modern methods review?" : "What a student can cite without guessing a number.",
      `A current consensus on ${t}, and one point that is still contested.`,
      brief,
    ], "Cite on this slide. Live PubMed hits attach when the archive answers."),
    slide("content", `Biosafety and honesty around ${t}`, [
      `Exposure route that actually matters for ${t}, not a BSL number in isolation.`,
      "What this teaching lab will not culture, amplify, or claim.",
      "Whose figure this is, and the licence, before it goes on a slide.",
      "One claim you will not let a poster over-state.",
    ], "Safety is a slide."),
    slide("full-image", `Life cycle, pathway, or workflow of ${t}`, [
      "Number the steps. Mark the rate-limiting one.",
      identity[2],
      "Circle the step a knockout, inhibitor, or process fault breaks.",
      "Cross out the step you would never skip.",
    ], "Schematic, then ask one student to narrate it."),
    slide("content", `Lookalikes and exam traps for ${t}`, [
      `The organism, pathway, or term next to ${t} that costs a mark.`,
      "The unit, stain, temperature, or atmosphere students swap.",
      "A true statement that is not the answer to the question asked.",
      `One question you will set on ${t}, with the marking point.`,
    ], "Write the question before the last week."),
    slide("content", `A practical hour on ${t}`, [
      "Hypothesis in one line, using this topic’s own words.",
      "Independent variable, dependent variable, and the control that is not optional.",
      see[0],
      "The figure you would accept, including axes or a scale bar.",
    ], level === "Undergraduate" ? "Four minutes of silent planning." : "Ask what would falsify the hypothesis."),
  ];
  return [...kindSlides(focus, t, home), ...shared];
}

function identityBullets(focus: TopicFocus, t: string): string[] {
  switch (focus.kind) {
    case "bacterium":
      return [
        `Gram reaction, shape, and arrangement of ${t} — say them in that order.`,
        "Spore, capsule, flagellum, or biofilm: which structure changes the practical?",
        "Cell wall or membrane target a student could point to on a diagram.",
      ];
    case "virus":
      return [
        `Is ${t} DNA or RNA, enveloped or naked, and which Baltimore class?`,
        "The cell it must enter, and the receptor story if one is established.",
        "Capsid versus envelope: which one a detergent or a vaccine actually hits.",
      ];
    case "fungus":
      return [
        `Yeast, mould, or dimorphic — the form ${t} takes at 25 °C and at 37 °C.`,
        "Hyphae, pseudohyphae, spore, or yeast cell: the structure on the slide.",
        "Ergosterol membrane or cell-wall glucan: the drug target, if treatment is in scope.",
      ];
    case "parasite":
      return [
        `Protozoan or helminth, and the life-cycle stage of ${t} that infects people.`,
        "Vector, water, food, or soil — the route, not a continent.",
        "The diagnostic stage (trophozoite, cyst, egg, microfilaria, ring form).",
      ];
    case "alga":
      return [
        `${t} as a photosynthetic microbe: pigment, and why it is not a plant in this course.`,
        "Unicell, filament, or colony.",
        "The bloom or biotech use that makes it worth a lecture.",
      ];
    case "archaeon":
      return [
        `${t} is not a bacterium: ether lipids, and a wall that is not peptidoglycan.`,
        "The extreme or the metabolism (methane, salt, heat) that defines the niche.",
        "Why 16S, not a Gram stain, is how you would place it.",
      ];
    case "method":
      return [
        `What ${t} detects: antigen, nucleic acid, activity, colony, or sequence.`,
        "The control that makes a positive believable.",
        "The artefact that looks like a result.",
      ];
    case "process":
      return [
        `The molecules or cells that must meet for ${t} to start.`,
        "The rate-limiting step and the graph that would show it.",
        "One inhibitor, mutation, or process fault that stops it.",
      ];
    default:
      return [
        `A one-sentence operational definition of ${t} a first-year could mark.`,
        `The structure, organism, or step that ${t} is actually about.`,
        "What it is not — the confusion this class walks in with.",
      ];
  }
}

function visibilityBullets(focus: TopicFocus, t: string): string[] {
  switch (focus.kind) {
    case "bacterium":
      return [
        `First-line stain and medium for ${t}, including atmosphere and temperature.`,
        "Colony or Gram picture you expect, and the colony that means contamination.",
        "MALDI-TOF, biochemical panel, or 16S — which one confirms, and what it cannot say.",
        "Biosafety of the culture you are willing to open in a teaching lab.",
      ];
    case "virus":
      return [
        `${t} is not seen on Gram stain. Name the method: culture, antigen, NAAT, or EM.`,
        "What a positive NAAT does not prove about replication or infectious virus.",
        "The specimen and the transport that keep the genome or the particle intact.",
        "A false positive from contamination, and a false negative from timing.",
      ];
    case "fungus":
      return [
        `KOH, lactophenol cotton blue, Gram, or chrome agar — the first look for ${t}.`,
        "Culture is slower than bacteria; say the medium and the days.",
        "What a contaminant mould looks like next to the pathogen.",
        "When antigen or PCR is used because culture is too slow or too dangerous.",
      ];
    case "parasite":
      return [
        `The specimen for ${t}: blood film, stool, urine, or tissue — and the time of day if it matters.`,
        "Thick versus thin, or concentration versus direct wet mount.",
        "Antigen or PCR as confirmation, not as a replacement for seeing the stage.",
        "The lookalike cyst, egg, or artefact on the same slide.",
      ];
    case "method":
      return [
        `Inputs, instrument, and readout for ${t}.`,
        "Positive, negative, and blank — what each rules out.",
        "The unit of the result, and the cutoff you would not invent.",
        "The contamination or inhibitor story students miss.",
      ];
    default:
      return [
        `The first method that made ${t} visible, and the method you would use this term.`,
        "What a negative result does, and does not, rule out.",
        "Pair a rapid method with a confirmatory method.",
        "One contamination or matrix trap.",
      ];
  }
}

function mechanismBullets(focus: TopicFocus, t: string): string[] {
  switch (focus.kind) {
    case "virus":
      return [
        `Attachment, entry, replication, and exit for ${t} — four steps, in order.`,
        "Where the genome is copied, and which viral protein is the famous drug or vaccine target.",
        "Cytopathic effect, latency, or integration — which one this virus uses.",
        "How that step would look in a culture well or a genome graph.",
      ];
    case "parasite":
      return [
        `Invasion or the life-cycle transition that defines disease in ${t}.`,
        "The stage that is killed by the drug, and the stage that is not.",
        "Immune evasion or tissue site in one concrete sentence.",
        "The diagram label students swap.",
      ];
    case "fungus":
      return [
        `Morphogenesis of ${t}: the switch that changes the clinical or industrial form.`,
        "How it gets carbon and where it sits on the host or the product.",
        "A cell-wall or membrane step an azole or echinocandin would interrupt.",
        "The colony or the micrograph after that interruption.",
      ];
    case "bacterium":
      return [
        `Adhesion, toxin, invasion, or metabolic niche — the strategy ${t} actually uses.`,
        "Secreted versus structural: what a student could lose in a knockout.",
        "Growth requirement (oxygen, salt, blood, temperature) that is the mechanism in disguise.",
        "The plate or stain that proves that step happened.",
      ];
    default:
      return [
        `Name the molecules or cells that have to meet, in order, for ${t} to start.`,
        "The rate-limiting step, and the graph that would show it.",
        "One mutation, inhibitor, or fault that breaks the chain.",
        "The laboratory observable: band, colony, titre, film, or OD.",
      ];
  }
}

function decisionBullets(focus: TopicFocus, t: string): string[] {
  if (focus.setting === "industrial") {
    return [
      `Titre, yield, or productivity — which number decides success for ${t}?`,
      "Upstream versus downstream: where this hour’s failure sits.",
      "The in-process test that would have caught it yesterday.",
      "A scale-up surprise: shear, oxygen, phage, foam, or fouling.",
    ];
  }
  if (focus.setting === "food") {
    return [
      `The hurdle (pH, aw, heat, salt, competitor) that controls ${t}.`,
      "Indicator versus pathogen — do not swap them.",
      "The sampling point in the process, not a random swab story.",
      "What a plant manager can do tonight.",
    ];
  }
  if (focus.setting === "environmental") {
    return [
      `The sample (soil, water, root, reactor) that represents ${t}.`,
      "Culture versus amplicon: what each misses.",
      "The abiotic limit: O2, pH, temperature, or light.",
      "An intervention that is not a new chemical.",
    ];
  }
  return [
    `Specimen, timing, and the result that would change management of ${t}.`,
    "What you report, and what you refuse to report from one test.",
    "The confirmatory step before a clinical or process decision.",
    "Who is told the same day, and what they can do with the sentence.",
  ];
}

function numberBullets(focus: TopicFocus, t: string): string[] {
  if (focus.kind === "bacterium") {
    return [
      `Size, doubling time, or infectious dose of ${t} — an order of magnitude with the unit.`,
      "CFU versus OD: why turbidity is not cells.",
      "MIC is not a dose. Say what the number is, and what it is not.",
      "What would make the number 10-fold wrong (dilution, dead cells, biofilm).",
    ];
  }
  if (focus.kind === "virus") {
    return [
      `Particle size of ${t} versus a bacterium, so the class feels why light microscopy fails.`,
      "Genome length class, not a memorised exact count unless you are holding the paper.",
      "Ct or titre: what a 10-fold change means, and what it does not.",
      "Incubation window in days or weeks, as a range, not a single dramatic number.",
    ];
  }
  if (focus.kind === "parasite") {
    return [
      `Diagnostic threshold students mis-hear for ${t} (film, eggs per gram, antigen).`,
      "Incubation or pre-patent period as a range.",
      "A treatment interval or dose class only if you can point at a guideline, not a guess.",
      "The count that would change the slide from ‘seen’ to ‘heavy’.",
    ];
  }
  return [
    `One order of magnitude that belongs to ${t}, with its unit written on the board.`,
    "The conversion students trip on.",
    "Sketch the expected curve or count, then the failure shape.",
    "What a 10-fold error would mean for the decision.",
  ];
}

function habitatBullets(focus: TopicFocus, t: string): string[] {
  if (focus.kind === "virus") {
    return [
      `Reservoir and route for ${t}: person, animal, vector, or environment.`,
      "How long it remains infectious off a host, if that is known — otherwise say it is not assumed.",
      "Season, crowding, or immune status that changes the outcome.",
      "A surveillance action that is not ‘invent a new drug’.",
    ];
  }
  if (focus.kind === "parasite") {
    return [
      `Definitive host, intermediate host, and the stage of ${t} in each.`,
      "The environmental step (water, snail, soil, mosquito) you can interrupt.",
      "Who is at risk because of exposure, not because of a stereotype.",
      "What a travel or exposure history must include.",
    ];
  }
  return [
    `Habitat of ${t} when nobody is culturing it: host, food, soil, water, skin, or reactor.`,
    "The abiotic factor that actually limits it.",
    "One interaction — biofilm, phage, competitor, vector — that changes the result.",
    "What an environmental or clinical sample would look like.",
  ];
}

function controlBullets(focus: TopicFocus, t: string): string[] {
  if (focus.kind === "virus") {
    return [
      `Vaccine, antiviral, or exposure control — which one exists for ${t}, and which does not.`,
      "The viral step the intervention hits.",
      "Resistance or escape in one mutational sentence, if drugs are used.",
      "What you monitor after the intervention.",
    ];
  }
  if (focus.kind === "parasite") {
    return [
      `Drug class, vector control, or WASH — the intervention that matches ${t}’s life cycle.`,
      "The stage that survives the drug.",
      "Why a single dose can fail if the stage or the coverage is wrong.",
      "A resistance or programme failure you will not exaggerate.",
    ];
  }
  if (focus.kind === "fungus") {
    return [
      "Azole, echinocandin, polyene — which class, and the fungal target.",
      `Why ${t} in a biofilm or a tissue is not the same as a planktonic MIC.`,
      "Source control, not only the drug.",
      "The lab clue that treatment is failing.",
    ];
  }
  if (focus.setting === "industrial" || focus.setting === "food") {
    return [
      `Process control for ${t}: hurdle, containment, or kill step.`,
      "What you measure before you release the batch.",
      "The failure that looks like success.",
      "What this plant or this lab will not claim.",
    ];
  }
  return [
    `The drug class, vaccine, or hygiene step that is actually used against ${t}.`,
    "How resistance or escape would appear on the next sample.",
    "Stewardship: what you would not start just because the name is on the slide.",
    "Monitoring after the intervention — patient, product, or environment.",
  ];
}
