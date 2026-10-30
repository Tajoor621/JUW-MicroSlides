import type { Citation, Deck, GenerateInput, Slide } from "./types";
import { teachingSchema } from "./teaching-schema";
import { uid } from "./utils";

/** Editorial teaching synthesis, not a source quotation or human review.
 * Primary bibliographic identities checked 29–30 October 2026. Deliberately narrow
 * matching: specialised organism requests still use the general research path.
 */
export function conjugationTopic(topic: string) {
  return /^(?:(?:the )?(?:process|mechanism|mechanisms) of )?(?:bacterial conjugation|conjugation(?: in bacteria)?|f[- ]plasmid conjugation)(?: lecture)?[.!]?$/i.test(
    topic.trim(),
  );
}
export const CONJUGATION_REFERENCES: Citation[] = [
  {
    id: "conjugation-couturier-2023",
    evidenceKind: "primary",
    type: "article-journal",
    authors: "Couturier A, Virolle C, Goldlust K, et al.",
    title: "Real-time visualisation of the intracellular dynamics of conjugative plasmid transfer",
    journal: "Nature Communications",
    year: "2023",
    volume: "14",
    pages: "294",
    doi: "10.1038/s41467-023-35978-3",
    pmid: "36653393",
    url: "https://pubmed.ncbi.nlm.nih.gov/36653393/",
  },
  {
    id: "conjugation-williams-2025",
    evidenceKind: "primary",
    type: "article-journal",
    authors: "Williams SM, Raffl S, Kienesberger S, et al.",
    title:
      "Cryo-EM Structure of the relaxosome, a complex essential for bacterial mating and the spread of antibiotic resistance genes",
    journal: "Nature Communications",
    year: "2025",
    volume: "16",
    pages: "4906",
    doi: "10.1038/s41467-025-60116-6",
    pmid: "40425557",
    url: "https://pubmed.ncbi.nlm.nih.gov/40425557/",
  },
  {
    id: "conjugation-ares-2023",
    evidenceKind: "primary",
    type: "article-journal",
    authors: "Ares-Arroyo M, Coluzzi C, Rocha EPC",
    title:
      "Origins of transfer establish networks of functional dependencies for plasmid transfer by conjugation",
    journal: "Nucleic Acids Research",
    year: "2023",
    volume: "51",
    pages: "3001–3016",
    doi: "10.1093/nar/gkac1079",
    pmid: "36442505",
    url: "https://pubmed.ncbi.nlm.nih.gov/36442505/",
  },
  {
    id: "conjugation-goldlust-2023",
    evidenceKind: "primary",
    type: "article-journal",
    authors: "Goldlust K, Ducret A, Halte M, et al.",
    title:
      "The F pilus serves as a conduit for the DNA during conjugation between physically distant bacteria",
    journal: "Proceedings of the National Academy of Sciences",
    year: "2023",
    volume: "120",
    pages: "e2310842120",
    doi: "10.1073/pnas.2310842120",
    pmid: "37963249",
    url: "https://pubmed.ncbi.nlm.nih.gov/37963249/",
  },
  {
    id: "conjugation-wollman-1956",
    evidenceKind: "primary",
    type: "article-journal",
    authors: "Wollman EL, Jacob F, Hayes W",
    title: "Conjugation and genetic recombination in Escherichia coli K-12",
    journal: "Cold Spring Harbor Symposia on Quantitative Biology",
    year: "1956",
    volume: "21",
    pages: "141–162",
    doi: "10.1101/sqb.1956.021.01.012",
    pmid: "13433587",
    url: "https://pubmed.ncbi.nlm.nih.gov/13433587/",
  },
  {
    id: "conjugation-lloyd-1995",
    evidenceKind: "primary",
    type: "article-journal",
    authors: "Lloyd RG, Buckman C.",
    title:
      "Conjugational recombination in Escherichia coli: genetic analysis of recombinant formation in Hfr x F- crosses.",
    journal: "Genetics",
    year: "1995",
    volume: "139",
    pages: "1123–1148",
    doi: "10.1093/genetics/139.3.1123",
    pmid: "7768428",
    url: "https://pubmed.ncbi.nlm.nih.gov/7768428/",
  },
];
type Lesson = {
  title: string;
  definition: string;
  bullets: [string, string];
  mechanism: string;
  pitfall: string;
  takeaway: string;
  steps: [string, string, string, string];
  refs: number[];
  notes: string;
};
const LESSONS: Lesson[] = [
  {
    title: "Conjugation transfers DNA between cells",
    definition:
      "Conjugation is contact-dependent horizontal DNA transfer from a donor to a recipient.",
    bullets: [
      "The donor carries a transferable element; the recipient acquires DNA rather than a new parent.",
      "The F plasmid in Escherichia coli is a model, not a description of every conjugative system.",
    ],
    mechanism: "DNA processing, a secretion apparatus and recipient establishment act in sequence.",
    pitfall: "Gene transfer does not itself increase the number of bacterial cells.",
    takeaway: "Follow the DNA, the transfer machinery and the recipient's fate separately.",
    steps: [
      "Donor with transferable DNA",
      "Transfer apparatus engages",
      "DNA reaches recipient",
      "Incoming element establishes",
    ],
    refs: [0, 1],
    notes:
      "Start with two pre-existing cells. Ask students to distinguish a transfer event from cell division. Use F-type transfer as the working model throughout; explicitly identify later exceptions.",
  },
  {
    title: "Donor and recipient roles",
    definition:
      "Donor and recipient describe roles in a transfer event, not fixed bacterial sexes.",
    bullets: [
      "An F-positive donor carries the F element and its transfer functions.",
      "A recipient that establishes an intact functional F plasmid can subsequently become a donor.",
    ],
    mechanism: "Acquisition must be followed by DNA conversion, gene expression and maintenance.",
    pitfall: "Detecting incoming DNA does not prove stable plasmid inheritance.",
    takeaway: "Entry and establishment are different checkpoints.",
    steps: [
      "F-positive donor",
      "F-negative recipient",
      "F DNA enters",
      "Stable F-positive recipient",
    ],
    refs: [0],
    notes:
      "Define F-positive and F-negative before using the symbols. Explain that successful plasmid establishment, rather than contact alone, changes the recipient's transferable genetic capacity.",
  },
  {
    title: "The origin of transfer is a DNA address",
    definition: "oriT is a DNA region recognised by the conjugative DNA-processing machinery.",
    bullets: [
      "The relaxosome assembles at oriT and prepares a defined strand for transfer.",
      "An origin of transfer and an origin of replication perform different functions.",
    ],
    mechanism: "Sequence-specific recognition coordinates accessory proteins and the relaxase.",
    pitfall: "A plasmid can replicate without being independently conjugative.",
    takeaway: "Replication competence is not transfer competence.",
    steps: [
      "Plasmid carries oriT",
      "Accessory proteins bind",
      "Relaxase is recruited",
      "Transfer substrate prepared",
    ],
    refs: [1, 2],
    notes:
      "Draw oriT and the replication origin at different positions on one plasmid. Ask what would happen to transfer if oriT were disrupted while replication remained functional.",
  },
  {
    title: "Relaxase initiates strand processing",
    definition: "A relaxase processes a specific DNA strand at the transfer origin.",
    bullets: [
      "In the F system, TraI nicks oriT and remains linked to the transferred strand's 5′ end.",
      "DNA processing must be coordinated with delivery to the transfer apparatus.",
    ],
    mechanism:
      "The nick creates a protein–DNA transfer intermediate rather than a free double-stranded plasmid.",
    pitfall: "A nick is not equivalent to destruction of the whole plasmid.",
    takeaway: "The exported substrate is a processed nucleoprotein complex.",
    steps: [
      "Relaxosome assembles",
      "TraI nicks one strand",
      "TraI links to 5′ end",
      "Transfer intermediate forms",
    ],
    refs: [1, 0],
    notes:
      "Annotate the 5′ and 3′ ends. Keep the catalytic nick distinct from DNA unwinding and transport. At advanced level, discuss why structure and mutational evidence are complementary.",
  },
  {
    title: "Coupling connects processing to transport",
    definition:
      "The type IV coupling protein connects the DNA-processing complex to the secretion machinery.",
    bullets: [
      "In F-type transfer, TraD links the relaxosome to the type IV secretion system.",
      "A functional relaxase alone cannot replace the membrane-spanning transfer apparatus.",
    ],
    mechanism: "Substrate recruitment couples a prepared DNA intermediate to the export pathway.",
    pitfall: "Possessing a processing protein does not prove autonomous transfer.",
    takeaway: "Processing and transport are coordinated but distinct functions.",
    steps: [
      "DNA is processed",
      "Coupling protein recruits",
      "Secretion system engages",
      "Substrate is transported",
    ],
    refs: [0, 1],
    notes:
      "Treat the coupling protein as the interface between two machines. Ask students to predict which stage fails if recruitment is lost but oriT nicking remains intact.",
  },
  {
    title: "Pili and cell contacts enable transfer",
    definition: "F pili participate in interactions between donor and recipient cells.",
    bullets: [
      "Transfer requires a physical connection; the geometry of that connection can vary.",
      "Live-cell imaging has shown F-pilus-mediated DNA transfer between physically separated cells.",
    ],
    mechanism: "An F pilus can act as a DNA conduit in the experimentally studied system.",
    pitfall: "Do not assume that every transfer requires tightly apposed cell bodies.",
    takeaway: "Distinguish contact-dependent transfer from mandatory cell-body contact.",
    steps: [
      "Donor produces F pilus",
      "Pilus connects cells",
      "DNA crosses connection",
      "Recipient receives strand",
    ],
    refs: [3],
    notes:
      "Contrast a simple mating-pair cartoon with the physical connection visualised in the cited study. This is an F-system observation, not a universal statement about every pilus.",
  },
  {
    title: "One DNA strand enters the recipient",
    definition: "F-plasmid conjugation transfers a single-stranded DNA intermediate.",
    bullets: [
      "The strand entering the recipient is often called the T-strand.",
      "The donor retains complementary DNA and restores its plasmid copy during transfer.",
    ],
    mechanism: "Strand transfer is coordinated with replacement synthesis in the donor.",
    pitfall: "The donor does not normally surrender its only complete plasmid copy.",
    takeaway: "Transfer and DNA synthesis allow both cells to retain the element.",
    steps: [
      "One strand is selected",
      "T-strand is exported",
      "Donor synthesis during transfer",
      "Recipient converts incoming DNA",
    ],
    refs: [0, 1],
    notes:
      "Use two colours for complementary strands. Ask students which cell initially contains the single-stranded incoming intermediate and which retains the complementary template.",
  },
  {
    title: "Incoming DNA becomes an established plasmid",
    definition:
      "Recipient establishment includes conversion of incoming single-stranded DNA into double-stranded DNA.",
    bullets: [
      "Live-cell imaging separates DNA entry from subsequent plasmid conversion.",
      "Plasmid gene expression changes as the incoming molecule becomes double-stranded.",
    ],
    mechanism:
      "In the studied F system, DNA form helps control the timing of early and later gene expression.",
    pitfall: "DNA arrival and immediate expression of every plasmid gene are not equivalent.",
    takeaway: "Track entry, DNA conversion and expression as separate events.",
    steps: [
      "Incoming single strand",
      "Early gene expression",
      "Double-strand conversion",
      "Later plasmid expression",
    ],
    refs: [0],
    notes:
      "Explain the distinction between detecting DNA and detecting an expressed phenotype. For research audiences, discuss the leading-region single-stranded promoters identified in the study.",
  },
  {
    title: "Mobilisable elements borrow transfer functions",
    definition:
      "Some plasmids depend on another element's transfer functions to move between cells.",
    bullets: [
      "An oriT-bearing plasmid may use a compatible helper's DNA-processing functions.",
      "Dependencies are specific: not every helper can mobilise every plasmid.",
    ],
    mechanism:
      "Compatible origin recognition and access to transfer machinery permit transfer in trans.",
    pitfall: "Absence of a complete transfer-gene set does not prove immobility.",
    takeaway: "Classify mobility by functional dependencies, not a single gene.",
    steps: [
      "oriT-bearing cargo",
      "Compatible helper present",
      "Functions supplied in trans",
      "Cargo can be transferred",
    ],
    refs: [2],
    notes:
      "Separate autonomous conjugative plasmids from helper-dependent elements. Use the primary study to discuss why sequence-based mobility predictions remain predictions until experimentally tested.",
  },
  {
    title: "Chromosomal transfer and Hfr mapping",
    definition: "An Hfr donor carries an F element integrated into its chromosome.",
    bullets: [
      "Transfer can proceed from the integrated element into adjacent chromosomal markers.",
      "Interrupted mating uses marker-entry order to infer relative genetic order.",
    ],
    mechanism:
      "Stable inheritance of transferred chromosomal markers requires appropriate recombination in the recipient.",
    pitfall: "Acquiring a chromosomal marker does not necessarily make the recipient F-positive.",
    takeaway: "Distinguish DNA entry, recombination and acquisition of the complete F element.",
    steps: [
      "Integrated F in donor",
      "Adjacent markers enter",
      "Mating is interrupted",
      "Marker order is inferred",
    ],
    refs: [4, 5],
    notes:
      "Use qualitative marker order without inventing transfer times. Lloyd and Buckman provide primary experimental evidence on recipient recombination, not universal mapping timings. The classic paper supplies historical context; its PubMed record has no abstract, so inspect the full original before adding quantitative examples.",
  },
  {
    title: "Resistance spread depends on genetic cargo",
    definition: "Conjugative elements can disseminate genes carried on transferable DNA.",
    bullets: [
      "Antimicrobial-resistance genes are important possible cargo, not a defining feature of every plasmid.",
      "Helper-dependent plasmids can also contribute to resistance-gene dissemination.",
    ],
    mechanism:
      "Horizontal transfer changes which cells carry a trait; subsequent selection can change its frequency.",
    pitfall: "Resistance transfer does not imply a new mutation occurred during mating.",
    takeaway: "Separate transfer of an existing gene from selection of its carriers.",
    steps: [
      "Element carries a trait",
      "Transfer changes host",
      "Element establishes",
      "Selection shapes persistence",
    ],
    refs: [0, 2],
    notes:
      "Avoid treating conjugation as synonymous with antibiotic resistance. Ask whether a measured change reflects DNA transfer, survival, growth or a combination of these processes.",
  },
  {
    title: "Choose evidence that resolves the mechanism",
    definition: "Different observations resolve different stages of conjugation.",
    bullets: [
      "Live-cell imaging can distinguish incoming DNA from double-strand conversion.",
      "Structural and mutational studies connect relaxosome organisation to DNA-processing function.",
    ],
    mechanism:
      "Combining time-resolved and molecular evidence helps locate where a transfer process fails.",
    pitfall: "A single endpoint does not identify every preceding molecular step.",
    takeaway: "Match the measurement to the mechanistic question.",
    steps: [
      "State the question",
      "Choose a stage-specific readout",
      "Compare relevant evidence",
      "Bound the conclusion",
    ],
    refs: [0, 1],
    notes:
      "Ask students to choose between structural, DNA-entry and gene-expression observations for a particular claim. Keep this conceptual: a lecture does not replace an approved laboratory protocol.",
  },
  {
    title: "Read conjugation cartoons critically",
    definition: "A mechanistic diagram is a model with an explicit biological scope.",
    bullets: [
      "F-type pili, relaxases and coupling proteins are named components of a particular model system.",
      "Do not generalise an F-system observation to all bacterial or archaeal DNA transfer.",
    ],
    mechanism:
      "Compare the claim with the organism, element and experimental stage actually studied.",
    pitfall: "A labelled arrow is not experimental proof that a step occurs in every system.",
    takeaway: "State the model system before interpreting the diagram.",
    steps: [
      "Identify model organism",
      "Name the genetic element",
      "Locate observed stage",
      "Limit the generalisation",
    ],
    refs: [1, 2, 3],
    notes:
      "Invite students to identify which parts of the current schematic were directly observed and which simplify the process. Discuss alternative physical geometries of F-mediated transfer.",
  },
  {
    title: "From transfer machinery to inheritance",
    definition: "Successful transfer is a chain of molecular and cellular checkpoints.",
    bullets: [
      "oriT recognition and relaxase processing prepare a substrate for the transfer apparatus.",
      "Recipient DNA conversion, expression and maintenance determine the fate of incoming DNA.",
    ],
    mechanism:
      "A defect in processing, delivery or establishment can interrupt the chain at a different stage.",
    pitfall: "Failure to recover an acquired phenotype does not by itself locate the failed step.",
    takeaway: "Explain a prediction by naming the affected checkpoint.",
    steps: [
      "Process at oriT",
      "Deliver through apparatus",
      "Convert incoming DNA",
      "Express and maintain",
    ],
    refs: [0, 1, 2],
    notes:
      "Close by tracing one transfer event without reading the slide. Ask for a prediction about a broken relaxase, a missing compatible helper and failed recipient establishment, distinguishing the three checkpoints.",
  },
];

