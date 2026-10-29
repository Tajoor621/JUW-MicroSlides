export type TopicSection = { title: string; bullets: string[] };
export type TopicProfile = {
  key: string;
  match: RegExp;
  scope: string;
  course: string;
  objectives: string[];
  sources: string[];
  sections: TopicSection[];
};
const section = (title: string, ...bullets: string[]): TopicSection => ({ title, bullets });
export const TOPIC_PROFILES: TopicProfile[] = [
  {
    key: "immobilization",
    match: /\b(immobili[sz](?:ation|ed|ing)?|enzyme immobil)/i,
    scope: "Attachment methods, support properties, catalytic performance and reuse",
    course: "Microbial Enzyme Technology",
    objectives: [
      "Compare adsorption, covalent binding, entrapment and cross-linking.",
      "Explain how support chemistry and transport affect observed activity.",
      "Evaluate recovery, stability and reuse using controlled measurements.",
    ],
    sources: [
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC3787205/",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC3563746/",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC4434042/",
    ],
    sections: [
      section(
        "Immobilised biocatalysts",
        "An enzyme is retained on a support or within a confined phase while substrates and products can exchange.",
        "Retention enables catalyst recovery; it does not guarantee greater catalytic activity.",
        "The attachment method and the reaction environment must be considered together.",
      ),
      section(
        "Physical adsorption",
        "Hydrophobic, electrostatic and other non-covalent interactions retain the protein on a surface.",
        "Preparation is often simple, but changes in pH or ionic strength can promote desorption.",
        "Enzyme loading and retained catalytic activity are separate outcomes.",
      ),
      section(
        "Covalent attachment",
        "Reactive groups on the protein form covalent bonds with a functionalized support.",
        "Attachment can reduce leaching, while unfavorable orientation or modification can impair activity.",
        "Coupling chemistry must be compatible with the enzyme and its active-site environment.",
      ),
      section(
        "Entrapment and encapsulation",
        "The catalyst is confined within a gel, porous matrix or membrane-bound compartment.",
        "Pore structure must retain the enzyme while allowing reactant transport.",
        "Diffusion limitations can reduce observed reaction rates even when the enzyme remains active.",
      ),
      section(
        "Cross-linked enzyme preparations",
        "Cross-linking connects enzyme molecules into recoverable aggregates or networks.",
        "Carrier-free preparations can increase catalyst density.",
        "Mechanical properties, diffusional resistance and retained activity require experimental assessment.",
      ),
      section(
        "Choosing a support",
        "Surface chemistry influences binding, orientation and local hydration.",
        "Porosity and particle size affect accessible area and diffusion distance.",
        "Mechanical strength, cost and compatibility with downstream processing also influence selection.",
      ),
      section(
        "Loading versus activity recovery",
        "Protein retained on the support estimates loading, rather than catalytic performance.",
        "Activity recovery compares measured activity before and after immobilisation under defined conditions.",
        "Loss of soluble enzyme and changes in assay conditions can confound the comparison.",
      ),
      section(
        "External mass transfer",
        "Reactants must travel from the bulk liquid to the catalyst surface.",
        "Mixing conditions can influence observed rate when boundary-layer transport is limiting.",
        "A mixing-dependent response should not automatically be interpreted as a change in intrinsic enzyme kinetics.",
      ),
      section(
        "Internal diffusion",
        "Substrates diffuse through a porous matrix to reach embedded catalytic sites.",
        "Pore size, particle size and substrate properties influence transport.",
        "An observed kinetic parameter can combine transport effects with intrinsic catalysis.",
      ),
      section(
        "Stability and microenvironment",
        "Immobilisation changes the local environment and can restrict protein movement.",
        "Improved thermal or operational stability is possible but enzyme- and support-dependent.",
        "Comparisons require matched pH, temperature, substrate concentration and assay duration.",
      ),
      section(
        "Reuse and leaching",
        "Residual activity across repeated cycles measures operational performance under the chosen protocol.",
        "Enzyme desorption, support damage and inactivation can each lower productivity.",
        "Measure enzyme or activity in the supernatant to assess leaching.",
      ),
      section(
        "Batch and continuous operation",
        "Recoverable catalysts can be reused in repeated-batch or flow systems.",
        "Flow behaviour and pressure drop become important when particles are packed into a bed.",
        "Residence time and transport influence conversion and must be reported with catalyst loading.",
      ),
      section(
        "Controls for comparative experiments",
        "Compare free enzyme, immobilised enzyme and an appropriate support-only control.",
        "Match the reaction conditions and report how enzyme amount or activity was normalized.",
        "Distinguish biological replication from repeated measurements of the same catalyst preparation.",
      ),
      section(
        "Interpreting performance claims",
        "A higher retained protein concentration does not establish a higher reaction rate.",
        "Operational lifetime should be interpreted alongside product yield and catalyst recovery.",
        "Results from one support–enzyme system cannot be generalized to all immobilised enzymes.",
      ),
      section(
        "Application selection",
        "Repeated catalyst recovery can be valuable in biotransformations and sensing systems.",
        "The useful design balances activity, stability, transport and process cost.",
        "Support choice should follow the intended reaction rather than a universal ranking of methods.",
      ),
    ],
  },
  {
    key: "genome",
    match: /\b(genom(?:e|es|ic)?|chromosom(?:e|es|al)?|nucleoid|dna packaging|chromatin)\b/i,
    scope:
      "Chromosome organisation, DNA topology, gene arrangement and experimental interpretation",
    course: "Microbial Genetics & Molecular Biology",
    objectives: [
      "Distinguish chromosome organisation, DNA packaging and gene arrangement.",
      "Explain how topology and DNA-associated proteins influence bacterial nucleoids.",
      "Compare the conclusions supported by sequence, microscopy and chromosome-contact data.",
    ],
    sources: [
      "https://www.ncbi.nlm.nih.gov/books/NBK21120/",
      "https://arxiv.org/abs/2303.10819",
      "https://www.ncbi.nlm.nih.gov/books/NBK7908/",
    ],
    sections: [
      section(
        "Chromosomes and accessory replicons",
        "Bacterial chromosomes carry core genetic information and are physically organised in the nucleoid.",
        "Circular chromosomes are common, but linear and multipartite genomes also occur.",
        "Plasmids are distinct replicons and should not be treated as interchangeable with chromosomes.",
      ),
      section(
        "The bacterial nucleoid",
        "The nucleoid is a DNA-rich cellular region without a surrounding nuclear membrane.",
        "Compaction involves DNA topology, DNA-associated proteins and cellular processes.",
        "Organisation changes with species, growth conditions and cell-cycle state.",
      ),
      section(
        "DNA topology",
        "Supercoiling describes coiling of the DNA axis beyond the double helix.",
        "Torsional stress is generated during replication and transcription.",
        "Topological organisation influences both chromosome compaction and access to DNA.",
      ),
      section(
        "Topoisomerase functions",
        "Topoisomerases alter DNA topology through transient strand cleavage and resealing.",
        "DNA gyrase can introduce negative supercoils and participates in managing torsional stress.",
        "Different topoisomerases have distinct activities; their roles should not be collapsed into a single mechanism.",
      ),
      section(
        "Nucleoid-associated proteins",
        "Proteins such as HU, IHF, H-NS and Fis can bend, bridge or otherwise organise bacterial DNA.",
        "The complement and abundance of these proteins depend on the organism and physiological state.",
        "Their regulatory effects link chromosome organisation with transcription.",
      ),
      section(
        "Domains and long-range contacts",
        "A chromosome can contain regions with distinct physical contacts and topological constraints.",
        "The organisation described in one model species is not a universal bacterial blueprint.",
        "Chromosome-contact maps describe interaction frequencies rather than a single static structure.",
      ),
      section(
        "Replication origins and copy number",
        "Replication begins at defined origins and proceeds through chromosome regions.",
        "Growing bacterial populations may contain cells with ongoing or overlapping rounds of replication.",
        "A single chromosome type does not imply an identical DNA copy number in every cell.",
      ),
      section(
        "Chromosome segregation",
        "Replicated chromosomes must be organised and partitioned into daughter cells.",
        "Some bacteria use ParABS-associated partitioning systems; mechanisms differ among species.",
        "Segregation should be distinguished from DNA synthesis and from cytokinesis.",
      ),
      section(
        "Gene arrangement and operons",
        "Functionally related genes may share regulatory organisation in operons.",
        "Co-transcription can coordinate expression, but not every adjacent gene belongs to one operon.",
        "Genome annotation and expression data answer different questions about regulation.",
      ),
      section(
        "Mobile genetic elements",
        "Plasmids, transposons and other mobile elements contribute to genome variation.",
        "Transfer of DNA and stable integration are distinct events.",
        "The presence of an element does not establish that a particular transfer event occurred in the experiment.",
      ),
      section(
        "Sequence and assembly evidence",
        "Sequencing reveals nucleotide order, while assembly reconstructs longer genomic regions.",
        "Repeats and mixed populations can complicate assembly and replicon assignment.",
        "A sequence assembly alone does not demonstrate the physical shape of the chromosome inside a living cell.",
      ),
      section(
        "Microscopy and chromosome contacts",
        "Fluorescence microscopy can locate labelled DNA regions within cells.",
        "Chromosome-conformation assays estimate spatial contact frequencies.",
        "Labelling, fixation, population averaging and analytical choices can influence the observed pattern.",
      ),
      section(
        "Interpreting comparative studies",
        "Comparisons need a defined species, strain, growth phase and experimental condition.",
        "A phenotype associated with altered topology does not by itself identify a single causal pathway.",
        "Integrating sequence, expression and spatial measurements strengthens interpretation.",
      ),
      section(
        "Common conceptual distinctions",
        "Chromosome number, DNA content and ploidy describe related but different properties.",
        "The nucleoid is not a membrane-bound nucleus.",
        "A simplified circular genome diagram is a model and should identify its organism and limitations.",
      ),
    ],
  },
  {
    key: "malaria",
    match: /\b(malaria|plasmodium)\b/i,
    scope: "Parasite development, host transitions and interpretation of microscopy",
    course: "Parasitology",
    objectives: [
      "Trace the transitions between mosquito, liver and blood stages.",
      "Distinguish parasite developmental forms on appropriately labelled diagrams.",
      "Separate an image-based observation from a confirmed species-level identification.",
    ],
    sources: [
      "https://www.cdc.gov/dpdx/malaria/index.html",
      "https://www.cdc.gov/malaria/php/surveillance/appendix-a-malaria-lifecycle.html",
    ],
    sections: [
      section(
        "Parasite and vector",
        "Malaria is caused by Plasmodium parasites rather than bacteria or viruses.",
        "Transmission commonly involves infected female Anopheles mosquitoes.",
        "The developmental cycle includes both a vertebrate host and a mosquito host.",
      ),
      section(
        "Liver-stage development",
        "Sporozoites reach the liver after mosquito inoculation.",
        "Liver-stage development precedes the blood-stage cycle.",
        "Some species have dormant liver forms; this is not a feature of every Plasmodium species.",
      ),
      section(
        "Blood-stage development",
        "Merozoites invade red blood cells and develop through recognizable stages.",
        "Asexual replication and red-cell rupture maintain the blood-stage cycle.",
        "Gametocytes are sexual stages taken up by a mosquito during feeding.",
      ),
      section(
        "Microscopy interpretation",
        "Blood-film images must identify stain, specimen and the parasite stage shown.",
        "Image quality and observer experience affect morphological interpretation.",
        "Species identification should not be inferred from an unlabelled illustration alone.",
      ),
    ],
  },
  {
    key: "influenza",
    match: /\b(influenza|flu virus)\b/i,
    scope:
      "Respiratory-virus biology, antigenic variation and interpretation of molecular evidence",
    course: "Virology",
    objectives: [
      "Distinguish viral entry, genome replication and particle release.",
      "Explain why antigenic variation affects interpretation across seasons.",
      "Separate viral detection from conclusions about infectiousness.",
    ],
    sources: [
      "https://www.cdc.gov/flu/about/index.html",
      "https://www.who.int/news-room/fact-sheets/detail/influenza-(seasonal)",
    ],
    sections: [
      section(
        "Respiratory infection",
        "Influenza is a respiratory illness caused by influenza viruses.",
        "Infection can range from mild illness to severe disease.",
        "Symptoms overlap with other respiratory infections and do not establish a virological diagnosis.",
      ),
      section(
        "Antigenic variation",
        "Changes in viral antigens influence recognition by pre-existing immune responses.",
        "Circulating viruses and vaccine composition change over time.",
        "A study must identify the virus type or strain and the period examined.",
      ),
      section(
        "Evidence from detection assays",
        "A positive molecular assay establishes detection of the assay target in the tested specimen.",
        "Assay performance depends on specimen quality, collection timing and the target used.",
        "Detection of a viral target does not by itself quantify infectious-virus production.",
      ),
    ],
  },
  {
    key: "biofilm",
    match: /\bbiofilms?\b/i,
    scope: "Surface-associated communities, extracellular matrix and experimental comparisons",
    course: "General Microbiology",
    objectives: [
      "Distinguish attached biomass, viable cells and matrix composition.",
      "Explain why biofilm models differ across species and environments.",
      "Compare antimicrobial susceptibility endpoints without equating them.",
    ],
    sources: ["https://www.ncbi.nlm.nih.gov/books/NBK7906/"],
    sections: [
      section(
        "Community organisation",
        "Biofilms are surface-associated or aggregated microbial communities embedded in extracellular material.",
        "Community composition and matrix chemistry vary among organisms and conditions.",
        "A visible attached layer does not by itself establish its species composition.",
      ),
      section(
        "Matrix and spatial gradients",
        "Extracellular polymers contribute to attachment and community structure.",
        "Nutrients, oxygen and waste products can vary across a community.",
        "Different regions can therefore contain cells in different physiological states.",
      ),
      section(
        "Measuring biofilm responses",
        "Biomass staining, viable counts and imaging measure different properties.",
        "Reduced stain retention is not equivalent to complete killing of the community.",
        "Report the model, growth surface, exposure conditions and endpoint being compared.",
      ),
    ],
  },
  {
    key: "qpcr",
    match: /\b(qpcr|real[- ]time pcr|16s rrna)\b/i,
    scope: "Amplification chemistry, controls, quantitative interpretation and marker limitations",
    course: "Microbial Genetics & Molecular Biology",
    objectives: [
      "Distinguish target detection from absolute and relative quantification.",
      "Explain the roles of extraction, negative and amplification controls.",
      "Interpret 16S rRNA gene measurements without equating gene copies with viable cells.",
    ],
    sources: ["https://pubmed.ncbi.nlm.nih.gov/19246619/"],
    sections: [
      section(
        "Real-time amplification",
        "Fluorescent signal is monitored as the target is amplified during PCR cycling.",
        "The quantification cycle depends on starting material and assay performance.",
        "A reported Cq value needs a defined assay, thresholding method and experimental context.",
      ),
      section(
        "Controls and inhibition",
        "Negative controls help identify contamination introduced by reagents or workflow.",
        "Extraction and amplification controls address different steps in sample processing.",
        "Inhibition and inefficient extraction can produce misleading target estimates.",
      ),
      section(
        "Calibration and normalisation",
        "Absolute quantification uses a defined calibration strategy.",
        "Relative quantification requires justified normalisation and compatible assay behaviour.",
        "Amplification efficiency must be evaluated rather than assumed identical across assays.",
      ),
      section(
        "16S marker interpretation",
        "16S rRNA gene assays target a conserved bacterial marker with variable regions.",
        "Gene-copy number and primer coverage differ among taxa.",
        "DNA-based detection does not by itself demonstrate that the detected cells remain viable.",
      ),
    ],
  },
];
export function profileFor(topic: string) {
  if (/genome|chromosome|chromatin|dna packaging/i.test(topic)) {
    if (/fung|archaea/i.test(topic)) return comparativeGenome(topic);
    if (/virus|viral|phage|sars|crispr|editing|repair|replication/i.test(topic)) return undefined;
    if (!/architecture|organi[sz]ation|structure|packaging|nucleoid|chromatin/i.test(topic))
      return undefined;
  }
  return TOPIC_PROFILES.find((p) => p.match.test(topic));
}
function comparativeGenome(topic: string): TopicProfile {
  const both = /bacter/i.test(topic) && /archaea/i.test(topic) && /fung/i.test(topic);
  const fungal = /fung/i.test(topic),
    archaeal = /archaea/i.test(topic);
  const sections: TopicSection[] = [];
  if (both || /bacter/i.test(topic))
    sections.push(
      section(
        "Bacterial chromosome organisation",
        "The bacterial nucleoid is not bounded by a nuclear membrane.",
        "DNA topology and DNA-associated proteins contribute to compaction.",
        "Chromosome shape and replicon number vary among species.",
      ),
    );
  if (archaeal)
    sections.push(
      section(
        "Archaeal genome organisation",
        "Archaeal genomes are prokaryotic but should not be treated as identical to bacterial genomes.",
        "Histones and other DNA-binding proteins contribute to DNA organisation in different archaeal lineages.",
        "The relevant organism and its protein complement must be specified.",
      ),
      section(
        "Archaeal diversity",
        "Different archaeal lineages use different combinations of DNA-associated proteins.",
        "Chromosome organisation and replication features should be interpreted at the organism level.",
        "A single textbook diagram cannot represent every archaeal genome.",
      ),
    );
  if (fungal)
    sections.push(
      section(
        "Fungal chromosomes and nuclei",
        "Fungi are eukaryotes with nuclear chromosomes organised as chromatin.",
        "DNA is associated with histones and packaged into nucleosomal structures.",
        "Nuclear genome organisation must be distinguished from mitochondrial genetic material.",
      ),
      section(
        "Chromatin and genomic regions",
        "Nucleosomes contribute to packaging and to the accessibility of DNA.",
        "Centromeric, telomeric and repetitive regions present distinct organizational and assembly challenges.",
        "Chromatin state and DNA sequence are related but different measurements.",
      ),
      section(
        "Ploidy and genome variation",
        "Ploidy and chromosome copy number can differ among fungal organisms and conditions.",
        "A genome assembly is not a direct measurement of chromosome number in every cell.",
        "Comparative studies should report species, strain and experimental state.",
      ),
    );
  sections.push(
    section(
      "Comparing experimental evidence",
      "Sequencing describes nucleotide order; imaging and contact-based assays address spatial organisation.",
      "Genome size, replicon number and packaging mechanism are separate variables.",
      "Model-organism findings require qualification when extended to another lineage.",
    ),
  );
  return {
    key: "comparative-genome",
    match: /genome/i,
    scope: both
      ? "Comparative chromosome organisation and DNA packaging in bacteria, archaea and fungi"
      : fungal && !archaeal
        ? "Fungal nuclear chromosomes, chromatin and genome variation"
        : "Archaeal DNA packaging and lineage-specific genome organisation",
    course: "Microbial Genetics & Molecular Biology",
    objectives: [
      "Distinguish the cellular context and genetic compartments of the named organisms.",
      "Compare DNA packaging mechanisms without treating different domains as identical.",
      "Interpret genomic and structural measurements within their experimental limits.",
    ],
    sources: [
      "https://www.ncbi.nlm.nih.gov/books/NBK21120/",
      "https://www.ncbi.nlm.nih.gov/books/NBK9863/",
      "https://openstax.org/books/microbiology/pages/5-3-fungi",
    ],
    sections,
  };
}
export function topicTerms(topic: string) {
  return topic
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(
      (t) =>
        t.length > 2 &&
        !new Set([
          "the",
          "and",
          "for",
          "with",
          "research",
          "topic",
          "study",
          "microbiology",
          "architecture",
          "overview",
          "introduction",
        ]).has(t),
    );
}
export function topicOverlap(topic: string, text: string) {
  const terms = topicTerms(topic);
  return (
    terms.filter((t) => text.toLowerCase().includes(t.replace(/s$/, ""))).length /
    Math.max(1, terms.length)
  );
}
