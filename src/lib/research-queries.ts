import { topicTerms, profileFor } from "./topic-content";
import { dnaTransferScopes, dnaTransferRelevance, dnaTransferQueries } from "./dna-transfer-topic";

const aliases = [
  ["bacteria", "bacterial", "bacterium", "bacteriology"],
  ["fungi", "fungal", "fungus", "mycology"],
  ["virus", "viral", "viruses", "virology"],
  ["archaea", "archaeal", "archaeon"],
  ["parasitology", "parasite", "parasites", "parasitic"],
  ["immunology", "immunity", "immune"],
  ["phycology", "algae", "algal"],
  ["malaria", "malarial", "plasmodium"],
  ["immobilization", "immobilisation", "immobilized", "immobilised"],
  ["genome", "genomic", "genomes"],
  ["architecture", "organization", "organisation", "structure"],
  ["packaging", "packing", "wrapping", "compaction"],
  ["antimicrobial", "antibiotic", "antibacterial"],
  ["microbiology", "microbial", "microorganism", "microorganisms"],
  ["qpcr", "quantitative pcr", "real-time pcr"],
  ["biofilm", "biofilms"],
  ["competence", "competent", "competency"],
  ["transformation", "transformable", "transformed"],
  ["transduction", "transducing"],
  ["integration", "integrate", "integrated"],
  ["cloning", "clone", "cloned"],
  ["uptake", "transport", "internalization"],
  ["chemical", "chemically"],
  ["stain", "staining", "stains"],
  [
    "mrsa",
    "methicillin-resistant staphylococcus aureus",
    "methicillin resistant staphylococcus aureus",
  ],
  ["nitrogen fixation", "diazotroph", "diazotrophy"],
];
const generic = new Set([
  "process",
  "application",
  "applications",
  "laboratory",
  "method",
  "methods",
  "mechanism",
  "mechanisms",
  "role",
  "effect",
  "effects",
  "types",
  "importance",
  "introduction",
  "overview",
  "about",
  "slides",
  "slide",
  "presentation",
  "lecture",
  "create",
  "generate",
  "make",
  "explain",
  "dedicated",
  "subject",
  "topic",
  "research",
  "study",
  "microbiology",
  "microbial",
  "please",
  "provide",
  "detailed",
  "comprehensive",
  "complete",
  "full",
  "cover",
  "covering",
  "including",
  "include",
  "their",
  "these",
  "this",
  "that",
  "into",
  "from",
  "what",
  "how",
  "can",
  "you",
  "differences",
  "difference",
  "between",
  "microbes",
]);
/** Sentence-separated syllabus requests are alternative source scopes, not one AND query. */
export function researchScopes(topic: string) {
  const clean = topic.trim().replace(/^["“]+|["”]+$/g, "");
  const dnaScopes = dnaTransferScopes(clean);
  const clauses = clean
    .split(/(?<=[a-z]{2}|\))[.!?]\s+|[;\n]+/i)
    .map((s) => s.trim())
    .filter(Boolean);
  if (dnaScopes && dnaScopes.length > 1) {
    // Preserve independent non-DNA syllabus clauses instead of silently dropping them.
    const other = clauses.filter(
      (clause) =>
        !/transduc|transform|competen|electroporat|calcium chloride|DNA|cloning|genetic engineering/i.test(
          clause,
        ),
    );
    return [...dnaScopes, ...other];
  }
  return clauses.length > 1 && clauses.length <= 16 ? clauses : [clean];
}
function termsFor(topic: string) {
  const terms = [...new Set(topicTerms(topic))].filter((t) => !generic.has(t) && !/^\d+$/.test(t));
  if (/\barchitecture\b/i.test(topic)) terms.push("architecture");
  return terms.length ? terms : ["microbiology"];
}
function variants(term: string) {
  return aliases.find((group) => group.includes(term)) ?? [term];
}
const taxonGroups = [
  ["bacteria", "bacterial", "bacterium", "bacteriology"],
  ["archaea", "archaeal", "archaeon"],
  ["fungi", "fungal", "fungus", "mycology"],
  ["virus", "viruses", "viral", "virology"],
  ["parasite", "parasites", "parasitic", "parasitology"],
];
function topicTaxa(terms: string[]) {
  return taxonGroups.filter((group) => terms.some((term) => group.includes(term)));
}
export const reproductionNumberTopic = /\breproduct(?:ion|ive)\s+(?:number|ratio)s?\b/i;
const reproductionScopeWords = new Set([
  "pathogen",
  "pathogens",
  "reproductive",
  "reproduction",
  "number",
  "numbers",
  "ratio",
  "ratios",
  "interpretation",
]);
function reproductionNumberContext(body: string) {
  return (
    (/\breproduct(?:ion|ive)\s+(?:number|ratio)s?\b/i.test(body) ||
      /(?<![\p{L}\p{N}_])R(?:0|₀|t|ₜ)(?![\p{L}\p{N}_])|\bR\(t\)/u.test(body)) &&
    /\b(?:epidem\w*|transmiss\w*|infect\w*|outbreak\w*|herd|incidence|susceptib\w*)\b/i.test(body)
  );
}
function mentionsVariant(body: string, variant: string) {
  const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?:s)?(?![\\p{L}\\p{N}_])`, "iu").test(body);
}
export function sourceTopicRelevance(topic: string, body: string): number {
  const scopes = researchScopes(topic);
  if (scopes.length > 1)
    return Math.max(...scopes.map((scope) => sourceTopicRelevance(scope, body)));
  const dnaScore = dnaTransferRelevance(topic, body);
  if (dnaScore !== undefined) return dnaScore;
  // Structural lectures must not be filled by generic genome-resource or
  // microbiome surveys that merely share organism/genome words.
  if (
    /genome\s+architecture|chromosome\s+organi[sz]ation|organi[sz]ation\s+of\s+(?:the\s+)?(?:bacterial\s+)?chromosome|dna\s+packaging|prokaryotic.*eukaryotic.*genom/i.test(
      topic,
    ) &&
    !/chromatin|nucleoid|histone|nucleosome|DNA\s+(?:packag|wrapp|supercoil|compact)|(?:genom\w*|chromosom\w*)\s+(?:architec|organi[sz]|structur|topolog|segreg|fold|packag)|(?:architec\w*|organi[sz]\w*|structur\w*)\s+(?:of\s+)?(?:the\s+)?(?:bacterial\s+|archaeal\s+|fungal\s+)?(?:genom|chromosom)/i.test(
      body,
    )
  )
    return 0;
  // A reproduction number is an epidemiological concept. Shared words about
  // reproduction, chromosome number or interpretation cannot establish this scope.
  const reproduction = reproductionNumberTopic.test(topic);
  if (reproduction && !reproductionNumberContext(body)) return 0;
  const terms = termsFor(topic).filter(
      (term) => !reproduction || !reproductionScopeWords.has(term),
    ),
    lower = body.toLowerCase();
  if (
    /microb/i.test(topic) &&
    !/microb|bacter|archae|fung|viru|viral|alga|protozo|yeast|pathogen/i.test(body)
  )
    return 0;
  const taxa = [
    /bacter/i,
    /viru|viral|virolog/i,
    /fung|mycolog/i,
    /archae/i,
    /parasit|malari|plasmod/i,
  ];
  const required = taxa.filter((taxon) => taxon.test(topic));
  if (required.length === 1 && !required[0].test(body)) return 0;
  // A comparative lecture can use a source on one requested taxon. Require the
  // shared scientific concept too; unrelated taxon-only papers remain excluded.
  if (!terms.length) return 1;
  const groups = topicTaxa(terms);
  if (groups.length > 1) {
    const anchors = terms.filter((term) => !groups.some((group) => group.includes(term)));
    if (!groups.some((group) => group.some((term) => lower.includes(term.replace(/s$/, "")))))
      return 0;
    if (anchors.length)
      return (
        anchors.filter((term) => variants(term).some((v) => mentionsVariant(lower, v))).length /
        anchors.length
      );
  }
  return (
    terms.filter((term) => variants(term).some((v) => mentionsVariant(lower, v))).length /
    terms.length
  );
}
export function researchQueries(topic: string): string[] {
  const scopes = researchScopes(topic);
  if (scopes.length > 1)
    return [
      ...new Set([
        // Give every requested scope a query before spending slots on variants.
        ...scopes.map((scope) => researchQueries(scope)[0]),
        ...scopes.flatMap((scope) => researchQueries(scope).slice(1)),
      ]),
    ].slice(0, 32);
  const clean = topic
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
  const terms = termsFor(clean).slice(0, 12);
  const expanded = terms
    .map(
      (term) =>
        `(${variants(term)
          .map((t) => `"${t}"`)
          .join(" OR ")})`,
    )
    .join(" AND ");
  const concepts =
    profileFor(topic)
      ?.sections.slice(0, 6)
      .map((s) => `"${s.title}"`) ?? [];
  const groups = topicTaxa(terms);
  const anchors = terms.filter((term) => !groups.some((group) => group.includes(term)));
  const comparative =
    groups.length > 1
      ? `${anchors
          .map(
            (term) =>
              `(${variants(term)
                .map((v) => `"${v}"`)
                .join(" OR ")})`,
          )
          .join(" AND ")}${anchors.length ? " AND " : ""}(${groups
          .flat()
          .map((v) => `"${v}"`)
          .join(" OR ")})`
      : "";
  return [
    ...new Set([
      ...dnaTransferQueries(clean),
      `"${clean}"`,
      reproductionNumberTopic.test(clean)
        ? '("reproduction number" OR "reproductive number" OR "basic reproduction ratio" OR "effective reproduction number") AND (transmission OR epidemic OR infection OR outbreak)' +
          terms
            .filter((term) => !reproductionScopeWords.has(term))
            .map(
              (term) =>
                ` AND (${variants(term)
                  .map((v) => `"${v}"`)
                  .join(" OR ")})`,
            )
            .join("")
        : "",
      expanded,
      comparative,
      concepts.length ? `(${concepts.join(" OR ")})` : terms.join(" "),
      // Syllabus prose is not a publication title. Search smaller concept pairs
      // with a shared anchor, while retaining strict passage relevance screening.
      ...(terms.length > 4
        ? terms.slice(1).map(
            (term) =>
              `(${variants(terms[0])
                .map((v) => `"${v}"`)
                .join(" OR ")}) AND (${variants(term)
                .map((v) => `"${v}"`)
                .join(" OR ")})`,
          )
        : []),
    ]),
  ].filter(Boolean);
}
