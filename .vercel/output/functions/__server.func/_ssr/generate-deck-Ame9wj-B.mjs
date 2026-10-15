import { a as wikimediaFileName, i as uid, r as mediaKey } from "./utils-BGmVEDjx.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/generate-deck-Ame9wj-B.js
var JUW = {
	name: "JUW-MicroSlides",
	version: "v6.2.1",
	crest: "/juw-crest.png",
	crestMark: "/juw-crest-256.jpg",
	deptSeal: "/juw-dept-seal.svg?v=5",
	microscope: "/juw-microscope.png?v=dept-2026",
	course: "Microbial Enzyme Technology",
	courseCode: "MIC-4511",
	preparedBy: "Ms. Noor",
	department: "Department of Microbiology"
};
function lectureMeta(partial) {
	return {
		course: partial?.course?.trim() || JUW.course,
		courseCode: partial?.courseCode?.trim() || JUW.courseCode,
		preparedBy: partial?.preparedBy?.trim() || JUW.preparedBy,
		department: partial?.department?.trim() || JUW.department
	};
}
var CANONICAL = {
	general: [{
		id: "koch1884",
		authors: "Koch R",
		title: "Die Aetiologie der Tuberkulose",
		journal: "Mitt Kaiserlichen Gesundheitsamte",
		year: "1884",
		pages: "1–88"
	}, {
		id: "woese1977",
		authors: "Woese CR, Fox GE",
		title: "Phylogenetic structure of the prokaryotic domain: the primary kingdoms",
		journal: "Proc Natl Acad Sci USA",
		year: "1977",
		volume: "74",
		pages: "5088–5090",
		doi: "10.1073/pnas.74.11.5088"
	}],
	bacteriology: [{
		id: "gram1884",
		authors: "Gram C",
		title: "Über die isolirte Färbung der Schizomyceten in Schnitt- und Trockenpräparaten",
		journal: "Fortschr Med",
		year: "1884",
		volume: "2",
		pages: "185–189"
	}, {
		id: "falkow1988",
		authors: "Falkow S",
		title: "Molecular Koch's postulates applied to microbial pathogenicity",
		journal: "Rev Infect Dis",
		year: "1988",
		volume: "10",
		pages: "S274–S276"
	}],
	virology: [{
		id: "baltimore1971",
		authors: "Baltimore D",
		title: "Expression of animal virus genomes",
		journal: "Bacteriol Rev",
		year: "1971",
		volume: "35",
		pages: "235–241"
	}],
	immunology: [{
		id: "janeway1989",
		authors: "Janeway CA Jr",
		title: "Approaching the asymptote? Evolution and revolution in immunology",
		journal: "Cold Spring Harb Symp Quant Biol",
		year: "1989",
		volume: "54",
		pages: "1–13"
	}],
	amr: [{
		id: "fleming1929",
		authors: "Fleming A",
		title: "On the antibacterial action of cultures of a penicillium, with special reference to their use in the isolation of B. influenzae",
		journal: "Br J Exp Pathol",
		year: "1929",
		volume: "10",
		pages: "226–236"
	}],
	clinical: [{
		id: "clsi",
		authors: "CLSI",
		title: "Performance Standards for Antimicrobial Susceptibility Testing",
		journal: "CLSI supplement M100",
		year: "2024"
	}]
};
function formatCitation(c, style) {
	const authors = c.authors;
	const vol = c.volume ? ` ${c.volume}` : "";
	const pages = c.pages ? `:${c.pages}` : "";
	const doi = c.doi ? ` doi:${c.doi}` : "";
	switch (style) {
		case "APA": return `${authors} (${c.year}). ${c.title}. ${c.journal},${vol}${pages}.${doi}`;
		case "Harvard": return `${authors} (${c.year}) '${c.title}', ${c.journal},${vol}${pages}.`;
		case "Nature": return `${authors}. ${c.title}. ${c.journal} ${c.volume ? c.volume + ", " : ""}${c.pages ?? ""} (${c.year}).`;
		case "AMA": return `${authors}. ${c.title}. ${c.journal}. ${c.year};${c.volume ?? ""}${pages}.`;
		default: return `${authors}. ${c.title}. ${c.journal}. ${c.year}${vol}${pages}.${doi}`;
	}
}
function seedCitations(discipline) {
	const d = discipline.toLowerCase();
	if (d.includes("bacter")) return [...CANONICAL.bacteriology];
	if (d.includes("viro")) return [...CANONICAL.virology];
	if (d.includes("immuno")) return [...CANONICAL.immunology];
	if (d.includes("antimicrobial") || d.includes("pharmac")) return [...CANONICAL.amr];
	if (d.includes("clinical") || d.includes("medical")) return [...CANONICAL.clinical];
	return [...CANONICAL.general];
}
function suggestDiscipline(topic) {
	const t = topic.toLowerCase();
	if (t.trim().length < 3) return null;
	for (const [re, name] of [
		[/\b(enzyme|immobil|ferment|bioreactor|industrial|downstream|kinetics)\b/, "Industrial & Biotechnology Microbiology"],
		[/\b(mrsa|staph|streptococ|anthrax|clostrid|listeria|bacillus|mycobacter|gram[-\s]?pos)\b/, "Bacteriology"],
		[/\b(virus|influenza|hiv|herpes|phage|viral|vaccine|baltimore)\b/, "Virology"],
		[/\b(candida|aspergillus|fung|yeast|mould|mold|azole|mycolog)\b/, "Mycology"],
		[/\b(plasmodium|giardia|parasite|trypanosom|amoeb|helminth|malaria)\b/, "Parasitology"],
		[/\b(alga|chlorella|cyanobacter|phycolo|diatom)\b/, "Phycology"],
		[/\b(immun|antibod|complement|cytokine|vaccine)\b/, "Immunology"],
		[/\b(amr|antibiotic|resist|mic\b|stewardship|beta-lactam)\b/, "Antimicrobial Resistance & Pharmacology"],
		[/\b(qpcr|rt-pcr|pcr|16s|plasmid|crispr|genome|dna|rna|molecular|operon)\b/, "Microbial Genetics & Molecular Biology"],
		[/\b(food|dairy|spoilage|botulism)\b/, "Food & Dairy Microbiology"],
		[/\b(soil|nitrogen|rhizob|wastewater|biogeochem)\b/, "Environmental & Soil Microbiology"],
		[/\b(plant|agri|nodule)\b/, "Agricultural Microbiology"],
		[/\b(e\.?\s*coli|salmonella|pseudomonas|neisseria|klebsiella|vibrio|helicobacter|virulence|pathogen|sepsis|clinical|infection)\b/, "Medical / Clinical Microbiology"],
		[/\b(growth curve|nutrition|microscope|koch|pasteur)\b/, "General Microbiology"]
	]) if (re.test(t)) return name;
	return null;
}
var DISCIPLINES = [
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
					"Scale: typical bacillus ~1–5 µm; viruses ~20–300 nm — below the light-microscope limit."
				],
				notes: "Open by asking students to name a microbe that is useful rather than harmful.",
				keywords: [
					"diversity",
					"domains",
					"overview"
				]
			},
			{
				title: "Founders and Koch's postulates",
				bullets: [
					"Leeuwenhoek (1670s) first reported 'animalcules' with simple lenses.",
					"Pasteur refuted spontaneous generation (swan-neck flask) and developed pasteurisation.",
					"Koch linked specific microbes to anthrax, TB, and cholera; his postulates still structure causal inference.",
					"Molecular Koch's postulates (Falkow) adapt the logic to virulence genes that cannot always be cultured."
				],
				notes: "Contrast culture-based vs sequence-based causality; mention H. pylori as a postulate success story.",
				keywords: [
					"history",
					"koch",
					"pasteur"
				]
			},
			{
				title: "Microscopy toolkit",
				bullets: [
					"Bright-field + stains: Gram, acid-fast, endospore — cheap, fast, still first-line.",
					"Phase contrast and DIC visualise live unstained cells; fluorescence tags specific molecules.",
					"SEM for surface topography; TEM for ultrastructure and viral particles.",
					"Resolution is limited by wavelength; electron microscopy reaches nanometre scale."
				],
				notes: "Show a side-by-side of Gram stain vs SEM of the same organism if media is attached.",
				keywords: [
					"microscopy",
					"gram",
					"tem",
					"sem"
				]
			},
			{
				title: "Growth and nutrition",
				bullets: [
					"Batch-culture phases: lag, exponential, stationary, death — plot as log CFU vs time.",
					"Obligate aerobes, facultative anaerobes, aerotolerant, microaerophiles, obligate anaerobes.",
					"Psychrophiles to hyperthermophiles; halophiles and acidophiles expand habitable niches.",
					"Defined vs complex media; selective and differential plates (MacConkey, blood agar, MSA)."
				],
				notes: "Have students predict which plate a coliform would grow on and why.",
				keywords: [
					"growth",
					"media",
					"oxygen",
					"nutrition"
				]
			}
		]
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
					"Cytoskeletal homologues (FtsZ, MreB, crescentin) organise division and shape."
				],
				notes: "Stress that 'simple' cells still spatially organise metabolism.",
				keywords: [
					"cell",
					"nucleoid",
					"ribosome"
				]
			},
			{
				title: "Envelope architecture",
				bullets: [
					"Gram-positive: thick peptidoglycan + teichoic acids; retains crystal violet.",
					"Gram-negative: thin PG in periplasm + outer membrane with LPS (endotoxin).",
					"Mycobacteria: mycolic-acid arabinogalactan wall — acid-fast, intrinsically drug-resistant.",
					"Peptidoglycan is a β-1,4 GlcNAc–MurNAc glycan cross-linked by peptides; β-lactams block the transpeptidase."
				],
				notes: "Draw the two envelopes side by side. Mention LPS lipid A as the shock-inducing moiety.",
				keywords: [
					"cell wall",
					"gram",
					"lps",
					"peptidoglycan"
				]
			},
			{
				title: "Central metabolism",
				bullets: [
					"Embden–Meyerhof glycolysis vs Entner–Doudoroff vs pentose phosphate — not all bacteria use EMP.",
					"Respiration: NADH → ETC → PMF → ATP synthase; terminal acceptor can be O2, nitrate, sulphate.",
					"Fermentation regenerates NAD+ when respiration is unavailable; products fingerprint species.",
					"Anaplerosis and glyoxylate shunt let cells grow on two-carbon substrates."
				],
				notes: "Connect fermentation products to food microbiology (yoghurt, kimchi) and diagnostics (TSI).",
				keywords: [
					"metabolism",
					"glycolysis",
					"fermentation",
					"respiration"
				]
			}
		]
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
					"Typical E. coli genome ~4.6 Mb / ~4,300 ORFs; some endosymbionts are <200 kb."
				],
				notes: "Show a plasmid map of a clinical blaCTX-M plasmid if discussing AMR later.",
				keywords: [
					"genome",
					"plasmid",
					"operon"
				]
			},
			{
				title: "Horizontal gene transfer",
				bullets: [
					"Transformation: uptake of naked DNA; competence is regulated (e.g. CSP in streptococci).",
					"Transduction: bacteriophage packages host DNA — specialised vs generalised.",
					"Conjugation: type-IV secretion of plasmid DNA through a pilus; F and Hfr strains.",
					"HGT plus selection is the engine of rapid AMR spread, not point mutation alone."
				],
				notes: "Luria–Delbrück as the mutation story; conjugation as the ecology story.",
				keywords: [
					"hgt",
					"conjugation",
					"phage",
					"transformation"
				]
			},
			{
				title: "Regulation in a changing world",
				bullets: [
					"Lac operon: CAP-cAMP activation + LacI repression — a two-input AND-like logic.",
					"Two-component systems (sensor HK + response regulator) sense osmolarity, phosphate, quorum signals.",
					"σ factors reprogram RNAP (σ70 housekeeping, σ32 heat shock, σS stationary, σ54 nitrogen).",
					"CRISPR-Cas is adaptive immunity against phage and a programmable editing tool."
				],
				notes: "If time, sketch why IPTG induces lac even though it is not metabolised.",
				keywords: [
					"regulation",
					"operon",
					"sigma",
					"crispr"
				]
			}
		]
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
					"Include vehicle, time-matched, and strain-background controls; pre-register the analysis plan."
				],
				notes: "Walk through a failed 'n=3 wells of the same plate' example.",
				keywords: [
					"design",
					"replication",
					"controls"
				]
			},
			{
				title: "Analysing microbial data",
				bullets: [
					"CFU and OD are log-distributed; analyse log10 CFU, not raw counts.",
					"t-test / ANOVA after checking residuals; nonparametric (Mann–Whitney, Kruskal–Wallis) if not.",
					"Multiple comparisons: Tukey or Benjamini–Hochberg, never a pile of uncorrected t-tests.",
					"For 16S/metagenomics: compositionality (CLR), rarefaction vs coverage, and batch effect."
				],
				notes: "Show a volcano plot vs a bar chart of p-values and ask which is more honest.",
				keywords: [
					"statistics",
					"cfu",
					"p-value",
					"metagenomics"
				]
			},
			{
				title: "Reporting and reproducibility",
				bullets: [
					"Report media, lot, incubator set-point, and strain identifiers (ATCC / DSM).",
					"MIQE-like discipline for qPCR: efficiencies, no-RT controls, reference-gene validation.",
					"Deposit reads (SRA) and assemblies (GenBank); share analysis notebooks.",
					"ARRIVE / STROBE / PRISMA depending on animal, observational, or review work."
				],
				notes: "Point students at a journal's data-availability policy.",
				keywords: [
					"reproducibility",
					"reporting",
					"qpcr"
				]
			}
		]
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
					"Motility: flagella (run-tumble), twitching pili, gliding; not all motile genera are Gram-negative."
				],
				notes: "Quiz: which arrangement would a random-plane coccus produce?",
				keywords: [
					"morphology",
					"cocci",
					"bacilli",
					"flagella"
				]
			},
			{
				title: "Gram-positive pathogens",
				bullets: [
					"Staphylococci: catalase-positive clusters; S. aureus = coagulase+, protein A, toxins, MRSA SCCmec.",
					"Streptococci: catalase-negative chains; lancefield groups; S. pyogenes SPE superantigens.",
					"Clostridia: anaerobic spore-formers; botulinum, tetanus, difficile toxins.",
					"Listeria: intracellular, actin comet tails, cold-tolerant foodborne risk in pregnancy."
				],
				notes: "Clinical vignette: post-influenza pneumonia → think S. aureus.",
				keywords: [
					"staph",
					"strep",
					"mrsa",
					"clostridium",
					"gram-positive"
				]
			},
			{
				title: "Gram-negative pathogens",
				bullets: [
					"Enterobacterales: E. coli pathotypes (ETEC, EHEC/STEC, UPEC); Salmonella, Shigella, Klebsiella.",
					"LPS lipid A drives septic shock; capsule and siderophores are key virulence factors.",
					"Pseudomonas: opportunistic, biofilm, efflux-driven MDR in burns and CF lung.",
					"Neisseria, Haemophilus, Bordetella: fastidious diplococci/coccobacilli of mucosal surfaces."
				],
				notes: "Highlight EHEC Shiga toxin and why antibiotics can worsen HUS.",
				keywords: [
					"gram-negative",
					"e.coli",
					"lps",
					"pseudomonas",
					"salmonella"
				]
			},
			{
				title: "Pathogenesis sequence",
				bullets: [
					"Exposure → adhesion (pili, MSCRAMMs) → invasion or colonisation → immune evasion → damage.",
					"Exotoxins: AB toxins (diphtheria, cholera, tetanus), superantigens, type-III secreted effectors.",
					"Endotoxin is LPS; it is not secreted on purpose — it is released on lysis.",
					"Biofilms on devices create a diffusion-limited, persister-rich community."
				],
				notes: "Map each step to a possible vaccine or drug intervention.",
				keywords: [
					"pathogenesis",
					"toxin",
					"biofilm",
					"adhesion"
				]
			}
		]
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
					"Segmented genomes (influenza, rotavirus) enable reassortment and antigenic shift."
				],
				notes: "Use influenza HA/NA as the envelope-glycoprotein example.",
				keywords: [
					"capsid",
					"envelope",
					"baltimore",
					"influenza"
				]
			},
			{
				title: "Replication cycle",
				bullets: [
					"Attachment to a specific receptor (sialic acid, ACE2, CD4/CCR5) determines tropism.",
					"Entry by fusion or endocytosis → uncoating → genome expression → assembly → release.",
					"DNA viruses often use the nucleus; most RNA viruses replicate in the cytoplasm (influenza is an exception).",
					"Retroviruses reverse-transcribe and integrate; latency is a therapeutic problem, not just a curiosity."
				],
				notes: "Pause on why acyclovir is selective for herpes-infected cells (viral TK).",
				keywords: [
					"replication",
					"tropism",
					"hiv",
					"herpes"
				]
			},
			{
				title: "Pathogenesis and vaccines",
				bullets: [
					"Acute (influenza), chronic (HBV, HCV), latent (herpesviruses), transforming (HPV, EBV).",
					"Cytopathic effect, inclusion bodies, and cytokine storm are distinct damage modes.",
					"Live-attenuated, inactivated, subunit, VLP, and mRNA platforms — trade-off of immunogenicity vs safety.",
					"Antivirals target entry, polymerase, integrase, protease, or neuraminidase — resistance follows monotherapy."
				],
				notes: "Current schedule: HBV, HPV, influenza, MMR, polio, COVID mRNA as examples.",
				keywords: [
					"vaccine",
					"latency",
					"antiviral",
					"hpv"
				]
			}
		]
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
					"Eukaryotic machinery means antifungals have a narrower therapeutic index than antibacterials."
				],
				notes: "Show a lactophenol cotton-blue tape mount vs a Gram stain of yeast.",
				keywords: [
					"yeast",
					"hyphae",
					"ergosterol",
					"dimorphic"
				]
			},
			{
				title: "Clinical mycoses",
				bullets: [
					"Superficial/cutaneous: dermatophytes (Trichophyton, Microsporum) and Malassezia.",
					"Opportunistic: Candida (mucosa, candidemia), Aspergillus (neutropenic lung), Cryptococcus (meningitis, HIV).",
					"Primary dimorphic pathogens: Histoplasma, Blastomyces, Coccidioides — geography matters.",
					"Pneumocystis jirovecii is a fungus; TMP-SMX remains first-line prophylaxis in low CD4."
				],
				notes: "A travel history plus cave exposure should trigger histo/blasto on the differential.",
				keywords: [
					"candida",
					"aspergillus",
					"crypto",
					"dermatophyte"
				]
			},
			{
				title: "Antifungal classes",
				bullets: [
					"Polyenes (amphotericin B) bind ergosterol and punch pores; nephrotoxicity drives lipid formulations.",
					"Azoles inhibit 14α-demethylase (ERG11); resistance via efflux and target mutation is rising.",
					"Echinocandins inhibit β-1,3-glucan synthase — first-line for invasive candidiasis.",
					"Flucytosine is never monotherapy; allylamines (terbinafine) for dermatophytes."
				],
				notes: "C. auris as the MDR yeast that broke automatic fluconazole assumptions.",
				keywords: [
					"azole",
					"amphotericin",
					"echinocandin",
					"resistance"
				]
			}
		]
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
					"Secondary endosymbiosis explains chloroplast diversity (euglenids, dinoflagellates, diatoms)."
				],
				notes: "Clarify cyanobacteria are not algae, even if water-quality labs still say 'blue-green algae'.",
				keywords: [
					"algae",
					"cyanobacteria",
					"chloroplast",
					"pigment"
				]
			},
			{
				title: "Ecology and toxins",
				bullets: [
					"Harmful algal blooms (Karenia, Alexandrium) produce brevetoxins and saxitoxin.",
					"Cyanotoxins: microcystin (hepatotoxin), anatoxin-a, cylindrospermopsin — monitor drinking water.",
					"Eutrophication (N and P) plus warmth predicts bloom risk.",
					"Diatoms build silica frustules and dominate marine primary production and palaeo-records."
				],
				notes: "Local water-authority HAB reports make a good live example.",
				keywords: [
					"bloom",
					"toxin",
					"microcystin",
					"diatom"
				]
			},
			{
				title: "Applied phycology",
				bullets: [
					"Spirulina / Chlorella as protein; agar and alginate as gelling agents from red/brown algae.",
					"Algal biofuels remain a research target; lipid yield vs land-use is the constraint.",
					"Wastewater polishing: algae take up N/P and can be harvested.",
					"Coral bleaching is a breakdown of the dinoflagellate (Symbiodiniaceae) symbiosis."
				],
				notes: "Connect agar back to the bacteriology lab they already use.",
				keywords: [
					"agar",
					"spirulina",
					"biofuel",
					"symbiosis"
				]
			}
		]
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
					"Diagnosis still leans on microscopy of stool, blood films, and now antigen/PCR panels."
				],
				notes: "Thick and thin films: thick for screening, thin for species ID.",
				keywords: [
					"malaria",
					"giardia",
					"plasmodium",
					"protozoa"
				]
			},
			{
				title: "Helminths",
				bullets: [
					"Nematodes (roundworms): Ascaris, hookworm, Strongyloides, filariae — soil-transmitted vs vector-borne.",
					"Cestodes (tapeworms): Taenia solium cysticercosis is a leading acquired epilepsy cause.",
					"Trematodes (flukes): Schistosoma uses snails; eggs, not worms, drive pathology.",
					"Eosinophilia is a clue for tissue-invasive helminths, not for giardiasis."
				],
				notes: "Life-cycle diagrams beat bullet lists — sketch snail → cercaria → skin.",
				keywords: [
					"helminth",
					"schistosoma",
					"ascaris",
					"taenia"
				]
			},
			{
				title: "Control",
				bullets: [
					"Mass drug administration (albendazole, praziquantel, ivermectin) plus WASH.",
					"Vector control: bed nets, indoor residual spray, larval source management.",
					"Vaccines: RTS,S and R21 malaria vaccines are the first licensed parasitic vaccines.",
					"Immunocompromise unmasks Strongyloides hyperinfection and toxoplasma encephalitis."
				],
				notes: "Emphasise that 'tropical' parasites travel with patients; take a migration history.",
				keywords: [
					"mda",
					"vector",
					"vaccine",
					"malaria"
				]
			}
		]
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
					"Turnaround: stain hours, culture 18–72 h, mycobacteria weeks unless molecular."
				],
				notes: "Show a mislabelled blood-culture horror story; students remember it.",
				keywords: [
					"specimen",
					"culture",
					"maldi",
					"diagnostic"
				]
			},
			{
				title: "Stains and media",
				bullets: [
					"Gram stain algorithm: crystal violet → iodine → decolourise → safranin.",
					"Acid-fast (Ziehl–Neelsen, auramine) for mycobacteria and Nocardia (partial).",
					"Blood agar (haemolysis), MacConkey (lactose), chocolate (fastidious), CLED, Sabouraud.",
					"Anaerobic work needs proper transport (gassed vials, not a dry swab in air)."
				],
				notes: "Live demo of haemolysis types if a lab session follows.",
				keywords: [
					"gram stain",
					"media",
					"blood agar",
					"acid-fast"
				]
			},
			{
				title: "AST and reporting",
				bullets: [
					"Kirby–Bauer disk diffusion and broth microdilution MIC; EUCAST/CLSI breakpoints.",
					"Report as S / I / R with the method and standard cited; cascade reporting protects last-line agents.",
					"Rapid molecular panels (blood, meningitis, GI) change sepsis minutes, not days.",
					"Infection-prevention flags: CPE, MRSA, VRE, C. auris — isolate and notify."
				],
				notes: "Discuss why an MIC is not a dose, and PK/PD (fT>MIC, AUC/MIC) sits on top.",
				keywords: [
					"ast",
					"mic",
					"breakpoint",
					"mrsa"
				]
			}
		]
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
					"Inflammation is protective until it is not — sepsis is dysregulated innate immunity."
				],
				notes: "TLR4–LPS is the canonical pairing; TLR3/7/8/9 sense nucleic acids.",
				keywords: [
					"innate",
					"tlr",
					"complement",
					"phagocyte"
				]
			},
			{
				title: "Adaptive immunity",
				bullets: [
					"Clonal selection of B and T cells with somatically diversified receptors.",
					"MHC I → CD8 cytotoxic; MHC II → CD4 helper (Th1, Th2, Th17, Tfh, Treg).",
					"Antibodies: IgM first, class-switch to IgG/A/E; neutralisation, opsonisation, ADCC.",
					"Memory is why vaccines work; original antigenic sin is why some boosters disappoint."
				],
				notes: "Draw a CD4 Th1 vs Th2 fork with IFN-γ vs IL-4.",
				keywords: [
					"adaptive",
					"mhc",
					"antibody",
					"t cell"
				]
			},
			{
				title: "Host–pathogen immunology",
				bullets: [
					"Intracellular bacteria (TB, Listeria, Salmonella) require Th1 / granuloma programmes.",
					"Capsular polysaccharides are T-independent unless conjugated to protein (Hib, pneumococcal conjugate).",
					"Antigenic variation (trypanosomes, influenza drift/shift, N. gonorrhoeae pili) outruns memory.",
					"Hypersensitivity and autoimmunity are the cost of a powerful adaptive system."
				],
				notes: "Conjugate vs polysaccharide vaccine is a high-yield exam contrast.",
				keywords: [
					"vaccine",
					"granuloma",
					"antigenic variation"
				]
			}
		]
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
					"Membrane: polymyxins, daptomycin — last-line for many MDR Gram-negatives / MRSA."
				],
				notes: "A one-page 'target cartoon' of the bacterial cell is worth ten lists.",
				keywords: [
					"beta-lactam",
					"antibiotic",
					"aminoglycoside",
					"quinolone"
				]
			},
			{
				title: "Resistance mechanisms",
				bullets: [
					"Enzymatic destruction: β-lactamases (ESBL, AmpC, carbapenemases KPC/NDM/OXA-48).",
					"Target modification: mecA PBP2a (MRSA), vanA D-Ala-D-Lac (VRE), gyrA mutations.",
					"Efflux and porin loss drop periplasmic concentration, especially in Pseudomonas and Acinetobacter.",
					"Biofilm + persisters produce phenotypic tolerance without a resistance gene."
				],
				notes: "Distinguish resistance (heritably higher MIC) from tolerance/persistence.",
				keywords: [
					"mrsa",
					"esbl",
					"carbapenemase",
					"efflux",
					"amr"
				]
			},
			{
				title: "Stewardship",
				bullets: [
					"Right drug, dose, duration, de-escalation; send cultures before the first dose when safe.",
					"PK/PD: time-dependent β-lactams vs concentration-dependent aminoglycosides/quinolones.",
					"One Health: farm, wastewater, and hospital effluent share a resistome.",
					"New agents are rare; preserve cefiderocol, novel β-lactam/inhibitor combos, and anti-TB pipelines."
				],
				notes: "Local antibiogram should drive empiric policy, not a US textbook table.",
				keywords: [
					"stewardship",
					"pkpd",
					"one health"
				]
			}
		]
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
					"Downstream processing (centrifugation, filtration, chromatography) often costs more than the tank."
				],
				notes: "Visit a local dairy or brewery if possible — tanks make the theory concrete.",
				keywords: [
					"bioreactor",
					"fermentation",
					"metabolite"
				]
			},
			{
				title: "Products",
				bullets: [
					"Antibiotics (Penicillium, Streptomyces), industrial enzymes (amylases, proteases, cellulases).",
					"Organic acids, vitamins, and recombinant proteins (insulin, vaccines) in E. coli or CHO.",
					"Immobilised cells and enzymes improve reuse; alginate beads are the teaching example.",
					"Synthetic biology: pathway refactoring, CRISPR, cell-free systems for rapid prototyping."
				],
				notes: "Enzyme immobilisation is a favourite JUW practical — bind it to this lecture.",
				keywords: [
					"enzyme",
					"immobilisation",
					"insulin",
					"streptomyces"
				]
			},
			{
				title: "Quality and regulation",
				bullets: [
					"GMP, validation, and change control; a single phage in a production strain can halt a plant.",
					"Biosafety of GMMs: contained use vs deliberate release, auxotrophic failsafes.",
					"Life-cycle assessment: titre, yield, productivity, and feedstock ethics (food vs fuel).",
					"Strain improvement: classical mutagenesis still sits beside rational metabolic engineering."
				],
				notes: "Phage contamination anecdote from dairy starters is memorable.",
				keywords: [
					"gmp",
					"gmo",
					"quality"
				]
			}
		]
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
					"Psychrotrophs (Listeria, Pseudomonas) grow in the fridge; freezing stops growth, not always viability."
				],
				notes: "aw of jam vs fresh meat is a clean numerical example.",
				keywords: [
					"spoilage",
					"water activity",
					"listeria",
					"hurdle"
				]
			},
			{
				title: "Dairy cultures",
				bullets: [
					"Starter LABs: Lactococcus, Streptococcus thermophilus, Lactobacillus delbrueckii subsp. bulgaricus.",
					"Yoghurt is a defined co-culture; cheese adds ripening flora (Penicillium, Brevibacterium, propionibacteria).",
					"Bacteriophage attack on starters is the classic industrial failure in dairies.",
					"Probiotic claims require strain-level evidence, not genus-level folklore."
				],
				notes: "Taste yoghurt vs chemically acidified milk if running a practical.",
				keywords: [
					"yogurt",
					"lab",
					"starter",
					"cheese",
					"probiotic"
				]
			},
			{
				title: "Foodborne disease",
				bullets: [
					"Infection (Salmonella, Campylobacter, Listeria) vs intoxication (S. aureus enterotoxin, C. botulinum).",
					"STECs and the HUS risk; norovirus dominates outbreak counts in many countries.",
					"HACCP: identify CCPs (cooking, cooling, metal detection) and monitor them.",
					"Pasteurisation, UHT, irradiation, and high-pressure processing as kill steps with different sensory costs."
				],
				notes: "Botulism in home-canned low-acid foods is the teaching emergency.",
				keywords: [
					"salmonella",
					"staph",
					"haccp",
					"botulism"
				]
			}
		]
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
					"Mycorrhizae and Rhizobium–legume nodules are mutualisms with global N and P consequences."
				],
				notes: "Pass around a nodule if you can source one.",
				keywords: [
					"soil",
					"rhizosphere",
					"rhizobium",
					"mycorrhiza"
				]
			},
			{
				title: "Biogeochemical cycles",
				bullets: [
					"Carbon: photosynthesis, respiration, methanogenesis, methanotrophy.",
					"Nitrogen: fixation (nitrogenase, O2-shy), nitrification, anammox, denitrification.",
					"Sulphur and iron cycling by specialists (Desulfovibrio, Acidithiobacillus) reshape ores and acid mine drainage.",
					"Climate link: CH4 and N2O are microbial gases; permafrost thaw is a microbiology problem."
				],
				notes: "Nitrogenase + oxygen paradox explains heterocysts and leghaemoglobin.",
				keywords: [
					"nitrogen",
					"methane",
					"cycle",
					"fixation"
				]
			},
			{
				title: "Bioremediation and water",
				bullets: [
					"Aerobic hydrocarbon degraders (Pseudomonas, Alcanivorax) vs anaerobic dechlorinators (Dehalococcoides).",
					"Bioaugmentation vs biostimulation; bioavailability of pollutants often limits rate.",
					"Activated sludge and anaerobic digestion are engineered microbial ecosystems.",
					"Indicator organisms (E. coli, enterococci) proxy faecal risk; they are not the pathogens."
				],
				notes: "Local wastewater plant flow diagram is better than a generic textbook one.",
				keywords: [
					"bioremediation",
					"wastewater",
					"sludge",
					"indicator"
				]
			}
		]
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
					"Endophytes can be mutualists or latent pathogens — context, not taxonomy, decides."
				],
				notes: "Students often think 'bacteria = disease'; invert that in the first minute.",
				keywords: [
					"rhizobium",
					"pgpr",
					"mycorrhiza",
					"inoculant"
				]
			},
			{
				title: "Plant pathogens",
				bullets: [
					"Bacteria: Ralstonia wilt, Xanthomonas blights, Erwinia soft rot, Agrobacterium galls (and T-DNA).",
					"Fungi/oomycetes: rusts, mildews, Fusarium, Phytophthora — still the largest yield thieves.",
					"Viruses: mosaic and yellowing diseases; insect vectors and seed transmission.",
					"Quarantine, certified seed, and crop rotation remain more powerful than a new spray."
				],
				notes: "Agrobacterium as both a pathogen and the workhorse of plant transformation.",
				keywords: [
					"blight",
					"wilt",
					"agrobacterium",
					"phytophthora"
				]
			},
			{
				title: "Biocontrol and soil health",
				bullets: [
					"Bacillus thuringiensis crystal toxins; Trichoderma mycoparasitism; bacteriophage for fire blight.",
					"Overuse of copper and streptomycin in orchards selects resistance just as in hospitals.",
					"Soil organic matter feeds the microbiome that suppresses some pathogens (take-all decline).",
					"Climate stress shifts host–microbe outcomes; drought plus Fusarium is a typical synergy."
				],
				notes: "Bt is a chance to discuss GM crops without leaving microbiology.",
				keywords: [
					"biocontrol",
					"bt",
					"trichoderma",
					"soil health"
				]
			}
		]
	}
];
function getDiscipline(name) {
	return DISCIPLINES.find((d) => d.name === name);
}
/** Curated Wikimedia Commons media with credits. Thumbnails stay CORS-friendly. */
var RAW_CATALOG = [
	{
		id: "sau",
		kind: "micrograph",
		title: "Staphylococcus aureus Gram stain",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Staphylococcus_aureus_Gram.jpg&width=800",
		credit: "CDC / Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "Public domain (CDC)",
		keywords: [
			"bacteria",
			"gram",
			"staph",
			"cocci",
			"clinical",
			"mrsa"
		]
	},
	{
		id: "ecoli",
		kind: "micrograph",
		title: "Escherichia coli SEM",
		src: "https://commons.wikimedia.org/w/thumb.php?f=E_coli_at_10000x%2C_original.jpg&width=800",
		credit: "Eric Erbe / USDA ARS",
		source: "Wikimedia Commons",
		license: "Public domain (USDA)",
		keywords: [
			"bacteria",
			"gram-negative",
			"coli",
			"rod",
			"enteric"
		]
	},
	{
		id: "tb",
		kind: "micrograph",
		title: "Mycobacterium tuberculosis",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Mycobacterium_tuberculosis_Ziehl-Neelsen_stain_02.jpg&width=800",
		credit: "CDC / Dr. George Kubica",
		source: "Wikimedia Commons",
		license: "Public domain (CDC)",
		keywords: [
			"mycobacteria",
			"acid-fast",
			"tb",
			"clinical"
		]
	},
	{
		id: "flu",
		kind: "micrograph",
		title: "Influenza virions TEM",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Influenza_virus.jpg&width=800",
		credit: "CDC / Cynthia Goldsmith",
		source: "Wikimedia Commons",
		license: "Public domain (CDC)",
		keywords: [
			"virus",
			"influenza",
			"rna",
			"envelope",
			"virology"
		]
	},
	{
		id: "hiv",
		kind: "micrograph",
		title: "HIV-1 budding from a lymphocyte",
		src: "https://commons.wikimedia.org/w/thumb.php?f=HIV-budding-Color.jpg&width=800",
		credit: "C. Goldsmith / CDC",
		source: "Wikimedia Commons",
		license: "Public domain (CDC)",
		keywords: [
			"virus",
			"hiv",
			"retrovirus",
			"pathogenesis"
		]
	},
	{
		id: "phage",
		kind: "micrograph",
		title: "T4 bacteriophage",
		src: "https://commons.wikimedia.org/w/thumb.php?f=T4_phage.png&width=800",
		credit: "Dr. Graham Beards",
		source: "Wikimedia Commons",
		license: "CC BY-SA 4.0",
		keywords: [
			"phage",
			"virus",
			"genetics",
			"molecular"
		]
	},
	{
		id: "candida",
		kind: "micrograph",
		title: "Candida albicans",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Candida_albicans_Gram.jpg&width=800",
		credit: "CDC",
		source: "Wikimedia Commons",
		license: "Public domain (CDC)",
		keywords: [
			"fungi",
			"yeast",
			"mycology",
			"clinical"
		]
	},
	{
		id: "aspergillus",
		kind: "micrograph",
		title: "Aspergillus conidiophore",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Aspergillus_fumigatus_01.jpg&width=800",
		credit: "CDC / Dr. Libero Ajello",
		source: "Wikimedia Commons",
		license: "Public domain (CDC)",
		keywords: [
			"fungi",
			"mold",
			"mycology",
			"spores"
		]
	},
	{
		id: "plasmodium",
		kind: "micrograph",
		title: "Plasmodium falciparum ring forms",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Plasmodium_falciparum_01.png&width=800",
		credit: "CDC / Dr. Mae Melvin",
		source: "Wikimedia Commons",
		license: "Public domain (CDC)",
		keywords: [
			"parasite",
			"malaria",
			"parasitology",
			"protozoa"
		]
	},
	{
		id: "giardia",
		kind: "micrograph",
		title: "Giardia lamblia trophozoite",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Giardia_lamblia.jpg&width=800",
		credit: "CDC",
		source: "Wikimedia Commons",
		license: "Public domain (CDC)",
		keywords: [
			"parasite",
			"giardia",
			"flagellate",
			"parasitology"
		]
	},
	{
		id: "neutrophil",
		kind: "micrograph",
		title: "Neutrophil phagocytosing bacteria",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Neutrophil_with_anthrax_bacteria.jpg&width=800",
		credit: "Volker Brinkmann / Wikimedia",
		source: "Wikimedia Commons",
		license: "CC BY 2.5",
		keywords: [
			"immunity",
			"phagocyte",
			"innate",
			"immunology"
		]
	},
	{
		id: "lymphocyte",
		kind: "micrograph",
		title: "Human lymphocyte SEM",
		src: "https://commons.wikimedia.org/w/thumb.php?f=SEM_Lymphocyte.jpg&width=800",
		credit: "NCI / Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "Public domain (NCI)",
		keywords: [
			"immunity",
			"lymphocyte",
			"adaptive",
			"immunology"
		]
	},
	{
		id: "petri",
		kind: "photo",
		title: "Bacterial colonies on agar",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Beta-haemolytic%20bacteria%20on%20blood%20agar.jpg&width=800",
		credit: "N. F. / Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "CC BY-SA 3.0",
		keywords: [
			"culture",
			"media",
			"clinical",
			"lab",
			"industrial",
			"food"
		]
	},
	{
		id: "microscope",
		kind: "photo",
		title: "Compound light microscope",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Optical_microscope_nikon_alphaphot.jpg&width=800",
		credit: "Gnangarra / Wikimedia",
		source: "Wikimedia Commons",
		license: "CC BY 2.5 AU",
		keywords: [
			"microscopy",
			"general",
			"lab",
			"methods"
		]
	},
	{
		id: "chlorella",
		kind: "micrograph",
		title: "Chlorella cells",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Chlorella_vulgaris.jpg&width=800",
		credit: "NEON / Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "CC BY 2.5",
		keywords: [
			"algae",
			"phycology",
			"photosynthesis"
		]
	},
	{
		id: "rhizobium",
		kind: "photo",
		title: "Root nodules (Rhizobium)",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Root_nodules.jpg&width=800",
		credit: "USDA / Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "Public domain (USDA)",
		keywords: [
			"soil",
			"nitrogen",
			"agriculture",
			"environmental",
			"rhizobium"
		]
	},
	{
		id: "penicillium",
		kind: "micrograph",
		title: "Penicillium conidia",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Penicillium.jpg&width=800",
		credit: "CDC",
		source: "Wikimedia Commons",
		license: "Public domain (CDC)",
		keywords: [
			"fungi",
			"antibiotic",
			"industrial",
			"penicillin",
			"amr"
		]
	},
	{
		id: "biofilm",
		kind: "micrograph",
		title: "Staphylococcus biofilm SEM",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Staphylococcus_aureus_biofilm_01.jpg&width=800",
		credit: "CDC / Janice Carr",
		source: "Wikimedia Commons",
		license: "Public domain (CDC)",
		keywords: [
			"biofilm",
			"bacteria",
			"amr",
			"clinical",
			"industrial"
		]
	},
	{
		id: "anthrax",
		kind: "micrograph",
		title: "Bacillus anthracis Gram stain",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Bacillus_anthracis_Gram.jpg&width=800",
		credit: "CDC",
		source: "Wikimedia Commons",
		license: "Public domain (CDC)",
		keywords: [
			"bacillus",
			"anthrax",
			"spore",
			"gram",
			"bacteriology"
		]
	},
	{
		id: "strep",
		kind: "micrograph",
		title: "Streptococcus pyogenes chains",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Streptococcus_pyogenes.jpg&width=800",
		credit: "CDC",
		source: "Wikimedia Commons",
		license: "Public domain (CDC)",
		keywords: [
			"streptococcus",
			"cocci",
			"clinical",
			"gram"
		]
	},
	{
		id: "salmonella",
		kind: "micrograph",
		title: "Salmonella typhimurium SEM",
		src: "https://commons.wikimedia.org/w/thumb.php?f=SalmonellaNIAID.jpg&width=800",
		credit: "NIAID",
		source: "Wikimedia Commons",
		license: "Public domain (NIH)",
		keywords: [
			"salmonella",
			"food",
			"enteric",
			"flagella"
		]
	},
	{
		id: "cholera",
		kind: "micrograph",
		title: "Vibrio cholerae SEM",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Cholera_bacteria_SEM.jpg&width=800",
		credit: "Dartmouth College / Wikimedia",
		source: "Wikimedia Commons",
		license: "CC BY-SA 3.0",
		keywords: [
			"vibrio",
			"cholera",
			"clinical",
			"water"
		]
	},
	{
		id: "pylori",
		kind: "micrograph",
		title: "Helicobacter pylori",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Helicobacter_pylori_EM.jpg&width=800",
		credit: "Yutaka Tsutsumi / Wikimedia",
		source: "Wikimedia Commons",
		license: "Public domain",
		keywords: [
			"helicobacter",
			"ulcer",
			"clinical",
			"flagella"
		]
	},
	{
		id: "yeast",
		kind: "micrograph",
		title: "Saccharomyces cerevisiae budding",
		src: "https://commons.wikimedia.org/w/thumb.php?f=S_cerevisiae_under_DIC_microscopy.jpg&width=800",
		credit: "Masur / Wikimedia",
		source: "Wikimedia Commons",
		license: "Public domain",
		keywords: [
			"yeast",
			"fungi",
			"budding",
			"industrial",
			"food",
			"mycology"
		]
	},
	{
		id: "trypanosoma",
		kind: "micrograph",
		title: "Trypanosoma among red cells",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Trypanosoma_sp.PHIL_613_lores.jpg&width=800",
		credit: "CDC",
		source: "Wikimedia Commons",
		license: "Public domain (CDC)",
		keywords: [
			"parasite",
			"trypanosoma",
			"parasitology",
			"blood"
		]
	},
	{
		id: "entamoeba",
		kind: "micrograph",
		title: "Entamoeba histolytica cyst",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Entamoeba_histolytica_life_cycle_stages.jpg&width=800",
		credit: "CDC",
		source: "Wikimedia Commons",
		license: "Public domain (CDC)",
		keywords: [
			"amoeba",
			"parasite",
			"parasitology",
			"cyst"
		]
	},
	{
		id: "antibody",
		kind: "diagram",
		title: "Antibody (IgG) schematic",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Antibody.svg&width=800",
		credit: "Fvasconcellos / Wikimedia",
		source: "Wikimedia Commons",
		license: "Public domain",
		keywords: [
			"antibody",
			"immunology",
			"igg",
			"adaptive"
		]
	},
	{
		id: "dna",
		kind: "diagram",
		title: "DNA double helix",
		src: "https://commons.wikimedia.org/w/thumb.php?f=DNA_Structure%2BKey%2BLabelled.pn_NoBB.png&width=800",
		credit: "Zephyris / Wikimedia",
		source: "Wikimedia Commons",
		license: "CC BY-SA 3.0",
		keywords: [
			"dna",
			"genetics",
			"molecular",
			"helix"
		]
	},
	{
		id: "ribosome",
		kind: "diagram",
		title: "Ribosome translating mRNA",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Peptide_syn.png&width=800",
		credit: "NIH / Wikimedia",
		source: "Wikimedia Commons",
		license: "Public domain (NIH)",
		keywords: [
			"ribosome",
			"translation",
			"molecular",
			"protein"
		]
	},
	{
		id: "endospore",
		kind: "micrograph",
		title: "Endospore stain (Bacillus)",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Bacillus_subtilis_Spore.jpg&width=800",
		credit: "CDC",
		source: "Wikimedia Commons",
		license: "Public domain (CDC)",
		keywords: [
			"endospore",
			"bacillus",
			"stain",
			"general"
		]
	},
	{
		id: "bloodagar",
		kind: "photo",
		title: "Beta-haemolysis on blood agar",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Streptococcus%20pyogenes-blood%20agar-hemolysis%20detail.jpg&width=800",
		credit: "CDC",
		source: "Wikimedia Commons",
		license: "Public domain (CDC)",
		keywords: [
			"blood agar",
			"hemolysis",
			"clinical",
			"media",
			"strep"
		]
	},
	{
		id: "macconkey",
		kind: "photo",
		title: "MacConkey agar lactose fermenters",
		src: "https://commons.wikimedia.org/w/thumb.php?f=MacConkey%20agar%20with%20LF%20and%20LF%20colonies.jpg&width=800",
		credit: "Microrao / Wikimedia",
		source: "Wikimedia Commons",
		license: "CC BY-SA 4.0",
		keywords: [
			"macconkey",
			"enteric",
			"clinical",
			"media",
			"coliform"
		]
	},
	{
		id: "bioreactor",
		kind: "photo",
		title: "Stirred-tank bioreactor",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Bioreactor_principle.svg&width=800",
		credit: "Sven / Wikimedia",
		source: "Wikimedia Commons",
		license: "CC BY-SA 3.0",
		keywords: [
			"bioreactor",
			"industrial",
			"fermentation",
			"tank"
		]
	},
	{
		id: "nitrogen",
		kind: "diagram",
		title: "Nitrogen cycle",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Nitrogen_Cycle.svg&width=800",
		credit: "Johann Dréo / Wikimedia",
		source: "Wikimedia Commons",
		license: "CC BY-SA 3.0",
		keywords: [
			"nitrogen",
			"soil",
			"environmental",
			"agriculture",
			"cycle"
		]
	},
	{
		id: "phagecycle",
		kind: "diagram",
		title: "Lytic versus lysogenic cycle",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Phage_lysogenic_cycle.svg&width=800",
		credit: "Adenosine / Wikimedia",
		source: "Wikimedia Commons",
		license: "CC BY-SA 2.5",
		keywords: [
			"phage",
			"lytic",
			"lysogeny",
			"virology",
			"genetics"
		]
	},
	{
		id: "hivcycle",
		kind: "diagram",
		title: "HIV replication cycle",
		src: "https://commons.wikimedia.org/w/thumb.php?f=HIV-replication-cycle.png&width=800",
		credit: "NIAID",
		source: "Wikimedia Commons",
		license: "Public domain (NIH)",
		keywords: [
			"hiv",
			"virus",
			"replication",
			"virology",
			"retrovirus"
		]
	},
	{
		id: "complement",
		kind: "diagram",
		title: "Complement pathways",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Complement_pathway.svg&width=800",
		credit: "Wikimedia authors",
		source: "Wikimedia Commons",
		license: "CC BY-SA 3.0",
		keywords: [
			"complement",
			"innate",
			"immunology"
		]
	},
	{
		id: "pcr",
		kind: "diagram",
		title: "PCR thermal cycle",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Polymerase_chain_reaction.svg&width=800",
		credit: "Enzoklop / Wikimedia",
		source: "Wikimedia Commons",
		license: "CC BY-SA 3.0",
		keywords: [
			"pcr",
			"molecular",
			"methods",
			"genetics",
			"diagnostics"
		]
	},
	{
		id: "gramwall",
		kind: "diagram",
		title: "Gram-positive vs Gram-negative wall",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Gram-positive_and_negative_cell_wall.svg&width=800",
		credit: "Wikimedia authors",
		source: "Wikimedia Commons",
		license: "CC BY-SA 3.0",
		keywords: [
			"gram",
			"cell wall",
			"peptidoglycan",
			"bacteriology"
		]
	},
	{
		id: "koch",
		kind: "photo",
		title: "Robert Koch laboratory portrait",
		src: "https://commons.wikimedia.org/w/thumb.php?f=RobertKoch_cropped.jpg&width=800",
		credit: "Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "Public domain",
		keywords: [
			"koch",
			"history",
			"general",
			"postulates"
		]
	},
	{
		id: "pasteur",
		kind: "photo",
		title: "Pasteur swan-neck flask",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Swan-necked%20flask%20used%20by%20Pasteur.%20Wellcome%20M0012521.jpg&width=800",
		credit: "Wellcome / Wikimedia",
		source: "Wikimedia Commons",
		license: "CC BY 4.0",
		keywords: [
			"pasteur",
			"history",
			"spontaneous generation",
			"general"
		]
	},
	{
		id: "enzyme",
		kind: "diagram",
		title: "Induced-fit enzyme–substrate",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Induced_fit_diagram.svg&width=800",
		credit: "Thomas Shafee / Wikimedia",
		source: "Wikimedia Commons",
		license: "CC BY-SA 4.0",
		keywords: [
			"enzyme",
			"substrate",
			"immobilisation",
			"kinetics",
			"industrial"
		]
	},
	{
		id: "alginate",
		kind: "photo",
		title: "Alginate hydrogel beads",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Calcium_alginate.jpg&width=800",
		credit: "Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "CC BY-SA",
		keywords: [
			"alginate",
			"immobilisation",
			"beads",
			"enzyme",
			"entrapment"
		]
	},
	{
		id: "sds-page",
		kind: "photo",
		title: "SDS-PAGE protein gel",
		src: "https://commons.wikimedia.org/w/thumb.php?f=SDS-PAGE_electrophoresis.jpg&width=800",
		credit: "Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "CC BY-SA",
		keywords: [
			"gel",
			"protein",
			"enzyme",
			"electrophoresis",
			"molecular"
		]
	},
	{
		id: "elisa",
		kind: "diagram",
		title: "ELISA plate schematic",
		src: "https://commons.wikimedia.org/w/thumb.php?f=ELISA_direct_indirect.svg&width=800",
		credit: "Wikimedia authors",
		source: "Wikimedia Commons",
		license: "CC BY-SA 4.0",
		keywords: [
			"elisa",
			"immunoassay",
			"diagnostics",
			"antibody"
		]
	},
	{
		id: "spectrophotometer",
		kind: "photo",
		title: "Laboratory spectrophotometer",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Spectrophotometer.jpg&width=800",
		credit: "Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "CC BY-SA",
		keywords: [
			"assay",
			"kinetics",
			"od",
			"methods",
			"enzyme"
		]
	},
	{
		id: "autoclave",
		kind: "photo",
		title: "Laboratory autoclave",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Autoclave_front.jpg&width=800",
		credit: "Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "CC BY-SA",
		keywords: [
			"sterility",
			"biosafety",
			"methods",
			"quality"
		]
	},
	{
		id: "bsc",
		kind: "photo",
		title: "Class II biosafety cabinet",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Biosafety_cabinet.jpg&width=800",
		credit: "CDC / Wikimedia",
		source: "Wikimedia Commons",
		license: "Public domain (CDC)",
		keywords: [
			"biosafety",
			"cabinet",
			"methods",
			"containment"
		]
	},
	{
		id: "streptomyces",
		kind: "photo",
		title: "Streptomyces colonies",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Streptomyces.jpg&width=800",
		credit: "CDC",
		source: "Wikimedia Commons",
		license: "Public domain (CDC)",
		keywords: [
			"streptomyces",
			"antibiotic",
			"industrial",
			"actinomycete"
		]
	},
	{
		id: "lactobacillus",
		kind: "micrograph",
		title: "Lactobacillus Gram stain",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Lactobacillus_sp_Gram.jpg&width=800",
		credit: "CDC",
		source: "Wikimedia Commons",
		license: "Public domain (CDC)",
		keywords: [
			"lactobacillus",
			"food",
			"dairy",
			"probiotic",
			"gram"
		]
	},
	{
		id: "hplc",
		kind: "photo",
		title: "HPLC chromatography system",
		src: "https://commons.wikimedia.org/w/thumb.php?f=HPLC_Instrument.jpg&width=800",
		credit: "Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "CC BY-SA",
		keywords: [
			"hplc",
			"downstream",
			"purification",
			"industrial",
			"enzyme"
		]
	},
	{
		id: "centrifuge",
		kind: "photo",
		title: "Laboratory centrifuge",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Laboratory_centrifuge.jpg&width=800",
		credit: "Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "CC BY-SA",
		keywords: [
			"centrifuge",
			"downstream",
			"methods",
			"lab"
		]
	},
	{
		id: "gramstainproc",
		kind: "diagram",
		title: "Gram stain procedure",
		src: "https://commons.wikimedia.org/w/thumb.php?f=Gram_Stain_Technique.png&width=800",
		credit: "Wikimedia authors",
		source: "Wikimedia Commons",
		license: "CC BY-SA",
		keywords: [
			"gram",
			"stain",
			"methods",
			"bacteriology"
		]
	},
	{
		id: "mm-curve",
		kind: "chart",
		title: "Michaelis–Menten saturation curve",
		src: "https://commons.wikimedia.org/wiki/Special:FilePath/Michaelis-Menten_saturation_curve_of_an_enzyme_reaction.svg?width=800",
		credit: "Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "CC BY-SA",
		keywords: [
			"enzyme",
			"kinetics",
			"michaelis",
			"immobilization",
			"chart"
		]
	},
	{
		id: "bioreactor",
		kind: "diagram",
		title: "Stirred-tank bioreactor",
		src: "https://commons.wikimedia.org/wiki/Special:FilePath/Bioreactor_principle.svg?width=800",
		credit: "Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "CC BY-SA",
		keywords: [
			"fermenter",
			"bioreactor",
			"industrial",
			"enzyme",
			"aeration"
		]
	},
	{
		id: "pcr-cycle",
		kind: "diagram",
		title: "Polymerase chain reaction cycle",
		src: "https://commons.wikimedia.org/wiki/Special:FilePath/Polymerase_chain_reaction.svg?width=800",
		credit: "Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "CC BY-SA",
		keywords: [
			"pcr",
			"molecular",
			"diagnostics",
			"dna",
			"diagram"
		]
	},
	{
		id: "gel-e",
		kind: "photo",
		title: "Agarose gel electrophoresis",
		src: "https://commons.wikimedia.org/wiki/Special:FilePath/Gel_electrophoresis_2.jpg?width=800",
		credit: "Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "CC BY-SA",
		keywords: [
			"gel",
			"dna",
			"electrophoresis",
			"molecular",
			"methods"
		]
	},
	{
		id: "kirby",
		kind: "photo",
		title: "Kirby–Bauer disk diffusion",
		src: "https://commons.wikimedia.org/wiki/Special:FilePath/Antibiogram.jpg?width=800",
		credit: "Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "CC BY-SA",
		keywords: [
			"antibiotic",
			"mic",
			"ast",
			"clinical",
			"amr",
			"chart"
		]
	},
	{
		id: "petri",
		kind: "photo",
		title: "Bacterial colonies on agar",
		src: "https://commons.wikimedia.org/wiki/Special:FilePath/Bacterial_colonies.jpg?width=800",
		credit: "Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "CC BY-SA",
		keywords: [
			"colony",
			"culture",
			"agar",
			"lab",
			"industrial"
		]
	},
	{
		id: "sem-scope",
		kind: "photo",
		title: "Scanning electron microscope",
		src: "https://commons.wikimedia.org/wiki/Special:FilePath/SEM.jpg?width=800",
		credit: "Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "CC BY-SA",
		keywords: [
			"sem",
			"microscope",
			"methods",
			"instrument"
		]
	},
	{
		id: "elisa",
		kind: "photo",
		title: "ELISA microtitre plate",
		src: "https://commons.wikimedia.org/wiki/Special:FilePath/ELISA.jpg?width=800",
		credit: "Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "CC BY-SA",
		keywords: [
			"elisa",
			"immunoassay",
			"diagnostics",
			"serology"
		]
	},
	{
		id: "endospore",
		kind: "micrograph",
		title: "Endospore stain",
		src: "https://commons.wikimedia.org/wiki/Special:FilePath/Bacillus_subtilis_Spore_Stain.jpg?width=800",
		credit: "Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "CC BY-SA",
		keywords: [
			"spore",
			"bacillus",
			"stain",
			"micrograph"
		]
	},
	{
		id: "conjugation",
		kind: "diagram",
		title: "Bacterial conjugation",
		src: "https://commons.wikimedia.org/wiki/Special:FilePath/Conjugation.svg?width=800",
		credit: "Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "CC BY-SA",
		keywords: [
			"plasmid",
			"horizontal",
			"genetics",
			"amr",
			"diagram"
		]
	},
	{
		id: "phage-life",
		kind: "diagram",
		title: "Lytic cycle of a bacteriophage",
		src: "https://commons.wikimedia.org/wiki/Special:FilePath/Phage_lytic_cycle.svg?width=800",
		credit: "Wikimedia Commons",
		source: "Wikimedia Commons",
		license: "CC BY-SA",
		keywords: [
			"phage",
			"virus",
			"lytic",
			"diagram",
			"genetics"
		]
	}
];
var FILE_FIXES = {
	"Candida_albicans_Gram.jpg": "Candida_albicans.jpg",
	"Helicobacter_pylori_EM.jpg": "Helicobacter_pylori.jpg",
	"Root_nodules.jpg": "Glycine_max_root_nodules.jpg",
	"Gram_Stain_Technique.png": "Gram_stain_01.jpg",
	"SDS-PAGE_electrophoresis.jpg": "SDS-PAGE.jpg",
	"Gram-positive_and_negative_cell_wall.svg": "Gram_positive_bacteria.jpg",
	"Bacterial_colonies.jpg": "Petri_dish.jpg",
	"Neutrophil_with_anthrax_bacteria.jpg": "Neutrophil.jpg",
	"Entamoeba_histolytica_life_cycle_stages.jpg": "Entamoeba_histolytica.jpg",
	"Bacillus_subtilis_Spore_Stain.jpg": "Bacillus_subtilis_Spore.jpg"
};
var BROKEN_FILES = /* @__PURE__ */ new Set([
	"T4_phage.png",
	"Chlorella_vulgaris.jpg",
	"Trypanosoma_sp.PHIL_613_lores.jpg",
	"Phage_lysogenic_cycle.svg",
	"HIV-replication-cycle.png",
	"Calcium_alginate.jpg",
	"ELISA_direct_indirect.svg",
	"Autoclave_front.jpg",
	"Biosafety_cabinet.jpg",
	"Streptomyces.jpg",
	"Lactobacillus_sp_Gram.jpg",
	"Phage_lytic_cycle.svg"
]);
function commonsFile(file) {
	return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=640`;
}
var MEDIA_CATALOG = RAW_CATALOG.map((item) => {
	const file = wikimediaFileName(item.src);
	if (file && FILE_FIXES[file]) return {
		...item,
		src: commonsFile(FILE_FIXES[file])
	};
	if (file && BROKEN_FILES.has(file)) return {
		...item,
		src: uniqueBars(item.title),
		credit: "JUW-MicroSlides teaching visual (CC0)",
		source: "Generated open teaching diagram",
		license: "CC0"
	};
	if (file && item.src.includes("thumb.php")) return {
		...item,
		src: `https://commons.wikimedia.org/w/thumb.php?f=${encodeURIComponent(file)}&width=640`
	};
	if (file && item.src.includes("Special:FilePath")) return {
		...item,
		src: commonsFile(file)
	};
	return item;
});
function searchMedia(query, limit = 12, exclude = /* @__PURE__ */ new Set()) {
	const q = query.trim().toLowerCase();
	const pool = MEDIA_CATALOG.filter((item) => !exclude.has(item.id) && !exclude.has(mediaKey(item.src)));
	if (!q) return pool.slice(0, limit);
	const terms = q.split(/\s+/).filter((t) => t.length > 1);
	const scored = pool.map((item) => {
		const hay = `${item.title} ${item.keywords.join(" ")} ${item.kind} ${item.source}`.toLowerCase();
		return {
			item,
			score: terms.reduce((n, t) => n + (hay.includes(t) ? 2 : 0) + (item.title.toLowerCase().includes(t) ? 2 : 0), 0)
		};
	});
	scored.sort((a, b) => b.score - a.score);
	return scored.filter((x) => x.score > 0).map((s) => s.item).slice(0, limit);
}
function suggestMediaForText(text, limit = 3, exclude = /* @__PURE__ */ new Set()) {
	return searchMedia(text, limit, exclude);
}
function takeUniqueMedia(text, used) {
	const hit = searchMedia(text, 8, used)[0];
	if (hit) return hit;
	return teachingVisual(text, used);
}
function fallbackVisual(title) {
	return teachingVisual(title || "Open teaching figure", /* @__PURE__ */ new Set());
}
function applyCollectedMedia(deck, collected) {
	return attachUniqueMedia(deck, [
		...Object.values(collected?.assigned ?? {}),
		...collected?.pool ?? [],
		...collected?.items ?? []
	], collected?.assigned);
}
function attachUniqueMedia(deck, extras = [], preferred = {}) {
	const used = /* @__PURE__ */ new Set();
	const slides = deck.slides.map((slide) => {
		if (slide.layout === "title") return {
			...slide,
			media: []
		};
		const preferredHit = preferred[slide.id];
		if (preferredHit && !used.has(preferredHit.id) && !used.has(mediaKey(preferredHit.src))) {
			used.add(preferredHit.id);
			used.add(mediaKey(preferredHit.src));
			return {
				...slide,
				media: [preferredHit]
			};
		}
		const existing = slide.media.filter((m) => {
			const key = mediaKey(m.src);
			if (used.has(m.id) || used.has(key)) return false;
			used.add(m.id);
			used.add(key);
			return true;
		});
		if (existing.length > 0) return {
			...slide,
			media: existing.slice(0, 1)
		};
		const query = `${slide.title} ${slide.subtitle} ${slide.bullets.join(" ")} ${slide.leftBullets.join(" ")} ${deck.topic} ${deck.discipline}`;
		const media = extras.find((m) => !used.has(m.id) && !used.has(mediaKey(m.src)) && matchesQuery(m, query)) ?? takeUniqueMedia(query, used);
		used.add(media.id);
		used.add(mediaKey(media.src));
		return {
			...slide,
			media: [media]
		};
	});
	const pool = [];
	const seen = new Set(used);
	const candidates = [
		...deck.mediaPool ?? [],
		...extras,
		...searchMedia(`${deck.topic} ${deck.discipline}`, 80, seen),
		...searchMedia("", 80, seen)
	];
	for (const item of candidates) {
		const key = mediaKey(item.src);
		if (seen.has(item.id) || seen.has(key)) continue;
		seen.add(item.id);
		seen.add(key);
		pool.push(item);
		if (pool.length >= 64) break;
	}
	let spare = 0;
	while (pool.length < 16) {
		const vis = teachingVisual(`${deck.topic} unused ${spare} ${deck.discipline}`, seen);
		pool.push(vis);
		spare += 1;
		if (spare > 24) break;
	}
	return {
		...deck,
		slides,
		mediaPool: pool
	};
}
function matchesQuery(item, query) {
	const hay = `${item.title} ${item.keywords.join(" ")}`.toLowerCase();
	return query.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2).some((t) => hay.includes(t));
}
function teachingVisual(seed, used) {
	const s = seed.toLowerCase();
	const templates = [
		{
			id: "viz-growth",
			kind: "chart",
			title: "Microbial growth curve",
			draw: growthChart,
			hit: /growth|lag|log phase|cfu|batch.culture/
		},
		{
			id: "viz-immobilise",
			kind: "diagram",
			title: "Enzyme immobilisation modes",
			draw: immobiliseDiagram,
			hit: /immobil|enzyme|alginate|adsorption|entrap|covalent/
		},
		{
			id: "viz-oxygen",
			kind: "chart",
			title: "Oxygen classes of microbes",
			draw: oxygenChart,
			hit: /oxygen|aerob|anaerob|microaeroph/
		},
		{
			id: "viz-gram",
			kind: "diagram",
			title: "Gram wall comparison",
			draw: gramDiagram,
			hit: /gram|peptidoglycan|envelope|staph|mrsa|wall/
		},
		{
			id: "viz-cycle",
			kind: "diagram",
			title: "Replication cycle",
			draw: cycleDiagram,
			hit: /cycle|replicat|virus|viral|phage|baltimore/
		},
		{
			id: "viz-mic",
			kind: "chart",
			title: "MIC dilution series",
			draw: micChart,
			hit: /mic\b|dilution|ast|antibiotic|resist/
		},
		{
			id: "viz-central",
			kind: "diagram",
			title: "Central dogma in microbes",
			draw: dogmaDiagram,
			hit: /dna|rna|translat|transcri|gene|pcr|16s|qpcr/
		},
		{
			id: "viz-hurdle",
			kind: "diagram",
			title: "Hurdle technology",
			draw: hurdleDiagram,
			hit: /hurdle|food|spoilage|aw\b|dairy/
		},
		{
			id: "viz-mm",
			kind: "chart",
			title: "Michaelis–Menten kinetics",
			draw: mmChart,
			hit: /kinetics|michaelis|km\b|vmax|enzyme/
		},
		{
			id: "viz-pcr",
			kind: "diagram",
			title: "Thermal cycle",
			draw: pcrDiagram,
			hit: /pcr|qpcr|thermal|primer|amplicon|16s/
		},
		{
			id: "viz-biofilm",
			kind: "diagram",
			title: "Biofilm stages",
			draw: biofilmDiagram,
			hit: /biofilm|eps|device|catheter/
		},
		{
			id: "viz-batch",
			kind: "chart",
			title: "Batch vs fed-batch",
			draw: batchChart,
			hit: /fed-batch|bioreactor|ferment|industrial/
		},
		{
			id: "viz-bars",
			kind: "chart",
			title: "Lecture quantitative panel",
			draw: uniqueBars,
			hit: /.*/
		},
		{
			id: "viz-flow",
			kind: "diagram",
			title: "Process flow",
			draw: uniqueFlow,
			hit: /.*/
		}
	];
	const matched = templates.filter((t) => t.hit.test(s));
	const pool = matched.length ? matched : templates.filter((t) => t.id === "viz-bars" || t.id === "viz-flow");
	const start = Math.abs(hash(seed)) % pool.length;
	for (let i = 0; i < pool.length; i++) {
		const t = pool[(start + i) % pool.length];
		const id = `${t.id}-${hash(seed + t.id).toString(36)}`;
		if (used.has(id)) continue;
		used.add(id);
		return {
			id,
			kind: t.kind,
			title: `${t.title} — ${seed.slice(0, 42)}`,
			src: t.draw(seed.slice(0, 48)),
			credit: "JUW-MicroSlides teaching visual (CC0)",
			source: "Generated open teaching diagram",
			license: "CC0",
			keywords: seed.toLowerCase().split(/\s+/).slice(0, 6)
		};
	}
	const id = `viz-card-${hash(seed).toString(36)}-${used.size}`;
	used.add(id);
	return {
		id,
		kind: "diagram",
		title: seed.slice(0, 64) || "Teaching visual",
		src: uniqueBars(seed),
		credit: "JUW-MicroSlides teaching visual (CC0)",
		source: "Generated open teaching diagram",
		license: "CC0",
		keywords: seed.toLowerCase().split(/\s+/).slice(0, 6)
	};
}
function hash(s) {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = h * 31 + s.charCodeAt(i) | 0;
	return Math.abs(h);
}
function svgWrap(body) {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">${body}</svg>`;
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
function growthChart(label) {
	return svgWrap(`<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Batch-culture growth curve</text>
     <text x="24" y="52" font-size="11" font-family="sans-serif" fill="#5c6b7a">${escapeXml(label)}</text>
     <polyline fill="none" stroke="#2f6f86" stroke-width="4" points="60,300 140,295 220,210 340,90 480,80 580,160"/>
     <text x="70" y="330" font-size="11" fill="#5c6b7a">lag</text>
     <text x="210" y="330" font-size="11" fill="#5c6b7a">log</text>
     <text x="400" y="330" font-size="11" fill="#5c6b7a">stationary</text>
     <text x="530" y="330" font-size="11" fill="#5c6b7a">death</text>`);
}
function immobiliseDiagram(label) {
	return svgWrap(`<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Enzyme immobilisation</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label)}</text>
     <circle cx="120" cy="190" r="54" fill="#c5d4de" stroke="#0b1520" stroke-width="2"/>
     <text x="120" y="196" text-anchor="middle" font-size="12">adsorption</text>
     <rect x="230" y="140" width="110" height="100" rx="8" fill="#e8edf4" stroke="#0b1520" stroke-width="2"/>
     <text x="285" y="196" text-anchor="middle" font-size="12">entrapment</text>
     <circle cx="430" cy="190" r="54" fill="#4e8ea8" opacity=".35" stroke="#0b1520" stroke-width="2"/>
     <text x="430" y="196" text-anchor="middle" font-size="12">covalent</text>
     <rect x="520" y="150" width="80" height="80" rx="40" fill="#954a33" opacity=".25" stroke="#0b1520" stroke-width="2"/>
     <text x="560" y="196" text-anchor="middle" font-size="12">membrane</text>`);
}
function oxygenChart(label) {
	return svgWrap(`<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Oxygen relationships</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label)}</text>
     ${[
		"obligate aerobe",
		"facultative",
		"aerotolerant",
		"microaerophile",
		"obligate anaerobe"
	].map((name, i) => `<rect x="${70 + i * 110}" y="110" width="90" height="180" rx="8" fill="#fff" stroke="#0b1520"/>
            <text x="${115 + i * 110}" y="310" text-anchor="middle" font-size="10">${name}</text>`).join("")}
     <circle cx="115" cy="140" r="12" fill="#2f6f86"/>
     <circle cx="225" cy="140" r="10" fill="#2f6f86"/><circle cx="225" cy="250" r="10" fill="#2f6f86"/>
     <circle cx="335" cy="200" r="10" fill="#2f6f86"/>
     <circle cx="445" cy="175" r="10" fill="#2f6f86"/>
     <circle cx="555" cy="260" r="12" fill="#2f6f86"/>`);
}
function gramDiagram(label) {
	return svgWrap(`<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Cell envelope</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label)}</text>
     <rect x="70" y="120" width="220" height="160" fill="#6b8f71"/>
     <rect x="90" y="150" width="180" height="100" fill="#d7c4a3"/>
     <text x="180" y="300" text-anchor="middle" font-size="13">Gram-positive</text>
     <rect x="360" y="120" width="220" height="160" fill="#c5d4de"/>
     <rect x="380" y="145" width="180" height="24" fill="#954a33"/>
     <rect x="380" y="185" width="180" height="40" fill="#6b8f71"/>
     <rect x="380" y="240" width="180" height="24" fill="#d7c4a3"/>
     <text x="470" y="300" text-anchor="middle" font-size="13">Gram-negative</text>`);
}
function cycleDiagram(label) {
	return svgWrap(`<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Infection / replication cycle</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label)}</text>
     ${[
		"attach",
		"enter",
		"replicate",
		"assemble",
		"release"
	].map((n, i) => {
		const x = 70 + i * 110;
		return `<circle cx="${x + 30}" cy="190" r="34" fill="#4e8ea8" opacity=".3" stroke="#0b1520"/>
                 <text x="${x + 30}" y="196" text-anchor="middle" font-size="12">${n}</text>
                 ${i < 4 ? `<path d="M${x + 70} 190 h30" stroke="#0b1520" marker-end="url(#a)"/>` : ""}`;
	}).join("")}`);
}
function micChart(label) {
	return svgWrap(`<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Broth microdilution (MIC)</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label)}</text>
     ${Array.from({ length: 8 }, (_, i) => {
		const x = 50 + i * 70;
		return `<rect x="${x}" y="120" width="58" height="140" rx="6" fill="${i < 4 ? "#c5d4de" : "#f7f4ec"}" stroke="#0b1520"/>
               <text x="${x + 29}" y="290" text-anchor="middle" font-size="10">${64 >> i} µg</text>`;
	}).join("")}
     <text x="50" y="330" font-size="12" fill="#2f6f86">growth →</text>
     <text x="430" y="330" font-size="12" fill="#2f6f86">MIC (first clear well)</text>`);
}
function dogmaDiagram(label) {
	return svgWrap(`<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Information flow</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label)}</text>
     <rect x="40" y="150" width="140" height="70" rx="8" fill="#fff" stroke="#0b1520"/><text x="110" y="190" text-anchor="middle">DNA</text>
     <rect x="250" y="150" width="140" height="70" rx="8" fill="#fff" stroke="#0b1520"/><text x="320" y="190" text-anchor="middle">mRNA</text>
     <rect x="460" y="150" width="140" height="70" rx="8" fill="#fff" stroke="#0b1520"/><text x="530" y="190" text-anchor="middle">protein</text>
     <text x="175" y="140" font-size="12">transcription</text>
     <text x="385" y="140" font-size="12">translation</text>`);
}
function hurdleDiagram(label) {
	return svgWrap(`<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Hurdle technology</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label)}</text>
     ${[
		"pH",
		"aw",
		"T°",
		"salt",
		"MAP",
		"compete"
	].map((n, i) => `<rect x="${50 + i * 95}" y="${120 + i % 2 * 20}" width="80" height="120" fill="#4e8ea8" opacity="${.25 + i * .08}" stroke="#0b1520"/>
            <text x="${90 + i * 95}" y="310" text-anchor="middle" font-size="12">${n}</text>`).join("")}`);
}
function mmChart(label) {
	return svgWrap(`<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Michaelis–Menten</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label)}</text>
     <polyline fill="none" stroke="#2f6f86" stroke-width="4" points="50,300 90,220 140,160 220,120 340,95 520,85"/>
     <line x1="50" y1="80" x2="580" y2="80" stroke="#954a33" stroke-dasharray="6 4"/>
     <text x="500" y="72" font-size="12" fill="#954a33">Vmax</text>
     <text x="300" y="340" font-size="12" fill="#5c6b7a">[S] →</text>
     <text x="20" y="190" font-size="12" fill="#5c6b7a" transform="rotate(-90 20 190)">v</text>`);
}
function pcrDiagram(label) {
	return svgWrap(`<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">PCR thermal cycle</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label)}</text>
     ${[
		"95° denature",
		"55° anneal",
		"72° extend"
	].map((n, i) => {
		const x = 70 + i * 180;
		return `<rect x="${x}" y="130" width="150" height="110" rx="10" fill="#fff" stroke="#0b1520"/>
                 <text x="${x + 75}" y="192" text-anchor="middle" font-size="14">${n}</text>`;
	}).join("")}`);
}
function biofilmDiagram(label) {
	return svgWrap(`<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Biofilm development</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label)}</text>
     ${[
		"attach",
		"colonise",
		"EPS",
		"mature",
		"disperse"
	].map((n, i) => {
		const x = 50 + i * 118;
		return `<circle cx="${x + 40}" cy="190" r="${28 + i * 3}" fill="#4e8ea8" opacity="${.25 + i * .1}" stroke="#0b1520"/>
                 <text x="${x + 40}" y="270" text-anchor="middle" font-size="12">${n}</text>`;
	}).join("")}`);
}
function batchChart(label) {
	return svgWrap(`<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Batch vs fed-batch</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label)}</text>
     <polyline fill="none" stroke="#954a33" stroke-width="4" points="50,300 120,200 220,120 400,110 560,200"/>
     <polyline fill="none" stroke="#2f6f86" stroke-width="4" points="50,300 140,240 240,160 360,100 560,70"/>
     <text x="430" y="70" font-size="12" fill="#2f6f86">fed-batch</text>
     <text x="430" y="200" font-size="12" fill="#954a33">batch</text>`);
}
function uniqueBars(label) {
	const h = hash(label);
	const bars = Array.from({ length: 7 }, (_, i) => {
		const ht = 48 + (h >> i * 3) % 170;
		const x = 70 + i * 76;
		return `<rect x="${x}" y="${300 - ht}" width="52" height="${ht}" fill="${i % 2 ? "#2f6f86" : "#954a33"}" opacity="${.45 + i % 3 * .15}"/>
            <text x="${x + 26}" y="322" text-anchor="middle" font-size="9" fill="#5c6b7a">${String.fromCharCode(65 + i)}</text>`;
	}).join("");
	return svgWrap(`<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Open teaching chart</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label.slice(0, 72))}</text>
     ${bars}`);
}
function uniqueFlow(label) {
	const words = label.split(/\s+/).filter((w) => w.length > 3).slice(0, 4);
	const steps = words.length ? words : [
		"sample",
		"assay",
		"read",
		"decide"
	];
	const nodes = steps.map((w, i) => {
		const x = 40 + i * 150;
		return `<rect x="${x}" y="140" width="130" height="80" rx="10" fill="#fff" stroke="#0b1520"/>
              <text x="${x + 65}" y="186" text-anchor="middle" font-size="13">${escapeXml(w.slice(0, 12))}</text>
              ${i < steps.length - 1 ? `<path d="M${x + 134} 180 h12" stroke="#0b1520" stroke-width="2"/>` : ""}`;
	}).join("");
	return svgWrap(`<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Open teaching schematic</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label.slice(0, 72))}</text>
     ${nodes}`);
}
function escapeXml(s) {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
var SLIDE_THEMES = [
	"classic",
	"gram",
	"culture",
	"fluorescence",
	"molecular",
	"clinical",
	"mycology",
	"outbreak",
	"parasitology",
	"phycology"
];
var THEME_TOKENS = {
	classic: {
		id: "classic",
		label: "Classic lecture",
		blurb: "Terracotta frame, paper white — official JUW title template",
		frame: "#954A33",
		band: "#C8DBE1",
		slide: "#FFFFFF",
		ink: "#1A2433",
		navy: "#0B1520",
		accent: "#4E8EA8",
		muted: "#5C6B7A",
		dark: false
	},
	gram: {
		id: "gram",
		label: "Gram stain",
		blurb: "Crystal violet rods and safranin cocci",
		frame: "#4A1D6A",
		band: "#D4C4E8",
		slide: "#FAF7FF",
		ink: "#2A1240",
		navy: "#3D1560",
		accent: "#C45C6A",
		muted: "#6B5A7A",
		dark: false
	},
	culture: {
		id: "culture",
		label: "Culture plate",
		blurb: "Agar gold, colony umber, petri rings",
		frame: "#8A6A1A",
		band: "#EFE3B8",
		slide: "#FFFDF4",
		ink: "#3A2E10",
		navy: "#5C4A12",
		accent: "#C4A45A",
		muted: "#7A6B40",
		dark: false
	},
	fluorescence: {
		id: "fluorescence",
		label: "Fluorescence",
		blurb: "Dark-field cyan emission on black",
		frame: "#0D4A4A",
		band: "#071414",
		slide: "#0B1520",
		ink: "#D8F6F0",
		navy: "#7FF0D4",
		accent: "#3EE0B0",
		muted: "#7AA8A0",
		dark: true
	},
	molecular: {
		id: "molecular",
		label: "Molecular",
		blurb: "Genome navy, primer teal, gel ladder",
		frame: "#163A5C",
		band: "#C5D6E8",
		slide: "#F4F8FC",
		ink: "#0E2438",
		navy: "#12344D",
		accent: "#2F6F86",
		muted: "#5C6D82",
		dark: false
	},
	clinical: {
		id: "clinical",
		label: "Clinical",
		blurb: "Bench white and blood-agar red",
		frame: "#8B1E2D",
		band: "#F0D4D6",
		slide: "#FFFAFA",
		ink: "#2A1214",
		navy: "#6B1824",
		accent: "#C45C5C",
		muted: "#7A5C60",
		dark: false
	},
	mycology: {
		id: "mycology",
		label: "Mycology",
		blurb: "Forest hyphae and spore amber",
		frame: "#3D5C28",
		band: "#DCE8C8",
		slide: "#F7FAF0",
		ink: "#1E2E12",
		navy: "#2F4A1C",
		accent: "#7A9A3D",
		muted: "#5C6B4A",
		dark: false
	},
	outbreak: {
		id: "outbreak",
		label: "Outbreak / One Health",
		blurb: "Epidemiology slate, contact network, gold",
		frame: "#3D4A5C",
		band: "#D4DCE6",
		slide: "#F5F7FA",
		ink: "#1A2433",
		navy: "#243044",
		accent: "#C4A45A",
		muted: "#5C6B7A",
		dark: false
	},
	parasitology: {
		id: "parasitology",
		label: "Parasitology",
		blurb: "Blood-film wine and ring-form gold",
		frame: "#6B2A3A",
		band: "#F0D8C8",
		slide: "#FFF8F3",
		ink: "#2E1418",
		navy: "#5A2030",
		accent: "#B86A3D",
		muted: "#7A5C58",
		dark: false
	},
	phycology: {
		id: "phycology",
		label: "Phycology",
		blurb: "Chlorophyll green and diatom teal",
		frame: "#0E5C4A",
		band: "#C8E6DC",
		slide: "#F3FBF8",
		ink: "#0E2A22",
		navy: "#0E4A3C",
		accent: "#1F8A6E",
		muted: "#4E6E64",
		dark: false
	}
};
function themeOf(id) {
	if (id && id in THEME_TOKENS) return THEME_TOKENS[id];
	return THEME_TOKENS.classic;
}
function cycleTheme(index, layout) {
	if (layout === "title") return "classic";
	const pool = SLIDE_THEMES.filter((t) => t !== "classic");
	return pool[(Math.max(0, index) + pool.length - 1) % pool.length];
}
function themeVars(id) {
	const t = themeOf(id);
	return {
		"--color-frame": t.frame,
		"--color-frame-band": t.band,
		"--color-slide": t.slide,
		"--color-ink": t.ink,
		"--color-navy": t.navy,
		"--color-accent": t.accent,
		"--color-ink-muted": t.muted
	};
}
var LAYOUTS = [
	"title",
	"content",
	"two-column",
	"full-image",
	"blank"
];
var LEVELS = [
	"Undergraduate",
	"Graduate",
	"Medical school",
	"PhD / research seminar"
];
var CITATION_STYLES = [
	"Vancouver",
	"APA",
	"Harvard",
	"Nature",
	"AMA"
];
function emptySlide(partial) {
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
		...partial
	};
}
function pickModules(disciplineName, topic, needed) {
	const disc = getDiscipline(disciplineName) ?? DISCIPLINES[0];
	const topicTerms = topic.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
	const score = (m, fromSelected) => {
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
	const relevant = [...disc.modules.map((m) => ({
		m,
		s: score(m, true)
	})), ...DISCIPLINES.filter((d) => d.name !== disc.name).flatMap((d) => d.modules.map((m) => ({
		m,
		s: score(m, false)
	})))].sort((a, b) => b.s - a.s).filter((x) => x.s >= 3);
	const taken = /* @__PURE__ */ new Set();
	const out = [];
	for (const { m } of relevant) {
		const key = m.title.toLowerCase();
		if (taken.has(key)) continue;
		taken.add(key);
		out.push(m);
		if (out.length >= needed) return out;
	}
	return out;
}
function customise(text, topic) {
	const t = topic.trim();
	if (!t) return text;
	return text.replace(/\b(this topic|the topic)\b/gi, t);
}
function weaveTitle(modTitle, topic) {
	const t = topic.trim();
	if (!t) return modTitle;
	const hay = modTitle.toLowerCase();
	if (t.toLowerCase().split(/[^a-z0-9]+/).filter((x) => x.length > 2).some((term) => hay.includes(term))) return modTitle;
	return `${modTitle} — ${t}`;
}
function uniqueBeats(topic, notes) {
	const t = topic.trim() || "this topic";
	const brief = notes ? `Instructor brief: ${notes.slice(0, 160)}` : `Ask one student to restate ${t} in a single sentence.`;
	return [
		{
			layout: "content",
			title: `What ${t} actually is`,
			bullets: [
				`Give a one-sentence operational definition of ${t} that a first-year could mark.`,
				"Name the scale (molecule, cell, population, process) this lecture lives on.",
				"State what it is not — the nearest confusion students bring into the room.",
				"Write the noun you want on the exam script and nowhere else."
			],
			notes: `Open with the definition, not the history of ${t}.`
		},
		{
			layout: "content",
			title: `Why ${t} was hard to see`,
			bullets: [
				"Which method first made the phenomenon visible (stain, culture, assay, sequence, sensor)?",
				"What did a negative result mean in that first method?",
				"Which modern method replaced it for treatment or process decisions?",
				"Flag one artefact that still fools student practicals."
			],
			notes: "Method first, organism second."
		},
		{
			layout: "two-column",
			title: `${t}: compare and contrast`,
			leftBullets: [
				"What a novice confuses this with",
				"Shared jargon or surface features",
				"Where the textbooks overlap"
			],
			rightBullets: [
				"The discriminating test or structure",
				"The cost of getting it wrong",
				"The one sentence that should stay on the exam"
			],
			notes: "Fill one misconception live."
		},
		{
			layout: "content",
			title: `Methods that make ${t} visible`,
			bullets: [
				`Name the first-line stain, culture, or assay you would run before specialised tests for ${t}.`,
				"State what a negative result does — and does not — rule out.",
				"Pair a rapid method with a confirmatory method and say which is used for a decision.",
				"Flag one biosafety or contamination trap in the student laboratory."
			],
			notes: `Walk the bench workflow for ${t}.`
		},
		{
			layout: "full-image",
			title: `Read this figure — ${t}`,
			bullets: [
				"What is the specimen, stain, or schematic actually showing?",
				"Which labelled structure would be absent in a knockout or a failed process?",
				"Write one exam-style question whose answer is on this figure."
			],
			notes: "Do not talk over the figure for more than 90 seconds."
		},
		{
			layout: "content",
			title: `Case vignette — ${t}`,
			bullets: [
				"Give the room a short stem (patient, plant, fermenter, or outbreak) with two red herrings.",
				`Ask which observation would change the working model of ${t}.`,
				"Require one cited mechanism, not a list of names.",
				brief
			],
			notes: "Do not reveal the answer until a student commits out loud."
		},
		{
			layout: "content",
			title: `Quantitative check on ${t}`,
			bullets: [
				"Estimate an order of magnitude (size, doubling time, MIC, yield, Km, or CFU).",
				"Show the unit conversion students trip on.",
				"Sketch the expected curve, plate, or chromatogram — then the failure mode.",
				"Ask what would have to be true for the number to be 10-fold wrong."
			],
			notes: "Numbers beat adjectives."
		},
		{
			layout: "content",
			title: `Quality, safety, and regulation for ${t}`,
			bullets: [
				"Which standard, pharmacopoeia, or biosafety level actually governs the work?",
				"Name a release test (sterility, endotoxin, activity, identity) and what failure looks like.",
				"Where does documentation (batch record, SOP, chain of custody) sit in the lecture hour?",
				"What would an auditor ask that a student cannot currently answer?"
			],
			notes: "Do not skip this slide for industrial or clinical cohorts."
		},
		{
			layout: "content",
			title: `Molecular mechanism of ${t}`,
			bullets: [
				"Name the molecules that have to meet, in order, for the process to start.",
				"Identify the rate-limiting step and how you would know it in a graph.",
				"State one mutation, inhibitor, or process fault that breaks the chain.",
				"Translate the mechanism into a laboratory observable (band, colony, titre, OD)."
			],
			notes: "Mechanism must earn a figure."
		},
		{
			layout: "two-column",
			title: `${t}: laboratory vs lecture`,
			leftBullets: [
				"What the protocol actually does",
				"The control that is not optional",
				"The number you record"
			],
			rightBullets: [
				"What the textbook drawing hides",
				"The failure that looks like success",
				"The sentence you write in the lab book"
			],
			notes: "Pair with the practical manual if one exists."
		},
		{
			layout: "content",
			title: `History and evidence for ${t}`,
			bullets: [
				"Name the paper or experiment that first established the claim.",
				"What was measured, in what system, and what was the control?",
				"Which part of that evidence would not survive a modern methods review?",
				"What is the current consensus — and where is it still contested?"
			],
			notes: "Cite on this slide, not in the appendix only."
		},
		{
			layout: "content",
			title: `Diagnostics built on ${t}`,
			bullets: [
				"Is the test detecting antigen, nucleic acid, activity, or a host response?",
				"State sensitivity vs specificity in one spoken sentence.",
				"When would you still culture or sequence after a rapid test?",
				"Name a false-positive and a false-negative story."
			],
			notes: "Students over-trust a single rapid result."
		},
		{
			layout: "content",
			title: `Therapeutics and inhibitors around ${t}`,
			bullets: [
				"What is the actual target — enzyme, wall, ribosome, polymerase, host factor?",
				"How does resistance arise in one mutational or horizontal step?",
				"Which combination or stewardship rule exists because monotherapy fails?",
				"What would you monitor in a patient, fermenter, or field after dosing?"
			],
			notes: "Link mechanism to a named drug or process aid."
		},
		{
			layout: "content",
			title: `Ecology of ${t}`,
			bullets: [
				"Where does this live when we are not looking — host, soil, food, reactor, fomite?",
				"Which abiotic factor (pH, aw, O2, T) actually limits it?",
				"Name one interaction (competition, biofilm, phage, quorum) that changes the outcome.",
				"What would an environmental sample look like on a plate or a graph?"
			],
			notes: "Pathogenesis is ecology with a host."
		},
		{
			layout: "content",
			title: `Industrial / process view of ${t}`,
			bullets: [
				"Titre, yield, productivity — which one is the bottleneck here?",
				"Upstream vs downstream: where does the money and the failure sit?",
				"What would you immobilise, recycle, or contain?",
				"Name a scale-up surprise (shear, oxygen, phage, foam, fouling)."
			],
			notes: "Process numbers belong on the board."
		},
		{
			layout: "content",
			title: `Exam traps on ${t}`,
			bullets: [
				"The lookalike organism, pathway, or term that costs a mark.",
				"The unit, stain, or temperature students swap under time pressure.",
				"A true statement that is not the answer to the question asked.",
				"One question you will actually set, with the marking point."
			],
			notes: "Write the exam question before the last week."
		},
		{
			layout: "content",
			title: `Misconceptions about ${t}`,
			bullets: [
				"The school-biology sentence that is no longer true.",
				"The journalistic claim that overstates clinical or industrial impact.",
				"The figure students remember that is schematic, not a micrograph.",
				"The correction you want them to leave with."
			],
			notes: "Correct without humiliating."
		},
		{
			layout: "two-column",
			title: `${t}: in vitro vs in vivo`,
			leftBullets: [
				"What a flask or plate can prove",
				"The variable you actually control",
				"The endpoint you measure"
			],
			rightBullets: [
				"What a host, soil, or plant adds",
				"The variable you cannot freeze",
				"The endpoint that matters clinically or in the field"
			],
			notes: "Do not let in-vitro MIC become the whole story."
		},
		{
			layout: "content",
			title: `Genetics of ${t}`,
			bullets: [
				"Is the trait chromosomal, plasmid, phage, or regulatory?",
				"Name a screen or selection that found the gene.",
				"What does a knockout vs a knockdown vs a point mutant tell you?",
				"How would CRISPR or a reporter assay be used in this course?"
			],
			notes: "Genotype must map to a phenotype they can name."
		},
		{
			layout: "content",
			title: `Host response to ${t}`,
			bullets: [
				"Innate first: which cell and which PRR would see this?",
				"What soluble mediator changes the next 24 hours?",
				"Adaptive: antibody, CTL, or both — and what is the antigen?",
				"Immunopathology: when is the damage host-made?"
			],
			notes: "Immunology slides need a cell, not a word cloud."
		},
		{
			layout: "full-image",
			title: `Morphology that identifies ${t}`,
			bullets: [
				"Shape, arrangement, stain, and size — say them in that order.",
				"Which lookalike would a student call the same thing?",
				"What would SEM or TEM add that Gram cannot?"
			],
			notes: "The figure is the teaching object."
		},
		{
			layout: "content",
			title: `Biosafety for practicals on ${t}`,
			bullets: [
				"BSL and why — not the number in isolation, the route of exposure.",
				"PPE, sharps, and the one step students rush.",
				"Spill and inactivation: what actually kills it in this lab.",
				"What you will not culture in an undergraduate teaching room."
			],
			notes: "Safety is a slide, not a footnote."
		},
		{
			layout: "content",
			title: `Data and statistics for ${t}`,
			bullets: [
				"n, replicate, and biological vs technical — which did the paper actually do?",
				"Error bars: SD, SEM, or CI — read the caption.",
				"A p-value that does not change a process decision.",
				"Sketch the graph you would accept as replication."
			],
			notes: "Biostatistics belongs inside the science slide."
		},
		{
			layout: "content",
			title: `One key paper on ${t}`,
			bullets: [
				"Authors, year, journal — write them as a spoken citation.",
				"The figure that carries the claim.",
				"The limitation the authors themselves list.",
				"What experiment you would run next in this department."
			],
			notes: "Teach one paper well rather than ten badly."
		},
		{
			layout: "content",
			title: `Field, clinic, or plant: ${t} in the real world`,
			bullets: [
				"A Pakistani, regional, or JUW-relevant example if one exists.",
				"Who pays, who is at risk, and who decides.",
				"What surveillance or QC currently exists.",
				"The sentence a graduate might say in a job interview."
			],
			notes: "Localise without inventing prevalence."
		},
		{
			layout: "two-column",
			title: `${t}: advantages vs costs`,
			leftBullets: [
				"Why anyone uses or studies this",
				"The gain in titre, speed, or outcome",
				"The teaching value in MIC-4511"
			],
			rightBullets: [
				"Energy, money, time, or toxicity cost",
				"Failure mode at scale",
				"What you would not attempt in this lab"
			],
			notes: "Balance the hype slide."
		},
		{
			layout: "content",
			title: `Kinetic / process curve for ${t}`,
			bullets: [
				"Label the axes before you draw.",
				"Mark the operating window (temperature, pH, load, time).",
				"Show the overload, inhibition, or washout shape.",
				"Ask what a 2× change in the x-axis does to the product."
			],
			notes: "A labelled curve is better than a paragraph."
		},
		{
			layout: "content",
			title: `Immobilisation, containment, or formulation of ${t}`,
			bullets: [
				"Adsorption, entrapment, covalent, membrane — which fits this molecule or cell?",
				"What leaks, fouls, or denatures first?",
				"How many cycles until activity is half?",
				"What would you measure as a release test?"
			],
			notes: "Favourite JUW practical territory."
		},
		{
			layout: "content",
			title: `Contamination and failure modes of ${t}`,
			bullets: [
				"The most likely contaminant and how it announces itself.",
				"Phage, spore, mould, or chemical — pick the realistic one.",
				"The in-process test that would have caught it yesterday.",
				"What you throw away vs what you can rescue."
			],
			notes: "Failure is a teaching gift."
		},
		{
			layout: "content",
			title: `Ethics, dual use, and claims around ${t}`,
			bullets: [
				"What must not be over-claimed in a student poster?",
				"Human, animal, or environmental subjects — what approval exists?",
				"Dual-use: where does curiosity become a problem?",
				"How you cite someone else's figure without stealing it."
			],
			notes: "Keep it concrete."
		},
		{
			layout: "content",
			title: `Open questions still sitting on ${t}`,
			bullets: [
				"A measurement we still cannot make well.",
				"A mechanism that is inferred, not shown.",
				"A translation gap (bench → clinic / field / plant).",
				"A project a final-year student could finish in one term."
			],
			notes: "Leave research hunger, not despair."
		},
		{
			layout: "content",
			title: `Glossary students must not mix for ${t}`,
			bullets: [
				"Term A vs term B that sound like synonyms.",
				"The abbreviation that means two things in two chapters.",
				"A unit that changes the claim if you drop a prefix.",
				"The phrase you will penalise on the script."
			],
			notes: "A glossary slide can be oral."
		},
		{
			layout: "full-image",
			title: `Workflow schematic — ${t}`,
			bullets: [
				"Number the steps; say which one is rate-limiting.",
				"Circle the QC sample.",
				"Cross out the step you would never skip under time pressure."
			],
			notes: "Schematic, then silence."
		},
		{
			layout: "content",
			title: `Sample to result: a path through ${t}`,
			bullets: [
				"Collection / sampling error that cannot be fixed later.",
				"Transport and holding time.",
				"The assay window.",
				"How the report is worded so a clinician or plant manager can act."
			],
			notes: "Pre-analytical error is most of error."
		},
		{
			layout: "content",
			title: `Controls you will actually run for ${t}`,
			bullets: [
				"Positive, negative, and reagent blank — what each rules out.",
				"The control that is missing from a student protocol.",
				"What you do when the control fails and the sample looks fine.",
				"How many times you repeat before you believe it."
			],
			notes: "Controls are not decoration."
		},
		{
			layout: "two-column",
			title: `${t}: classical vs molecular`,
			leftBullets: [
				"Culture, stain, biochemical",
				"Slow, cheap, phenotypic",
				"What it still catches that PCR misses"
			],
			rightBullets: [
				"NAAT, WGS, proteomics",
				"Fast, expensive, genotypic",
				"What a sequence cannot tell you about viability"
			],
			notes: "Both stay in the course."
		},
		{
			layout: "content",
			title: `Public-health or One Health angle on ${t}`,
			bullets: [
				"Human, animal, and environment — where does the reservoir sit?",
				"A surveillance number you can cite without guessing.",
				"An intervention that is not a new drug (water, vaccine, hygiene, process).",
				"What a microbiology graduate adds to an outbreak or plant meeting."
			],
			notes: "Keep claims sourced."
		},
		{
			layout: "content",
			title: `Instrumentation for ${t}`,
			bullets: [
				"The instrument in this department that actually measures it.",
				"Calibration and the blank.",
				"The artefact (bubble, path length, matrix) students ignore.",
				"When a cheaper method is scientifically better."
			],
			notes: "Name the machine."
		},
		{
			layout: "content",
			title: `Design a mini-experiment on ${t}`,
			bullets: [
				"Hypothesis in one line.",
				"Independent and dependent variable.",
				"n and the control.",
				"The figure you would present, including axes."
			],
			notes: "Workshop slide — 4 minutes silent writing."
		},
		{
			layout: "content",
			title: `What a good lab notebook page for ${t} looks like`,
			bullets: [
				"Date, strain or lot, operator.",
				"The raw number, not the processed one.",
				"Deviation from SOP, in the line it happened.",
				"The conclusion that a stranger could audit."
			],
			notes: "GMP-lite for undergraduates."
		}
	].map((row) => emptySlide(row));
}
function moduleAspectSlides(modules, topic) {
	const aspects = [
		{
			label: "how we visualise it",
			layout: "full-image",
			bullets: (mod) => [
				`Which stain, plate, chromatogram, or micrograph makes “${mod.title}” obvious in 10 seconds?`,
				"What would be missing in a knockout, a failed batch, or a negative control?",
				`Write one exam question whose answer is on the figure for ${topic}.`
			],
			notes: "Figure first, then silence."
		},
		{
			label: "method that decides",
			layout: "content",
			bullets: (mod) => [
				customise(mod.bullets[0] ?? mod.title, topic),
				"Name the first-line assay and the confirmatory assay.",
				"State what a negative result does not rule out.",
				"Flag the biosafety or contamination trap on this bench."
			],
			notes: "Method first, then the decision."
		},
		{
			label: "numbers",
			layout: "content",
			bullets: (mod) => [
				`Estimate an order of magnitude that belongs with ${mod.title.toLowerCase()} (${topic}).`,
				"Show the unit conversion students trip on.",
				"Sketch the expected curve, plate, or chromatogram — then the failure mode.",
				customise(mod.bullets[1] ?? "Name the control that makes the number believable.", topic)
			],
			notes: "Numbers beat adjectives."
		},
		{
			label: "compare",
			layout: "two-column",
			bullets: () => [],
			left: (mod) => [
				"Novice confusion",
				mod.keywords[0] ? `Looks like ${mod.keywords[0]}` : "Shared jargon",
				"Textbook overlap"
			],
			right: (mod) => [
				"Discriminating test",
				`Cost of getting ${mod.title.toLowerCase()} wrong`,
				"Exam sentence"
			],
			notes: "Fill one misconception live."
		},
		{
			label: "failure modes",
			layout: "content",
			bullets: (mod) => [
				`The most likely way ${mod.title.toLowerCase()} fails in a student practical on ${topic}.`,
				"What the plate, peak, or stain looks like when it has already failed.",
				"The in-process test that would have caught it yesterday.",
				customise(mod.bullets[2] ?? "What you throw away vs what you can rescue.", topic)
			],
			notes: "Failure is a teaching gift."
		},
		{
			label: "exam trap",
			layout: "content",
			bullets: (mod) => [
				`The lookalike term next to ${mod.title.toLowerCase()} that costs a mark.`,
				customise(mod.bullets[3] ?? "A true statement that is not the answer asked.", topic),
				"The unit, stain, or temperature students swap under time pressure.",
				"One question you will actually set, with the marking point."
			],
			notes: "Write the exam question before the last week."
		}
	];
	const out = [];
	for (const mod of modules) for (const aspect of aspects) {
		const two = aspect.layout === "two-column";
		out.push(emptySlide({
			layout: aspect.layout,
			title: `${customise(weaveTitle(mod.title, topic), topic)} — ${aspect.label}`,
			bullets: two ? [] : aspect.bullets(mod),
			leftBullets: two ? aspect.left?.(mod) ?? [] : [],
			rightBullets: two ? aspect.right?.(mod) ?? [] : [],
			notes: aspect.notes
		}));
	}
	return out;
}
function stationBank(topic, notes) {
	const t = topic.trim() || "this topic";
	const enzymeTopic = /immobil|enzyme|ferment|bioreactor|kinetics|downstream/.test(t.toLowerCase());
	return [
		[
			"claim station",
			"Write one falsifiable claim.",
			"Name the control.",
			"Name the endpoint.",
			"Name the figure."
		],
		[
			"stain station",
			"Pick Gram, acid-fast, spore, or capsule.",
			"What colour is a positive?",
			"What does negative not rule out?",
			"Biosafety note."
		],
		[
			"plate station",
			"Choose selective vs differential.",
			"Colony you expect.",
			"Colony that means contamination.",
			"Incubation time and atmosphere."
		],
		[
			"curve station",
			"Label both axes.",
			"Mark lag / log / stationary — or Km / Vmax.",
			"Draw the failure shape.",
			"What a 2× x-axis change does."
		],
		[
			"MIC station",
			"Dilution series you would pour.",
			"First clear well means…",
			"Why turbidity is not CFU.",
			"Quality-control organism."
		],
		[
			"PCR station",
			"Target gene and why.",
			"Controls: extraction, NTC, positive.",
			"What a band does not prove.",
			"Contamination trap."
		],
		[
			"ELISA station",
			"Antigen vs antibody capture.",
			"Blank, standard, sample.",
			"Hook effect in one sentence.",
			"When you still culture."
		],
		[
			"fermenter station",
			"Batch vs fed-batch vs immobilised.",
			"DOT, pH, foam — which alarms first?",
			"Harvest criterion.",
			"Phage or contamination signature."
		],
		[
			"immobilisation station",
			"Adsorption, entrapment, covalent, membrane.",
			"What leaks first?",
			"Cycles to 50% activity.",
			"Release test."
		],
		[
			"downstream station",
			"Centrifuge vs filter vs chromatography.",
			"Yield vs purity trade-off.",
			"Where the money sits.",
			"A scale-up surprise."
		],
		[
			"biofilm station",
			"Attachment → EPS → mature → disperse.",
			"Why MIC lies.",
			"Device or plant surface.",
			"How you would image it."
		],
		[
			"outbreak station",
			"Case definition.",
			"Reservoir vs vehicle.",
			"First control measure that is not a new drug.",
			"What the lab must report today."
		],
		[
			"AMR station",
			"The gene or the phenotype?",
			"Horizontal vs mutational.",
			"Stewardship sentence.",
			"A Pakistani or regional example if sourced."
		],
		[
			"vaccine station",
			"Antigen actually in the vial.",
			"Live, killed, subunit, mRNA.",
			"Correlates of protection — or their absence.",
			"Cold chain."
		],
		[
			"notebook station",
			"Date, strain/lot, operator.",
			"Raw number, not the processed one.",
			"Deviation in the line it happened.",
			"Audit sentence."
		],
		[
			"ethics station",
			"What you will not over-claim on a poster.",
			"Whose figure is this, and the licence?",
			"Dual-use line you will not cross.",
			"Approval that exists — or does not."
		],
		[
			"instrument station",
			"Name the machine in this department.",
			"Blank and calibration.",
			"The artefact students ignore.",
			"When a cheaper method is better."
		],
		[
			"One Health station",
			"Human / animal / environment reservoir.",
			"Surveillance number you can cite.",
			"Intervention that is not a new drug.",
			"What a graduate adds in the meeting."
		],
		[
			"QC station",
			"Identity, potency, sterility, endotoxin — pick one.",
			"Pharmacopoeia or SOP clause.",
			"OOS: retest vs reject.",
			"Auditor question."
		],
		[
			"imaging station",
			"Bright-field vs fluorescence vs SEM/TEM.",
			"Resolution vs the structure you claim.",
			"Artefact that looks like a vesicle.",
			"Scale bar sentence."
		]
	].filter((row) => enzymeTopic || !/immobilisation|fermenter|downstream/.test(row[0])).map((row, i) => {
		const [label, a, b, c, d] = row;
		const two = i % 5 === 3;
		return emptySlide({
			layout: two ? "two-column" : i % 6 === 2 ? "full-image" : "content",
			title: `${t}: ${label}`,
			bullets: two ? [] : [
				a,
				b,
				c,
				d,
				notes ? `Instructor brief: ${notes.slice(0, 120)}` : `Keep this station on ${t} only — do not recycle another lecture’s figure.`
			].slice(0, 4),
			leftBullets: two ? [a, b] : [],
			rightBullets: two ? [c, d] : [],
			notes: `Station ${i + 1} — unique to ${t}.`
		});
	});
}
function uniqueBeatSlide(topic, n, notes) {
	const t = topic.trim() || "this topic";
	const prompts = [
		[
			"What must be true",
			"Write a necessary condition.",
			"Write a sufficient condition.",
			"Name a confounder.",
			"What experiment separates them?"
		],
		[
			"Draw it",
			"Axes or scale bar first.",
			"The structure a knockout would lose.",
			"The artefact students call real.",
			"One exam question on this figure."
		],
		[
			"Time course",
			"t0 measurement.",
			"The sampling interval.",
			"When you stop.",
			"What late looks like vs contamination."
		],
		[
			"Dose / load",
			"Low, working, overload.",
			"The unit.",
			"The toxic or denaturing edge.",
			"How you would plot it."
		],
		[
			"Compare two systems",
			"Shared mechanism.",
			"Discriminating test.",
			"Where a student mixes the names.",
			"Which one this lecture is about."
		],
		[
			"Report line",
			"What the lab actually writes.",
			"What a clinician or plant manager hears.",
			"A number that is not actionable.",
			"The follow-up sample."
		],
		[
			"History beat",
			"Who first saw it.",
			"What they measured.",
			"What would not survive review now.",
			"The current consensus."
		],
		[
			"Localisation",
			"JUW / regional example if sourced.",
			"Who is at risk.",
			"Who decides.",
			"The interview sentence."
		]
	];
	const row = prompts[(n - 1) % prompts.length];
	const round = Math.ceil(n / prompts.length);
	const [label, a, b, c, d] = row;
	return emptySlide({
		layout: n % 5 === 0 ? "full-image" : n % 4 === 0 ? "two-column" : "content",
		title: `${t}: ${label} (${round}.${(n - 1) % prompts.length + 1})`,
		bullets: n % 4 === 0 ? [] : [
			a,
			b,
			c,
			d
		],
		leftBullets: n % 4 === 0 ? [a, b] : [],
		rightBullets: n % 4 === 0 ? [c, d] : [],
		notes: notes ? `Instructor brief: ${notes.slice(0, 140)}` : `Unique beat ${n} on ${t}.`
	});
}
function introSlide(topic, notes) {
	return emptySlide({
		layout: "title",
		theme: "classic",
		title: topic.trim(),
		subtitle: "",
		notes: notes || `Opening lecture slide in the official JUW Department of Microbiology frame. Only the topic name changes for each generate.`
	});
}
function withOfficialIntro(deck, input) {
	const meta = lectureMeta(input);
	const topic = input.topic.trim() || deck.topic || deck.title;
	let slides = deck.slides.map((s) => ({ ...s }));
	const intro = introSlide(topic, input.notes);
	if (!slides.length || slides[0].layout !== "title") slides = [intro, ...slides];
	else slides[0] = {
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
		media: []
	};
	slides = slides.map((s, i) => ({
		...s,
		theme: cycleTheme(i, s.layout)
	}));
	return {
		...deck,
		...meta,
		title: topic,
		topic,
		discipline: input.discipline || deck.discipline,
		level: input.level || deck.level,
		mediaPool: deck.mediaPool ?? [],
		slides
	};
}
function generateLocalDeck(input) {
	const topic = input.topic.trim() || input.discipline || "Microbiology";
	const discipline = input.discipline || "General Microbiology";
	const count = Math.min(400, Math.max(1, Math.round(input.count || 10)));
	const seeds = seedCitations(discipline);
	const meta = lectureMeta(input);
	const slides = [];
	const titles = /* @__PURE__ */ new Set();
	const push = (slide) => {
		const key = slide.title.trim().toLowerCase();
		if (titles.has(key)) return false;
		titles.add(key);
		slides.push(slide);
		return true;
	};
	push(introSlide(topic, input.notes ? `Instructor brief: ${input.notes}` : void 0));
	if (slides[0]) slides[0].citations = seeds.slice(0, 1);
	const closing = count >= 6 ? 3 : count >= 4 ? 2 : 0;
	const wantObjectives = count >= 3;
	const contentNeeded = Math.max(0, count - 1 - (wantObjectives ? 1 : 0) - closing);
	const modules = pickModules(discipline, topic, Math.max(contentNeeded, 80));
	if (wantObjectives) push(emptySlide({
		layout: "content",
		title: "Learning objectives",
		bullets: modules.length > 0 ? modules.slice(0, 4).map((m, i) => {
			return `${[
				"Define",
				"Explain",
				"Compare",
				"Apply"
			][i] ?? "Describe"} ${m.title.toLowerCase()} in the context of ${topic}.`;
		}) : [
			`Define ${topic} in one operational sentence a first-year could mark.`,
			`Explain a method that makes ${topic} visible on the bench or in a figure.`,
			`Compare ${topic} with the nearest confusion students bring into the room.`,
			`Apply ${topic} to a case, plate, outbreak, or process decision.`
		],
		notes: "Read these aloud. They are the exam contract for this hour."
	}));
	modules.forEach((mod, idx) => {
		if (slides.length >= count - closing) return;
		const isTwo = idx % 5 === 3 && mod.bullets.length >= 4;
		push(emptySlide({
			layout: isTwo ? "two-column" : idx % 7 === 2 ? "full-image" : "content",
			title: weaveTitle(customise(mod.title, topic), topic),
			bullets: isTwo ? [] : mod.bullets.map((b) => customise(b, topic)),
			leftBullets: isTwo ? mod.bullets.slice(0, Math.ceil(mod.bullets.length / 2)) : [],
			rightBullets: isTwo ? mod.bullets.slice(Math.ceil(mod.bullets.length / 2)) : [],
			notes: mod.notes,
			citations: idx === 0 ? seeds.slice(0, 1) : idx === 1 ? seeds.slice(1, 2) : []
		}));
	});
	for (const extra of uniqueBeats(topic, input.notes)) {
		if (slides.length >= count - closing) break;
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
	if (closing >= 3) push(emptySlide({
		layout: "content",
		title: `Why ${topic} matters`,
		bullets: [
			`Connect ${topic} to diagnostics, therapeutics, or environmental practice the class will meet this term.`,
			"Identify one misconception a first-year student typically brings into the room.",
			"Name a method (stain, culture, PCR, serology, sequencing) that makes the organism or process visible.",
			input.notes ? `Instructor emphasis: ${input.notes.slice(0, 180)}` : "Leave five minutes for a single exam-style question on this slide."
		],
		notes: "This is the transfer slide — do not introduce new jargon here.",
		citations: seeds.slice(-1)
	}));
	if (closing >= 2) push(emptySlide({
		layout: "content",
		title: "Take-home points",
		bullets: modules.length > 0 ? modules.slice(0, 4).map((m) => m.bullets[0] ?? m.title) : [
			`State the operational definition of ${topic}.`,
			`Name the method that makes ${topic} visible.`,
			"Write the discriminating test, not the lookalike.",
			"One exam sentence — then stop talking."
		],
		notes: "Stop talking after this slide. Let the room write one sentence."
	}));
	if (closing >= 3) {
		const used = /* @__PURE__ */ new Map();
		slides.forEach((s) => s.citations.forEach((c) => used.set(c.id, c)));
		seeds.forEach((c) => used.set(c.id, c));
		push(emptySlide({
			layout: "content",
			title: "Selected references",
			bullets: [...used.values()].map((c) => `${c.authors} (${c.year}). ${c.title}.`),
			notes: "These are canonical starting citations. Attach PubMed hits per slide in the Cite panel.",
			citations: [...used.values()]
		}));
	}
	return attachUniqueMedia({
		id: uid("deck"),
		title: topic,
		topic,
		discipline,
		level: input.level,
		citationStyle: "Vancouver",
		...meta,
		slides: slides.slice(0, count).map((s, i) => ({
			...s,
			theme: cycleTheme(i, s.layout)
		})),
		mediaPool: [],
		updatedAt: Date.now()
	});
}
function sampleDeck() {
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
		department: "Department of Microbiology"
	});
	deck.id = "sample-enzyme-mic4511";
	deck.updatedAt = 1;
	deck.slides.forEach((slide, i) => {
		slide.id = `sample-s-${i}`;
	});
	return deck;
}
//#endregion
export { withOfficialIntro as S, suggestDiscipline as _, LEVELS as a, themeOf as b, applyCollectedMedia as c, fallbackVisual as d, formatCitation as f, searchMedia as g, sampleDeck as h, LAYOUTS as i, attachUniqueMedia as l, lectureMeta as m, DISCIPLINES as n, SLIDE_THEMES as o, generateLocalDeck as p, JUW as r, THEME_TOKENS as s, CITATION_STYLES as t, cycleTheme as u, suggestMediaForText as v, themeVars as x, takeUniqueMedia as y };
