import { checkPublication, type PublicationCheck } from "./publication-status";
import type { Deck, Slide, Citation } from "./types";
import { profileFor, topicOverlap } from "./topic-content";
export type ReviewIssue = {
  id: string;
  slideId: string;
  index: number;
  severity: "high" | "medium" | "low";
  category: string;
  quote: string;
  problem: string;
  suggestion: string;
  source?: string;
};
const body = (s: Slide) => [...s.bullets, ...s.leftBullets, ...s.rightBullets].join(" ");
const normalized = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const rules = [
  {
    re: /\bviruses?\s+(?:have|possess|contain)\s+(?:their own\s+)?ribosomes?\b/i,
    problem: "Viruses do not possess their own ribosomes.",
    fix: "Describe dependence on host translation machinery; distinguish a virion from the infected cell.",
    source: "https://openstax.org/books/microbiology/pages/6-1-viruses",
  },
  {
    re: /\b(?:archaea|archaeal cell walls?)\s+(?:have|contain|possess|are made of)\s+peptidoglycan\b/i,
    problem: "Archaeal walls should not be described as containing bacterial peptidoglycan.",
    fix: "Distinguish archaeal surface layers and, in some groups, pseudomurein from bacterial peptidoglycan.",
    source: "https://openstax.org/books/microbiology/pages/4-6-archaea",
  },
  {
    re: /\bfungi\s+are\s+(?:all\s+)?prokaryot(?:es|ic)\b/i,
    problem: "Fungi are eukaryotes, not prokaryotes.",
    fix: "Correct the cell classification and check any accompanying nucleus or organelle diagram.",
    source: "https://openstax.org/books/microbiology/pages/5-3-fungi",
  },
  {
    re: /\bmalaria\s+is\s+(?:a\s+)?(?:bacterial|viral)\s+(?:disease|infection)\b/i,
    problem: "Malaria is caused by Plasmodium parasites.",
    fix: "Correct the causative-agent classification; use a properly labelled parasite life-cycle or blood-film image.",
    source: "https://www.cdc.gov/dpdx/malaria/index.html",
  },
  {
    re: /\ball\s+bacteria\s+(?:have|possess|contain)\s+(?:a\s+)?single\s+circular\s+chromosome\b/i,
    problem: "The chromosome architecture of bacteria has exceptions.",
    fix: "Use qualified wording: a single circular chromosome is common, while linear and multipartite genomes also occur.",
    source: "https://www.ncbi.nlm.nih.gov/books/NBK21120/",
  },
  {
    re: /\bimmobili[sz]ation\s+always\s+(?:increases|improves|enhances)\s+(?:enzyme\s+)?(?:activity|stability)\b/i,
    problem: "Immobilisation outcomes depend on the enzyme, support and reaction conditions.",
    fix: "Replace the absolute claim with the measured outcome for a defined system, including the assay conditions.",
    source: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3787205/",
  },
  {
    re: /\b(?:qpcr|PCR|16S)\s+(?:always\s+)?(?:proves|confirms|demonstrates)\s+(?:that\s+)?(?:the\s+)?(?:cells?|bacteria)\s+(?:are\s+)?(?:alive|viable)\b/i,
    problem: "DNA-target detection alone does not establish viability.",
    fix: "Separate target detection from viability; state what additional evidence supports living cells.",
    source: "https://pubmed.ncbi.nlm.nih.gov/19246619/",
  },
];
const foreign = [
  {
    re: /\b(plasmodium|sporozoite|merozoite|gametocyte)\b/i,
    context: /malaria|plasmodium|parasite/i,
    label: "malaria parasite",
  },
  {
    re: /\b(immobili[sz]|covalent attachment|enzyme leaching)\b/i,
    context: /immobili|enzyme|biocatal|support|catalys/i,
    label: "enzyme immobilisation",
  },
  {
    re: /\b(candida albicans|aspergillus|hyphae)\b/i,
    context: /fung|candida|aspergillus|yeast|myco/i,
    label: "fungal biology",
  },
];
export function reviewDeck(deck: Deck): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const profile = profileFor(deck.topic);
  const content = deck.slides.filter((s) => s.layout !== "title");
  const titleSeen = new Map<string, number>();
  const bodySeen = new Map<string, number>();
  const repeated =
    content.filter((s) => normalized(s.title).includes(normalized(deck.topic))).length >
    Math.max(2, content.length * 0.3);
  const add = (
    s: Slide,
    index: number,
    severity: ReviewIssue["severity"],
    category: string,
    quote: string,
    problem: string,
    suggestion: string,
    source?: string,
  ) =>
    issues.push({
      id: `${s.id}-${category}-${issues.length}`,
      slideId: s.id,
      index,
      severity,
      category,
      quote,
      problem,
      suggestion,
      source,
    });
  deck.slides.forEach((s, index) => {
    const text = body(s);
    const title = normalized(s.title);
    const exempt =
      /objective|conclusion|reading|reference|evidence required/i.test(s.title) ||
      s.layout === "title";
    if (s.layout === "title" && normalized(s.title) !== normalized(deck.topic))
      add(
        s,
        index,
        "high",
        "Topic alignment",
        s.title,
        "The introduction does not match the deck's declared research topic.",
        `Use the exact topic “${deck.topic}” as the title; put its scope in the subtitle.`,
      );
    if (titleSeen.has(title))
      add(
        s,
        index,
        "medium",
        "Duplicate heading",
        s.title,
        `The heading duplicates slide ${titleSeen.get(title)! + 1}.`,
        "Use distinct concept headings or combine overlapping slides.",
      );
    titleSeen.set(title, index);
    if (text && bodySeen.has(normalized(text)))
      add(
        s,
        index,
        "medium",
        "Duplicate content",
        text.slice(0, 160),
        `The content duplicates slide ${bodySeen.get(normalized(text))! + 1}.`,
        "Remove the repeated slide or introduce a different supported concept.",
      );
    if (text) bodySeen.set(normalized(text), index);
    if (repeated && !exempt && title.includes(normalized(deck.topic)))
      add(
        s,
        index,
        "low",
        "Repeated topic wording",
        s.title,
        "The full topic is repeated across many headings.",
        "Keep the research topic on the introduction and use a short concept-specific heading here.",
      );
    if (
      !exempt &&
      /\b(name the method|one exam sentence|first.year.*mark|stop talking|what new fact|write the single sentence|leave five minutes|lookalike|exam contract)\b/i.test(
        text,
      )
    )
      add(
        s,
        index,
        "medium",
        "Teaching prompt",
        text.slice(0, 180),
        "This reads as a generator instruction instead of substantive research content.",
        "Replace it with a specific explanation, finding or methodological limitation supported by a source.",
      );
    for (const line of [s.title, ...s.bullets, ...s.leftBullets, ...s.rightBullets])
      for (const rule of rules)
        if (
          !/^\s*(?:not all|it is (?:false|incorrect) that|myth\s*:|false claim\s*:|incorrect claim\s*:)/i.test(
            line,
          ) &&
          rule.re.test(line)
        )
          add(
            s,
            index,
            "high",
            "Potential factual error",
            line,
            rule.problem,
            rule.fix,
            rule.source,
          );
    if (!exempt) {
      for (const f of foreign)
        if (f.re.test(text) && !f.context.test(`${deck.topic} ${s.title}`))
          add(
            s,
            index,
            "medium",
            "Topic alignment",
            text.slice(0, 180),
            `This introduces ${f.label} without a clear link to the research topic.`,
            "Explain the comparison explicitly, cite the connection, or remove the unrelated material.",
          );
      if (!s.citations.length && !/https?:\/\//.test(s.notes))
        add(
          s,
          index,
          "medium",
          "Evidence gap",
          s.title,
          "No reference or source URL is recorded for these claims.",
          "Attach the original study or authoritative source and check each claim against it.",
        );
      if (
        /\b\d+(?:\.\d+)?\s*(?:%|mg|µg|ug|mm|nm|fold|copies|°c)\b/i.test(text) &&
        !s.citations.length
      )
        add(
          s,
          index,
          "medium",
          "Quantitative claim",
          text.slice(0, 180),
          "A numerical claim lacks an attached bibliographic source.",
          "Record the organism, assay, conditions and original reference for this number.",
        );
      if (text.length > 1600)
        add(
          s,
          index,
          "low",
          "Slide density",
          `${text.length} characters`,
          "This slide may be too dense for clear presentation.",
          "Split it into two supported concepts; keep detailed qualifications in the speaker notes.",
        );
    }
    for (const m of s.media) {
      const description = `${m.title} ${m.originalSrc || m.src}`;
      if (
        !m.credit ||
        /unknown|not supplied/i.test(m.credit) ||
        !m.license ||
        /unknown|verify|open licence|pmc open access/i.test(m.license)
      )
        add(
          s,
          index,
          "medium",
          "Media provenance",
          m.title,
          "The figure's attribution or reuse terms need confirmation.",
          "Open the original source, record its creator and actual licence, and check the caption.",
          /^https?:/.test(m.source) ? m.source : undefined,
        );
      for (const f of foreign)
        if (f.re.test(description) && !f.context.test(`${deck.topic} ${s.title} ${text}`))
          add(
            s,
            index,
            "high",
            "Media mismatch",
            m.title,
            `The figure metadata suggests ${f.label}, which is not explained on this slide.`,
            "Remove or replace the image, or clearly justify its role in a labelled comparison.",
            /^https?:/.test(m.source) ? m.source : undefined,
          );
      if (
        topicOverlap(deck.topic, m.title) === 0 &&
        topicOverlap(s.title, m.title) === 0 &&
        !profile?.sections.some((section) => topicOverlap(section.title, m.title) > 0.2)
      )
        add(
          s,
          index,
          "medium",
          "Media relevance",
          m.title,
          "No clear topic match was found in the figure's title. This does not establish that the image is wrong.",
          "Inspect the actual image, organism, labels, stain and experimental context before retaining it.",
        );
      if (m.kind === "micrograph" && m.src.startsWith("data:image/svg"))
        add(
          s,
          index,
          "high",
          "Media type",
          m.title,
          "A vector drawing is labelled as a micrograph.",
          "Relabel it as an illustrative diagram or replace it with a correctly attributed experimental image.",
        );
    }
  });
  return issues.sort(
    (a, b) =>
      ({ high: 0, medium: 1, low: 2 })[a.severity] - { high: 0, medium: 1, low: 2 }[b.severity] ||
      a.index - b.index,
  );
}
export type ReferenceCheck = {
  id: string;
  title: string;
  status: "matched" | "mismatch" | "not-found" | "unavailable" | "uncheckable";
  message: string;
  url?: string;
  publication?: PublicationCheck;
  cached?: boolean;
};
const overlap = (a: string, b: string) => {
  const first = new Set(
    normalized(a)
      .split(" ")
      .filter((t) => t.length > 3),
  );
  const second = new Set(
    normalized(b)
      .split(" ")
      .filter((t) => t.length > 3),
  );
  return [...first].filter((t) => second.has(t)).length / Math.max(1, first.size);
};
export async function checkReferenceMetadata(citations: Citation[]): Promise<ReferenceCheck[]> {
  const unique = [...new Map(citations.map((c) => [c.doi || c.pmid || c.id, c])).values()].slice(
    0,
    200,
  );
  const results: ReferenceCheck[] = [];
  for (let offset = 0; offset < unique.length; offset += 3) {
    const batch = await Promise.all(
      unique.slice(offset, offset + 3).map(async (c) => {
        const publication = await checkPublication(c);
        const identifier = c.doi || c.pmid;
        if (!identifier)
          return {
            publication,
            cached: publication.cached,
            id: c.id,
            title: c.title,
            status: "uncheckable" as const,
            message: "No DOI or PMID. Open the original source and check this reference manually.",
          };
        const url = c.doi
          ? `https://api.crossref.org/works/${encodeURIComponent(c.doi.replace(/^https?:\/\/doi.org\//, ""))}`
          : `https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&query=${encodeURIComponent(`EXT_ID:${c.pmid} AND SRC:MED`)}`;
        const source = c.doi
          ? `https://doi.org/${c.doi.replace(/^https?:\/\/doi.org\//, "")}`
          : `https://pubmed.ncbi.nlm.nih.gov/${c.pmid}/`;
        try {
          const response = await fetch(url, {
            signal: AbortSignal.timeout(12000),
            credentials: "omit",
          });
          if (response.status === 404)
            return {
              publication,
              cached: publication.cached,
              id: c.id,
              title: c.title,
              status: "not-found" as const,
              message:
                "No record was returned for this identifier. Check for a transcription error.",
              url: source,
            };
          if (!response.ok) throw Error();
          const json = await response.json();
          const actual = c.doi ? json.message?.title?.[0] : json.resultList?.result?.[0]?.title;
          if (!actual)
            return {
              publication,
              cached: publication.cached,
              id: c.id,
              title: c.title,
              status: "not-found" as const,
              message: "The provider returned no matching record.",
              url: source,
            };
          const match = overlap(c.title, actual) >= 0.6;
          publication.metadataMatch = match;
          publication.metadataTitle = c.title;
          return {
            publication,
            cached: publication.cached,
            id: c.id,
            title: c.title,
            status: match ? ("matched" as const) : ("mismatch" as const),
            message: match
              ? "Identifier and title match provider metadata. Publication notices are reported separately; claim support and study quality still require review."
              : `Identifier resolves to a different title: ${actual}`,
            url: source,
          };
        } catch {
          return {
            publication,
            cached: publication.cached,
            id: c.id,
            title: c.title,
            status: "unavailable" as const,
            message:
              "The metadata provider could not be reached; this does not mean the reference is false.",
            url: source,
          };
        }
      }),
    );
    results.push(...batch);
  }
  return results;
}