export function hasConjugationCore(deck: Deck) {
  return (
    conjugationTopic(deck.topic) &&
    deck.slides.some((s) => s.teachingPurpose === "conjugation-core/v1")
  );
}
export function conjugationCore(deck: Deck, input: GenerateInput): Deck {
  if (!conjugationTopic(input.topic) || input.notes.trim() || input.count < 2) return deck;
  const slots = Math.min(LESSONS.length, input.count - 1);
  // Short decks retain the beginning, mechanism and recipient outcome. Larger
  // decks insert the other lessons in pedagogical order; never repeat to pad.
  const priorities = [0, 3, 6, 7, 2, 4, 5, 8, 9, 10, 11, 12, 13, 1];
  const selected = new Set(priorities.slice(0, slots));
  const slides: Slide[] = LESSONS.flatMap((lesson, i) =>
    selected.has(i)
      ? [
          {
            id: uid("conj"),
            layout: "content",
            theme: "molecular",
            title: lesson.title,
            subtitle: "F-type model · source-linked teaching synthesis",
            bullets: [...lesson.bullets],
            leftBullets: [],
            rightBullets: [],
            media: [],
            notes: `${lesson.notes}\n\nCommon misconceptions\n- ${lesson.pitfall}\n\nEditorial synthesis; check the linked original sources before teaching.`,
            citations: lesson.refs.map((n) => ({ ...CONJUGATION_REFERENCES[n] })),
            teachingPurpose: "conjugation-core/v1",
            difficulty: i > 7 ? "intermediate" : "core",
            evidenceFlags: ["needs-verification"],
            commonMisconceptions: [lesson.pitfall],
            teaching: teachingSchema.parse({
              ...lesson,
              diagram: "conjugation",
              diagramLabel: lesson.title,
              altText: `${lesson.title}: ${lesson.steps.join("; ")}. Conceptual, not to scale.`,
              legend: "Original editable schematic of the stated model; not to scale.",
            }),
          },
        ]
      : [],
  );
  return {
    ...deck,
    slides: [deck.slides[0], ...slides],
    contentWarnings: [
      "Source-linked editorial core for F-type conjugation; bibliographic checks recorded 29–30 October 2026. Claims remain unreviewed. Live reference checks are separate from scientific review.",
    ],
  };
}

