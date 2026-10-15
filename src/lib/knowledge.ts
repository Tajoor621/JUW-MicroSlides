import { inferFocus } from "./topic-engine";

export interface KnowledgeModule {
  title: string;
  bullets: string[];
  notes: string;
  keywords: string[];
}

export interface Discipline {
  name: string;
  blurb: string;
  modules: KnowledgeModule[];
}

export function suggestDiscipline(topic: string): string | null {
  const t = topic.toLowerCase();
  if (t.trim().length < 3) return null;
  const rules: Array<[RegExp, string]> = [
    [/\b(enzyme|immobil|bioreactor|downstream|biotech|titre|titer)\b/, "Industrial & Biotechnology Microbiology"],
    [/\b(food|dairy|spoilage|haccp|yoghurt|yogurt|cheese|wine|beer|silage|canning|pasteuri[sz])/, "Food & Dairy Microbiology"],
    [/\b(soil|nitrogen|nitrif|denitrif|rhizob|wastewater|biogeochem|compost|bioremediation|coliform|indicator organism)\b/, "Environmental & Soil Microbiology"],
    [/\b(plant|agri|nodule|phytophthora|xanthomonas|agrobacterium|biocontrol)\b/, "Agricultural Microbiology"],
    [/\b(qpcr|rt-?pcr|\bpcr\b|16s|plasmid|crispr|genome|operon|metagenom|sequenc|maldi|cloning|recombinant|transformation|transduction|conjugation)\b/, "Microbial Genetics & Molecular Biology"],
    [/\b(amr|antibiotic|stewardship|beta-lactam|carbapenem|esbl|vancomycin|fluoroquinolone|\bmdr\b|breakpoint|kirby)\b/, "Antimicrobial Resistance & Pharmacology"],
    [/\b(immun|antibod|complement|cytokine|antigen|\bmhc\b|opson|vaccine)\b/, "Immunology"],
    [/\b(virus|viral|influenza|\bhiv\b|herpes|phage|hepatitis|dengue|rabies|polio|measles|ebola|zika|rotavirus|norovirus|coronavirus|\bsars\b|covid|baltimore)\b/, "Virology"],
    [/\b(candida|aspergillus|fung|yeast|mould|mold|azole|mycolog|cryptococcus|histoplasma|dermatophyte|mucor|rhizopus)\b/, "Mycology"],
    [/\b(plasmodium|giardia|parasite|trypanosom|amoeb|helminth|malaria|leishmania|toxoplasma|schistosoma|ascaris|taenia|cryptosporidium|filaria)\b/, "Parasitology"],
    [/\b(alga|chlorella|cyanobacter|phycolo|diatom|spirulina)\b/, "Phycology"],
    [/\b(archaea|extremophil|halophil|thermophil)\b/, "General Microbiology"],
    [/\b(sepsis|meningitis|pneumonia|\buti\b|endocarditis|infection|virulence|clinical|tuberculosis|cholera|typhoid|diphtheria|specimen)\b/, "Medical / Clinical Microbiology"],
    [/\b(staph|streptococ|bacillus|clostrid|listeria|mycobacter|neisseria|salmonella|shigella|pseudomonas|klebsiella|vibrio|helicobacter|e\.?\s*coli|enterococ|campylobacter|legionella|haemophilus|bordetella|treponema|borrelia|chlamydia|mycoplasma|corynebacterium|gram[-\s]?pos|gram[-\s]?neg|bacter)\b/, "Bacteriology"],
    [/\b(biofilm|quorum|sporulation|endospore|growth curve|koch|pasteur|microscop|sterili[sz]|autoclave|disinfectant)\b/, "General Microbiology"],
  ];
  for (const [re, name] of rules) {
    if (re.test(t)) return name;
  }
  const focus = inferFocus(topic);
  if (focus.kind === "general") return null;
  return focus.discipline;
}