export function conjugationQuestions(deck: Deck): Slide["assessment"] | undefined {
  if (!hasConjugationCore(deck)) return undefined;
  const question = (
    question: string,
    options: string[],
    correct: number,
    rationale: string,
    ref: number,
  ) => ({
    kind: "mcq" as const,
    question,
    options,
    answer: options[correct],
    rationale,
    sourceUrl: CONJUGATION_REFERENCES[ref].url,
  });
  const have = (index: number) => deck.slides.some((s) => s.title === LESSONS[index].title);
  if (deck.slides.filter((s) => s.teachingPurpose === "conjugation-core/v1").length < 3)
    throw Error(
      "Conjugation assessment needs three teaching concepts. Request at least seven slides with objectives and assessment enabled.",
    );
  return [
    question(
      "A plasmid replicates normally but has a disrupted oriT. Which step fails first?",
      [
        "Transfer-origin recognition and DNA processing",
        "Initiation at the replication origin",
        "Recipient double-strand conversion",
        "Expression after stable establishment",
      ],
      0,
      "oriT serves conjugative processing; it is distinct from the replication origin. The prediction assumes other functions remain intact.",
      1,
    ),
    have(7)
      ? question(
          "Incoming F ssDNA appears before a later plasmid protein. What best explains the delay?",
          [
            "All promoters function on incoming ssDNA",
            "Later expression excludes ssDNA transfer",
            "DNA conversion changes gene expression",
            "DNA entry itself proves stable inheritance",
          ],
          2,
          "The F-system study separates ssDNA entry, dsDNA conversion and successive gene-expression programmes. Entry alone does not establish simultaneous expression.",
          0,
        )
      : question(
          "How can donor and recipient both retain an F plasmid after one-strand transfer?",
          [
            "Both original strands leave the donor without replacement",
            "The recipient must replace its entire chromosome",
            "DNA synthesis restores double-stranded copies",
            "The transferred molecule must remain permanently single-stranded",
          ],
          2,
          "The donor retains a complementary template; synthesis restores duplex DNA in donor and recipient. Transfer does not ordinarily consume the donor's only plasmid copy.",
          0,
        ),
    have(8)
      ? question(
          "An oriT-bearing plasmid lacks complete transfer machinery. What could enable movement?",
          [
            "oriT alone encodes a secretion system",
            "A compatible helper supplies transfer functions",
            "Replication substitutes for a transfer apparatus",
            "Recipient expression replaces donor functions",
          ],
          1,
          "Helper-dependent mobility requires compatible recognition and transfer functions; the presence of an arbitrary helper is insufficient.",
          2,
        )
      : question(
          "What does a completed conjugative DNA-transfer event establish most directly?",
          [
            "The recipient necessarily replaced its chromosome",
            "DNA moved between pre-existing cells",
            "Both cells divided during transfer",
            "The acquired phenotype must persist indefinitely",
          ],
          1,
          "Conjugation moves genetic material between existing cells. Cell multiplication and stable inheritance require separate evidence.",
          0,
        ),
  ];
}