export const DISCIPLINES: Discipline[] = [
  {
    name: "General Microbiology",
    blurb: "Diversity, history, and methods of studying microbes.",
    modules: [
      {
        title: "The microbial world",
        bullets: [
          "Microbes span three domains: Bacteria, Archaea, and microbial Eukarya, plus acellular viruses.",
          "They drive biogeochemical cycles, form the majority of Earth's biomass, and shape human health.",
          "Most are not pathogens; pathogenesis is a specialised ecological strategy.",
          "Scale: typical bacillus ~1–5 µm; viruses ~20–300 nm — below the light-microscope limit.",
        ],
        notes: "Open by asking students to name a microbe that is useful rather than harmful.",
        keywords: ["diversity", "domains", "overview"],
      },
      {
        title: "Founders and Koch's postulates",
        bullets: [
          "Leeuwenhoek (1670s) first reported 'animalcules' with simple lenses.",
          "Pasteur refuted spontaneous generation (swan-neck flask) and developed pasteurisation.",
          "Koch linked specific microbes to anthrax, TB, and cholera; his postulates still structure causal inference.",
          "Molecular Koch's postulates (Falkow) adapt the logic to virulence genes that cannot always be cultured.",
        ],
        notes: "Contrast culture-based vs sequence-based causality; mention H. pylori as a postulate success story.",
        keywords: ["history", "koch", "pasteur"],
      },
      {
        title: "Microscopy toolkit",
        bullets: [
          "Bright-field + stains: Gram, acid-fast, endospore — cheap, fast, still first-line.",
          "Phase contrast and DIC visualise live unstained cells; fluorescence tags specific molecules.",
          "SEM for surface topography; TEM for ultrastructure and viral particles.",
          "Resolution is limited by wavelength; electron microscopy reaches nanometre scale.",
        ],
        notes: "Show a side-by-side of Gram stain vs SEM of the same organism if media is attached.",
        keywords: ["microscopy", "gram", "tem", "sem"],
      },
      {
        title: "Growth and nutrition",
        bullets: [
          "Batch-culture phases: lag, exponential, stationary, death — plot as log CFU vs time.",
          "Obligate aerobes, facultative anaerobes, aerotolerant, microaerophiles, obligate anaerobes.",
          "Psychrophiles to hyperthermophiles; halophiles and acidophiles expand habitable niches.",
          "Defined vs complex media; selective and differential plates (MacConkey, blood agar, MSA).",
        ],
        notes: "Have students predict which plate a coliform would grow on and why.",
        keywords: ["growth", "media", "oxygen", "nutrition"],
      },
    ],
  },
  {
    name: "Cell Biology & Biochemistry",
    blurb: "Prokaryotic architecture and core metabolism.",
    modules: [
      {
        title: "Prokaryotic cell plan",
        bullets: [
          "No nucleus: nucleoid is a condensed, membrane-free DNA region with HU/H-NS proteins.",
          "70S ribosomes (30S + 50S) are both the translation machine and a major antibiotic target.",
          "Inclusions (PHB, glycogen, sulphur, magnetosomes) store energy or sense fields.",
          "Cytoskeletal homologues (FtsZ, MreB, crescentin) organise division and shape.",
        ],
        notes: "Stress that 'simple' cells still spatially organise metabolism.",
        keywords: ["cell", "nucleoid", "ribosome"],
      },
      {
        title: "Envelope architecture",
        bullets: [
          "Gram-positive: thick peptidoglycan + teichoic acids; retains crystal violet.",
          "Gram-negative: thin PG in periplasm + outer membrane with LPS (endotoxin).",
          "Mycobacteria: mycolic-acid arabinogalactan wall — acid-fast, intrinsically drug-resistant.",
          "Peptidoglycan is a β-1,4 GlcNAc–MurNAc glycan cross-linked by peptides; β-lactams block the transpeptidase.",
        ],
        notes: "Draw the two envelopes side by side. Mention LPS lipid A as the shock-inducing moiety.",
        keywords: ["cell wall", "gram", "lps", "peptidoglycan"],
      },
      {
        title: "Central metabolism",
        bullets: [
          "Embden–Meyerhof glycolysis vs Entner–Doudoroff vs pentose phosphate — not all bacteria use EMP.",
          "Respiration: NADH → ETC → PMF → ATP synthase; terminal acceptor can be O2, nitrate, sulphate.",
          "Fermentation regenerates NAD+ when respiration is unavailable; products fingerprint species.",
          "Anaplerosis and glyoxylate shunt let cells grow on two-carbon substrates.",
        ],
        notes: "Connect fermentation products to food microbiology (yoghurt, kimchi) and diagnostics (TSI).",
        keywords: ["metabolism", "glycolysis", "fermentation", "respiration"],
      },
    ],
  },
  {
    name: "Microbial Genetics & Molecular Biology",
    blurb: "Genomes, gene flow, and regulation.",
    modules: [
      {
        title: "Genome organisation",
        bullets: [
          "Most bacteria have a single circular chromosome; secondary chromosomes and megaplasmids occur.",
          "Operons co-transcribe related genes (lac, trp) — an economy of regulation.",
          "Plasmids, transposons, and integrons mobilise resistance and virulence.",
          "Typical E. coli genome ~4.6 Mb / ~4,300 ORFs; some endosymbionts are <200 kb.",
        ],
        notes: "Show a plasmid map of a clinical blaCTX-M plasmid if discussing AMR later.",
        keywords: ["genome", "plasmid", "operon"],
      },
      {
        title: "Horizontal gene transfer",
        bullets: [
          "Transformation: uptake of naked DNA; competence is regulated (e.g. CSP in streptococci).",
          "Transduction: bacteriophage packages host DNA — specialised vs generalised.",
          "Conjugation: type-IV secretion of plasmid DNA through a pilus; F and Hfr strains.",
          "HGT plus selection is the engine of rapid AMR spread, not point mutation alone.",
        ],
        notes: "Luria–Delbrück as the mutation story; conjugation as the ecology story.",
        keywords: ["hgt", "conjugation", "phage", "transformation"],
      },
      {
        title: "Regulation in a changing world",
        bullets: [
          "Lac operon: CAP-cAMP activation + LacI repression — a two-input AND-like logic.",
          "Two-component systems (sensor HK + response regulator) sense osmolarity, phosphate, quorum signals.",
          "σ factors reprogram RNAP (σ70 housekeeping, σ32 heat shock, σS stationary, σ54 nitrogen).",
          "CRISPR-Cas is adaptive immunity against phage and a programmable editing tool.",
        ],
        notes: "If time, sketch why IPTG induces lac even though it is not metabolised.",
        keywords: ["regulation", "operon", "sigma", "crispr"],
      },
    ],
  },
  {
    name: "Biostatistics & Research Methods",
    blurb: "Designing, analysing, and reporting micro experiments.",
    modules: [
      {
        title: "Experimental design",
        bullets: [
          "Define the biological unit of replication (culture, animal, patient) — technical repeats are not n.",
          "Randomise treatment assignment; blind plate counts where feasible.",
          "Power: a 2-fold CFU difference with high variance needs more than triplicate flasks.",
          "Include vehicle, time-matched, and strain-background controls; pre-register the analysis plan.",
        ],
        notes: "Walk through a failed 'n=3 wells of the same plate' example.",
        keywords: ["design", "replication", "controls"],
      },
      {
        title: "Analysing microbial data",
        bullets: [
          "CFU and OD are log-distributed; analyse log10 CFU, not raw counts.",
          "t-test / ANOVA after checking residuals; nonparametric (Mann–Whitney, Kruskal–Wallis) if not.",
          "Multiple comparisons: Tukey or Benjamini–Hochberg, never a pile of uncorrected t-tests.",
          "For 16S/metagenomics: compositionality (CLR), rarefaction vs coverage, and batch effect.",
        ],
        notes: "Show a volcano plot vs a bar chart of p-values and ask which is more honest.",
        keywords: ["statistics", "cfu", "p-value", "metagenomics"],
      },
      {
        title: "Reporting and reproducibility",
        bullets: [
          "Report media, lot, incubator set-point, and strain identifiers (ATCC / DSM).",
          "MIQE-like discipline for qPCR: efficiencies, no-RT controls, reference-gene validation.",
          "Deposit reads (SRA) and assemblies (GenBank); share analysis notebooks.",
          "ARRIVE / STROBE / PRISMA depending on animal, observational, or review work.",
        ],
        notes: "Point students at a journal's data-availability policy.",
        keywords: ["reproducibility", "reporting", "qpcr"],
      },
    ],
  },
  {
    name: "Bacteriology",
    blurb: "Structure, physiology, and pathogenesis of bacteria.",
    modules: [
      {
        title: "Morphology and arrangement",
        bullets: [
          "Cocci, bacilli, vibrios, spirilla, spirochaetes; arrangements (staphylo-, strepto-, diplo-) reflect division planes.",
          "Shape is not taxonomy: morphology is a starting ID clue, never a species name.",
          "Cell wall plus cytoskeleton set the default shape; L-forms and spheroplasts lose it.",
          "Motility: flagella (run-tumble), twitching pili, gliding; not all motile genera are Gram-negative.",
        ],
        notes: "Quiz: which arrangement would a random-plane coccus produce?",
        keywords: ["morphology", "cocci", "bacilli", "flagella"],
      },
      {
        title: "Gram-positive pathogens",
        bullets: [
          "Staphylococci: catalase-positive clusters; S. aureus = coagulase+, protein A, toxins, MRSA SCCmec.",
          "Streptococci: catalase-negative chains; lancefield groups; S. pyogenes SPE superantigens.",
          "Clostridia: anaerobic spore-formers; botulinum, tetanus, difficile toxins.",
          "Listeria: intracellular, actin comet tails, cold-tolerant foodborne risk in pregnancy.",
        ],
        notes: "Clinical vignette: post-influenza pneumonia → think S. aureus.",
        keywords: ["staph", "strep", "mrsa", "clostridium", "gram-positive"],
      },
      {
        title: "Gram-negative pathogens",
        bullets: [
          "Enterobacterales: E. coli pathotypes (ETEC, EHEC/STEC, UPEC); Salmonella, Shigella, Klebsiella.",
          "LPS lipid A drives septic shock; capsule and siderophores are key virulence factors.",
          "Pseudomonas: opportunistic, biofilm, efflux-driven MDR in burns and CF lung.",
          "Neisseria, Haemophilus, Bordetella: fastidious diplococci/coccobacilli of mucosal surfaces.",
        ],
        notes: "Highlight EHEC Shiga toxin and why antibiotics can worsen HUS.",
        keywords: ["gram-negative", "e.coli", "lps", "pseudomonas", "salmonella"],
      },
      {
        title: "Pathogenesis sequence",
        bullets: [
          "Exposure → adhesion (pili, MSCRAMMs) → invasion or colonisation → immune evasion → damage.",
          "Exotoxins: AB toxins (diphtheria, cholera, tetanus), superantigens, type-III secreted effectors.",
          "Endotoxin is LPS; it is not secreted on purpose — it is released on lysis.",
          "Biofilms on devices create a diffusion-limited, persister-rich community.",
        ],
        notes: "Map each step to a possible vaccine or drug intervention.",
        keywords: ["pathogenesis", "toxin", "biofilm", "adhesion"],
      },
    ],
  },
  {
    name: "Virology",
    blurb: "Structure, replication, and viral disease.",
    modules: [
      {
        title: "Virion architecture",
        bullets: [
          "Capsid symmetry: icosahedral, helical, or complex (pox, T4).",
          "Enveloped viruses steal host membrane and are more detergent-sensitive; naked viruses persist on surfaces.",
          "Baltimore classes I–VII organise viruses by genome and mRNA strategy, not by disease.",
          "Segmented genomes (influenza, rotavirus) enable reassortment and antigenic shift.",
        ],
        notes: "Use influenza HA/NA as the envelope-glycoprotein example.",
        keywords: ["capsid", "envelope", "baltimore", "influenza"],
      },
      {
        title: "Replication cycle",
        bullets: [
          "Attachment to a specific receptor (sialic acid, ACE2, CD4/CCR5) determines tropism.",
          "Entry by fusion or endocytosis → uncoating → genome expression → assembly → release.",
          "DNA viruses often use the nucleus; most RNA viruses replicate in the cytoplasm (influenza is an exception).",
          "Retroviruses reverse-transcribe and integrate; latency is a therapeutic problem, not just a curiosity.",
        ],
        notes: "Pause on why acyclovir is selective for herpes-infected cells (viral TK).",
        keywords: ["replication", "tropism", "hiv", "herpes"],
      },
      {
        title: "Pathogenesis and vaccines",
        bullets: [
          "Acute (influenza), chronic (HBV, HCV), latent (herpesviruses), transforming (HPV, EBV).",
          "Cytopathic effect, inclusion bodies, and cytokine storm are distinct damage modes.",
          "Live-attenuated, inactivated, subunit, VLP, and mRNA platforms — trade-off of immunogenicity vs safety.",
          "Antivirals target entry, polymerase, integrase, protease, or neuraminidase — resistance follows monotherapy.",
        ],
        notes: "Current schedule: HBV, HPV, influenza, MMR, polio, COVID mRNA as examples.",
        keywords: ["vaccine", "latency", "antiviral", "hpv"],
      },
    ],
  },
  {
    name: "Mycology",
    blurb: "Yeasts, moulds, and antifungal strategy.",
    modules: [
      {
        title: "Fungal cell biology",
        bullets: [
          "Ergosterol (not cholesterol) in membranes; β-glucan and chitin in walls — both are drug targets.",
          "Yeasts (unicellular budding) vs moulds (hyphae, septate or coenocytic) vs dimorphs (blastomyces, histo).",
          "Spores: conidia (asexual) vs sexual ascospores/basidiospores — ecology and lab ID.",
          "Eukaryotic machinery means antifungals have a narrower therapeutic index than antibacterials.",
        ],
        notes: "Show a lactophenol cotton-blue tape mount vs a Gram stain of yeast.",
        keywords: ["yeast", "hyphae", "ergosterol", "dimorphic"],
      },
      {
        title: "Clinical mycoses",
        bullets: [
          "Superficial/cutaneous: dermatophytes (Trichophyton, Microsporum) and Malassezia.",
          "Opportunistic: Candida (mucosa, candidemia), Aspergillus (neutropenic lung), Cryptococcus (meningitis, HIV).",
          "Primary dimorphic pathogens: Histoplasma, Blastomyces, Coccidioides — geography matters.",
          "Pneumocystis jirovecii is a fungus; TMP-SMX remains first-line prophylaxis in low CD4.",
        ],
        notes: "A travel history plus cave exposure should trigger histo/blasto on the differential.",
        keywords: ["candida", "aspergillus", "crypto", "dermatophyte"],
      },
      {
        title: "Antifungal classes",
        bullets: [
          "Polyenes (amphotericin B) bind ergosterol and punch pores; nephrotoxicity drives lipid formulations.",
          "Azoles inhibit 14α-demethylase (ERG11); resistance via efflux and target mutation is rising.",
          "Echinocandins inhibit β-1,3-glucan synthase — first-line for invasive candidiasis.",
          "Flucytosine is never monotherapy; allylamines (terbinafine) for dermatophytes.",
        ],
        notes: "C. auris as the MDR yeast that broke automatic fluconazole assumptions.",
        keywords: ["azole", "amphotericin", "echinocandin", "resistance"],
      },
    ],
  },
  {
    name: "Phycology",
    blurb: "Algae, cyanobacteria, and aquatic primary producers.",
    modules: [
      {
        title: "Who counts as an alga",
        bullets: [
          "Algae are a polyphyletic set of photosynthetic eukaryotes; cyanobacteria are bacterial phototrophs.",
          "Pigment suites: chlorophyll a/b (green), a/c + fucoxanthin (brown/diatoms), phycoerythrin (red, cyanobacteria).",
          "Habitats from snow algae to intertidal kelp forests and open-ocean Prochlorococcus.",
          "Secondary endosymbiosis explains chloroplast diversity (euglenids, dinoflagellates, diatoms).",
        ],
        notes: "Clarify cyanobacteria are not algae, even if water-quality labs still say 'blue-green algae'.",
        keywords: ["algae", "cyanobacteria", "chloroplast", "pigment"],
      },
      {
        title: "Ecology and toxins",
        bullets: [
          "Harmful algal blooms (Karenia, Alexandrium) produce brevetoxins and saxitoxin.",
          "Cyanotoxins: microcystin (hepatotoxin), anatoxin-a, cylindrospermopsin — monitor drinking water.",
          "Eutrophication (N and P) plus warmth predicts bloom risk.",
          "Diatoms build silica frustules and dominate marine primary production and palaeo-records.",
        ],
        notes: "Local water-authority HAB reports make a good live example.",
        keywords: ["bloom", "toxin", "microcystin", "diatom"],
      },
      {
        title: "Applied phycology",
        bullets: [
          "Spirulina / Chlorella as protein; agar and alginate as gelling agents from red/brown algae.",
          "Algal biofuels remain a research target; lipid yield vs land-use is the constraint.",
          "Wastewater polishing: algae take up N/P and can be harvested.",
          "Coral bleaching is a breakdown of the dinoflagellate (Symbiodiniaceae) symbiosis.",
        ],
        notes: "Connect agar back to the bacteriology lab they already use.",
        keywords: ["agar", "spirulina", "biofuel", "symbiosis"],
      },
    ],
  },
  {
    name: "Parasitology",
    blurb: "Protozoa, helminths, and host–parasite life cycles.",
    modules: [
      {
        title: "Protozoan parasites",
        bullets: [
          "Apicomplexans: Plasmodium (malaria), Toxoplasma, Cryptosporidium — apical complex for invasion.",
          "Flagellates: Giardia, Trichomonas, Trypanosoma, Leishmania — vectors and cysts matter.",
          "Amoebae: Entamoeba histolytica vs non-pathogenic look-alikes; Naegleria in warm freshwater.",
          "Diagnosis still leans on microscopy of stool, blood films, and now antigen/PCR panels.",
        ],
        notes: "Thick and thin films: thick for screening, thin for species ID.",
        keywords: ["malaria", "giardia", "plasmodium", "protozoa"],
      },
      {
        title: "Helminths",
        bullets: [
          "Nematodes (roundworms): Ascaris, hookworm, Strongyloides, filariae — soil-transmitted vs vector-borne.",
          "Cestodes (tapeworms): Taenia solium cysticercosis is a leading acquired epilepsy cause.",
          "Trematodes (flukes): Schistosoma uses snails; eggs, not worms, drive pathology.",
          "Eosinophilia is a clue for tissue-invasive helminths, not for giardiasis.",
        ],
        notes: "Life-cycle diagrams beat bullet lists — sketch snail → cercaria → skin.",
        keywords: ["helminth", "schistosoma", "ascaris", "taenia"],
      },
      {
        title: "Control",
        bullets: [
          "Mass drug administration (albendazole, praziquantel, ivermectin) plus WASH.",
          "Vector control: bed nets, indoor residual spray, larval source management.",
          "Vaccines: RTS,S and R21 malaria vaccines are the first licensed parasitic vaccines.",
          "Immunocompromise unmasks Strongyloides hyperinfection and toxoplasma encephalitis.",
        ],
        notes: "Emphasise that 'tropical' parasites travel with patients; take a migration history.",
        keywords: ["mda", "vector", "vaccine", "malaria"],
      },
    ],
  },
  {
    name: "Medical / Clinical Microbiology",
    blurb: "From specimen to report in the diagnostic lab.",
    modules: [
      {
        title: "The diagnostic pathway",
        bullets: [
          "Right specimen, right time, right container: blood culture before antibiotics; sputum not saliva.",
          "Pre-analytical error (labelling, delay, wrong site) ruins more results than the bench does.",
          "Work-up: Gram stain → culture → ID (MALDI-TOF / biochemical) → AST.",
          "Turnaround: stain hours, culture 18–72 h, mycobacteria weeks unless molecular.",
        ],
        notes: "Show a mislabelled blood-culture horror story; students remember it.",
        keywords: ["specimen", "culture", "maldi", "diagnostic"],
      },
      {
        title: "Stains and media",
        bullets: [
          "Gram stain algorithm: crystal violet → iodine → decolourise → safranin.",
          "Acid-fast (Ziehl–Neelsen, auramine) for mycobacteria and Nocardia (partial).",
          "Blood agar (haemolysis), MacConkey (lactose), chocolate (fastidious), CLED, Sabouraud.",
          "Anaerobic work needs proper transport (gassed vials, not a dry swab in air).",
        ],
        notes: "Live demo of haemolysis types if a lab session follows.",
        keywords: ["gram stain", "media", "blood agar", "acid-fast"],
      },
      {
        title: "AST and reporting",
        bullets: [
          "Kirby–Bauer disk diffusion and broth microdilution MIC; EUCAST/CLSI breakpoints.",
          "Report as S / I / R with the method and standard cited; cascade reporting protects last-line agents.",
          "Rapid molecular panels (blood, meningitis, GI) change sepsis minutes, not days.",
          "Infection-prevention flags: CPE, MRSA, VRE, C. auris — isolate and notify.",
        ],
        notes: "Discuss why an MIC is not a dose, and PK/PD (fT>MIC, AUC/MIC) sits on top.",
        keywords: ["ast", "mic", "breakpoint", "mrsa"],
      },
    ],
  },
  {
    name: "Immunology",
    blurb: "Innate and adaptive defence against microbes.",
    modules: [
      {
        title: "Innate immunity",
        bullets: [
          "Barriers: epithelium, mucus, acid, commensal colonisation resistance.",
          "PRRs (TLRs, NLRs, RLRs, CLRs) recognise PAMPs/DAMPs and fire NF-κB / IRF programmes.",
          "Phagocytes and complement (classical, lectin, alternative) opsonise and lyse.",
          "Inflammation is protective until it is not — sepsis is dysregulated innate immunity.",
        ],
        notes: "TLR4–LPS is the canonical pairing; TLR3/7/8/9 sense nucleic acids.",
        keywords: ["innate", "tlr", "complement", "phagocyte"],
      },
      {
        title: "Adaptive immunity",
        bullets: [
          "Clonal selection of B and T cells with somatically diversified receptors.",
          "MHC I → CD8 cytotoxic; MHC II → CD4 helper (Th1, Th2, Th17, Tfh, Treg).",
          "Antibodies: IgM first, class-switch to IgG/A/E; neutralisation, opsonisation, ADCC.",
          "Memory is why vaccines work; original antigenic sin is why some boosters disappoint.",
        ],
        notes: "Draw a CD4 Th1 vs Th2 fork with IFN-γ vs IL-4.",
        keywords: ["adaptive", "mhc", "antibody", "t cell"],
      },
      {
        title: "Host–pathogen immunology",
        bullets: [
          "Intracellular bacteria (TB, Listeria, Salmonella) require Th1 / granuloma programmes.",
          "Capsular polysaccharides are T-independent unless conjugated to protein (Hib, pneumococcal conjugate).",
          "Antigenic variation (trypanosomes, influenza drift/shift, N. gonorrhoeae pili) outruns memory.",
          "Hypersensitivity and autoimmunity are the cost of a powerful adaptive system.",
        ],
        notes: "Conjugate vs polysaccharide vaccine is a high-yield exam contrast.",
        keywords: ["vaccine", "granuloma", "antigenic variation"],
      },
    ],
  },
  {
    name: "Antimicrobial Resistance & Pharmacology",
    blurb: "How antimicrobials work — and how microbes stop them.",
    modules: [
      {
        title: "Major antibacterial classes",
        bullets: [
          "Cell wall: β-lactams (penicillins, cephalosporins, carbapenems, monobactams) and glycopeptides.",
          "Protein synthesis: aminoglycosides, tetracyclines, macrolides, oxazolidinones, chloramphenicol.",
          "Nucleic acid: fluoroquinolones (DNA gyrase), rifamycins (RNAP), metronidazole, sulfa/trimethoprim.",
          "Membrane: polymyxins, daptomycin — last-line for many MDR Gram-negatives / MRSA.",
        ],
        notes: "A one-page 'target cartoon' of the bacterial cell is worth ten lists.",
        keywords: ["beta-lactam", "antibiotic", "aminoglycoside", "quinolone"],
      },
      {
        title: "Resistance mechanisms",
        bullets: [
          "Enzymatic destruction: β-lactamases (ESBL, AmpC, carbapenemases KPC/NDM/OXA-48).",
          "Target modification: mecA PBP2a (MRSA), vanA D-Ala-D-Lac (VRE), gyrA mutations.",
          "Efflux and porin loss drop periplasmic concentration, especially in Pseudomonas and Acinetobacter.",
          "Biofilm + persisters produce phenotypic tolerance without a resistance gene.",
        ],
        notes: "Distinguish resistance (heritably higher MIC) from tolerance/persistence.",
        keywords: ["mrsa", "esbl", "carbapenemase", "efflux", "amr"],
      },
      {
        title: "Stewardship",
        bullets: [
          "Right drug, dose, duration, de-escalation; send cultures before the first dose when safe.",
          "PK/PD: time-dependent β-lactams vs concentration-dependent aminoglycosides/quinolones.",
          "One Health: farm, wastewater, and hospital effluent share a resistome.",
          "New agents are rare; preserve cefiderocol, novel β-lactam/inhibitor combos, and anti-TB pipelines.",
        ],
        notes: "Local antibiogram should drive empiric policy, not a US textbook table.",
        keywords: ["stewardship", "pkpd", "one health"],
      },
    ],
  },
  {
    name: "Industrial & Biotechnology Microbiology",
    blurb: "Microbes as factories.",
    modules: [
      {
        title: "Fermentation technology",
        bullets: [
          "Stirred-tank bioreactors control pH, DO, temperature, and feed; scale-up is not linear.",
          "Primary metabolites (ethanol, citrate, amino acids) vs secondary (antibiotics, pigments).",
          "Inoculum development and contamination control dominate industrial failure modes.",
          "Downstream processing (centrifugation, filtration, chromatography) often costs more than the tank.",
        ],
        notes: "Visit a local dairy or brewery if possible — tanks make the theory concrete.",
        keywords: ["bioreactor", "fermentation", "metabolite"],
      },
      {
        title: "Products",
        bullets: [
          "Antibiotics (Penicillium, Streptomyces), industrial enzymes (amylases, proteases, cellulases).",
          "Organic acids, vitamins, and recombinant proteins (insulin, vaccines) in E. coli or CHO.",
          "Immobilised cells and enzymes improve reuse; alginate beads are the teaching example.",
          "Synthetic biology: pathway refactoring, CRISPR, cell-free systems for rapid prototyping.",
        ],
        notes: "Enzyme immobilisation is a favourite JUW practical — bind it to this lecture.",
        keywords: ["enzyme", "immobilisation", "insulin", "streptomyces"],
      },
      {
        title: "Quality and regulation",
        bullets: [
          "GMP, validation, and change control; a single phage in a production strain can halt a plant.",
          "Biosafety of GMMs: contained use vs deliberate release, auxotrophic failsafes.",
          "Life-cycle assessment: titre, yield, productivity, and feedstock ethics (food vs fuel).",
          "Strain improvement: classical mutagenesis still sits beside rational metabolic engineering.",
        ],
        notes: "Phage contamination anecdote from dairy starters is memorable.",
        keywords: ["gmp", "gmo", "quality"],
      },
    ],
  },
  {
    name: "Food & Dairy Microbiology",
    blurb: "Spoilage, safety, and fermentation of food.",
    modules: [
      {
        title: "Food as an ecosystem",
        bullets: [
          "Intrinsic factors: pH, aw, nutrients, antimicrobials, structure; extrinsic: T, gas, humidity.",
          "Hurdle technology stacks mild stresses instead of one harsh kill step.",
          "Spoilage flora vs pathogens — off-odour is not a safety assay.",
          "Psychrotrophs (Listeria, Pseudomonas) grow in the fridge; freezing stops growth, not always viability.",
        ],
        notes: "aw of jam vs fresh meat is a clean numerical example.",
        keywords: ["spoilage", "water activity", "listeria", "hurdle"],
      },
      {
        title: "Dairy cultures",
        bullets: [
          "Starter LABs: Lactococcus, Streptococcus thermophilus, Lactobacillus delbrueckii subsp. bulgaricus.",
          "Yoghurt is a defined co-culture; cheese adds ripening flora (Penicillium, Brevibacterium, propionibacteria).",
          "Bacteriophage attack on starters is the classic industrial failure in dairies.",
          "Probiotic claims require strain-level evidence, not genus-level folklore.",
        ],
        notes: "Taste yoghurt vs chemically acidified milk if running a practical.",
        keywords: ["yogurt", "lab", "starter", "cheese", "probiotic"],
      },
      {
        title: "Foodborne disease",
        bullets: [
          "Infection (Salmonella, Campylobacter, Listeria) vs intoxication (S. aureus enterotoxin, C. botulinum).",
          "STECs and the HUS risk; norovirus dominates outbreak counts in many countries.",
          "HACCP: identify CCPs (cooking, cooling, metal detection) and monitor them.",
          "Pasteurisation, UHT, irradiation, and high-pressure processing as kill steps with different sensory costs.",
        ],
        notes: "Botulism in home-canned low-acid foods is the teaching emergency.",
        keywords: ["salmonella", "staph", "haccp", "botulism"],
      },
    ],
  },
  {
    name: "Environmental & Soil Microbiology",
    blurb: "Microbes in biogeochemical cycles and bioremediation.",
    modules: [
      {
        title: "Soil microbiome",
        bullets: [
          "A gram of soil can hold 10^9 cells and thousands of taxa; most are uncultured.",
          "Rhizosphere is a carbon-rich hotspot; bulk soil is oligotrophic.",
          "Aggregates create oxic/anoxic microsites — nitrification and denitrification a millimetre apart.",
          "Mycorrhizae and Rhizobium–legume nodules are mutualisms with global N and P consequences.",
        ],
        notes: "Pass around a nodule if you can source one.",
        keywords: ["soil", "rhizosphere", "rhizobium", "mycorrhiza"],
      },
      {
        title: "Biogeochemical cycles",
        bullets: [
          "Carbon: photosynthesis, respiration, methanogenesis, methanotrophy.",
          "Nitrogen: fixation (nitrogenase, O2-shy), nitrification, anammox, denitrification.",
          "Sulphur and iron cycling by specialists (Desulfovibrio, Acidithiobacillus) reshape ores and acid mine drainage.",
          "Climate link: CH4 and N2O are microbial gases; permafrost thaw is a microbiology problem.",
        ],
        notes: "Nitrogenase + oxygen paradox explains heterocysts and leghaemoglobin.",
        keywords: ["nitrogen", "methane", "cycle", "fixation"],
      },
      {
        title: "Bioremediation and water",
        bullets: [
          "Aerobic hydrocarbon degraders (Pseudomonas, Alcanivorax) vs anaerobic dechlorinators (Dehalococcoides).",
          "Bioaugmentation vs biostimulation; bioavailability of pollutants often limits rate.",
          "Activated sludge and anaerobic digestion are engineered microbial ecosystems.",
          "Indicator organisms (E. coli, enterococci) proxy faecal risk; they are not the pathogens.",
        ],
        notes: "Local wastewater plant flow diagram is better than a generic textbook one.",
        keywords: ["bioremediation", "wastewater", "sludge", "indicator"],
      },
    ],
  },
  {
    name: "Agricultural Microbiology",
    blurb: "Plant–microbe interactions, biocontrol, and soil fertility.",
    modules: [
      {
        title: "Beneficial partners",
        bullets: [
          "Rhizobia and Frankia fix N2 in nodules; inoculant quality (CFU, strain) decides field success.",
          "Arbuscular mycorrhizal fungi extend the P-foraging network of most crops.",
          "PGPR (Azospirillum, Bacillus, Pseudomonas) produce phytohormones, siderophores, and ISR.",
          "Endophytes can be mutualists or latent pathogens — context, not taxonomy, decides.",
        ],
        notes: "Students often think 'bacteria = disease'; invert that in the first minute.",
        keywords: ["rhizobium", "pgpr", "mycorrhiza", "inoculant"],
      },
      {
        title: "Plant pathogens",
        bullets: [
          "Bacteria: Ralstonia wilt, Xanthomonas blights, Erwinia soft rot, Agrobacterium galls (and T-DNA).",
          "Fungi/oomycetes: rusts, mildews, Fusarium, Phytophthora — still the largest yield thieves.",
          "Viruses: mosaic and yellowing diseases; insect vectors and seed transmission.",
          "Quarantine, certified seed, and crop rotation remain more powerful than a new spray.",
        ],
        notes: "Agrobacterium as both a pathogen and the workhorse of plant transformation.",
        keywords: ["blight", "wilt", "agrobacterium", "phytophthora"],
      },
      {
        title: "Biocontrol and soil health",
        bullets: [
          "Bacillus thuringiensis crystal toxins; Trichoderma mycoparasitism; bacteriophage for fire blight.",
          "Overuse of copper and streptomycin in orchards selects resistance just as in hospitals.",
          "Soil organic matter feeds the microbiome that suppresses some pathogens (take-all decline).",
          "Climate stress shifts host–microbe outcomes; drought plus Fusarium is a typical synergy.",
        ],
        notes: "Bt is a chance to discuss GM crops without leaving microbiology.",
        keywords: ["biocontrol", "bt", "trichoderma", "soil health"],
      },
    ],
  },
];

export function getDiscipline(name: string): Discipline | undefined {
  return DISCIPLINES.find((d) => d.name === name);
}
