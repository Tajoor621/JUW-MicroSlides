import { createServerFn } from "@tanstack/react-start";
import type { Citation, MediaItem, MediaKind } from "./types";
import { uid } from "./utils";

const UA = "JUW-MicroSlides/6.2 (microbiology lecture studio; mailto:microslides@juw.edu.pk)";

export interface DeckMediaQuery {
  topic: string;
  discipline: string;
  slides: Array<{ id: string; title: string; text: string }>;
}

export interface DeckResearch {
  ok: true;
  assigned: Record<string, MediaItem>;
  pool: MediaItem[];
  items: MediaItem[];
  citations: Citation[];
}

async function getJson(url: string, ms = 5000): Promise<unknown | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": UA },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function kindOf(title: string, mime = "", url = ""): MediaKind {
  const hay = `${title} ${mime} ${url}`.toLowerCase();
  if (hay.includes("gif")) return "gif";
  if (/chart|graph|plot|curve|histogram/.test(hay)) return "chart";
  if (/diagram|schematic|pathway|cycle|illustration|drawing/.test(hay)) return "diagram";
  if (/micrograph|sem|tem|microscop|stain|gram|colon/.test(hay)) return "micrograph";
  return "photo";
}

const LOOSE = new Set(["microbiology", "microscopy", "micrograph", "diagram", "schematic", "illustration", "photo", "image", "with", "from", "that", "this"]);

function sharesTerm(title: string, query: string): boolean {
  const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 3 && !LOOSE.has(term));
  if (!terms.length) return true;
  const hay = title.toLowerCase();
  return terms.some((term) => hay.includes(term));
}

function clean(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function item(partial: Omit<MediaItem, "id" | "kind"> & { kind?: MediaKind; mime?: string }): MediaItem | null {
  const src = partial.src.trim();
  if (!/^https?:\/\//i.test(src)) return null;
  if (/\.(pdf|svg)(\?|$)/i.test(src)) return null;
  return {
    id: uid("live"),
    kind: partial.kind ?? kindOf(partial.title, partial.mime, src),
    title: partial.title.slice(0, 140) || "Open figure",
    src,
    credit: partial.credit || "Open contributor",
    source: partial.source,
    license: partial.license || "See source",
    keywords: partial.keywords.map((k) => k.toLowerCase()).filter((k) => k.length > 2).slice(0, 12),
  };
}

function dedupeMedia(list: MediaItem[]): MediaItem[] {
  const seen = new Set<string>();
  const out: MediaItem[] = [];
  for (const media of list) {
    const key = media.src.split("?")[0].toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(media);
  }
  return out;
}

const EXPAND: Array<[RegExp, string]> = [
  [/staphylococ|mrsa|mssa/i, "Staphylococcus aureus Gram stain"],
  [/streptococ|pyogenes|pneumococ/i, "Streptococcus pyogenes Gram stain"],
  [/enterococ/i, "Enterococcus Gram stain"],
  [/escherichia|e\.?\s*coli|stec/i, "Escherichia coli colonies"],
  [/shigella/i, "Shigella microscopy"],
  [/klebsiella/i, "Klebsiella pneumoniae colonies"],
  [/campylobacter/i, "Campylobacter jejuni microscopy"],
  [/helicobacter|h\.\s*pylori/i, "Helicobacter pylori microscopy"],
  [/legionella/i, "Legionella pneumophila"],
  [/haemophilus/i, "Haemophilus influenzae"],
  [/bordetella|pertussis/i, "Bordetella pertussis"],
  [/corynebacter|diphtheria/i, "Corynebacterium diphtheriae"],
  [/listeria/i, "Listeria monocytogenes"],
  [/chlamydia/i, "Chlamydia trachomatis"],
  [/mycoplasma/i, "Mycoplasma pneumoniae"],
  [/treponema|syphilis/i, "Treponema pallidum"],
  [/borrelia|lyme/i, "Borrelia burgdorferi"],
  [/hepatitis\s*b|\bhbv\b/i, "hepatitis B virus diagram"],
  [/hepatitis\s*c|\bhcv\b/i, "hepatitis C virus diagram"],
  [/coronavirus|sars-cov|covid/i, "coronavirus virion diagram"],
  [/hpv|papilloma/i, "human papillomavirus diagram"],
  [/norovirus/i, "norovirus electron micrograph"],
  [/rotavirus/i, "rotavirus electron micrograph"],
  [/plasmodium|malaria/i, "Plasmodium falciparum blood film"],
  [/quorum/i, "quorum sensing diagram"],
  [/biofilm/i, "bacterial biofilm micrograph"],
  [/endospore|sporulat/i, "bacterial endospore stain"],
  [/gram stain|peptidoglycan/i, "Gram stain micrograph"],
  [/lac operon|operon/i, "lac operon diagram"],
  [/nitrogen|nitrif|rhizob/i, "nitrogen cycle bacteria"],
  [/vaccine/i, "vaccine antigen diagram"],
  [/\btb\b|tuberculosis|mycobacter/i, "Mycobacterium tuberculosis acid-fast"],
  [/candida/i, "Candida albicans microscopy"],
  [/aspergillus/i, "Aspergillus fumigatus conidia"],
  [/e\.?\s*coli|escherichia/i, "Escherichia coli colonies"],
  [/cholera|vibrio/i, "Vibrio cholerae"],
  [/salmonella|typhoid/i, "Salmonella microscopy"],
  [/influenza|\bflu\b/i, "influenza virus electron micrograph"],
  [/\bhiv\b/i, "HIV virion diagram"],
  [/biofilm/i, "bacterial biofilm micrograph"],
  [/enzyme immobil|immobil/i, "immobilized enzyme alginate beads"],
  [/hepatitis/i, "hepatitis virus diagram"],
  [/giardia/i, "Giardia lamblia trophozoite"],
  [/leishmania/i, "Leishmania amastigote"],
  [/trypanosom/i, "Trypanosoma blood film"],
  [/schistosom/i, "Schistosoma egg"],
  [/cryptococcus/i, "Cryptococcus neoformans India ink"],
  [/pseudomonas/i, "Pseudomonas aeruginosa colonies"],
  [/clostrid|difficile|tetanus|botulism/i, "Clostridium microscopy"],
  [/neisseria|gonorrh|meningococ/i, "Neisseria Gram stain"],
  [/streptococ/i, "Streptococcus Gram stain"],
  [/bacillus|anthrax/i, "Bacillus anthracis Gram stain"],
  [/pcr|qpcr|16s/i, "PCR gel electrophoresis"],
  [/gram stain|gram-positive|gram-negative/i, "Gram stain micrograph"],
  [/phage|bacteriophage/i, "bacteriophage electron micrograph"],
  [/penicillin|beta-lactam|antibiotic/i, "antibiotic disk diffusion"],
  [/brucella|brucellosis/i, "Brucella melitensis microscopy"],
  [/leptospir/i, "Leptospira interrogans dark field"],
  [/rickettsia|typhus/i, "Rickettsia micrograph"],
  [/borrelia|lyme/i, "Borrelia burgdorferi"],
  [/helicobacter|\bh\.\s*pylori\b/i, "Helicobacter pylori microscopy"],
  [/neisseria|gonorrh|meningococ/i, "Neisseria Gram stain"],
  [/ebv|epstein|barr virus/i, "Epstein-Barr virus diagram"],
  [/cytomegalovirus|\bcmv\b/i, "cytomegalovirus micrograph"],
  [/varicella|\bvzv\b|herpes zoster/i, "varicella zoster virus"],
  [/measles/i, "measles virus diagram"],
  [/dengue/i, "dengue virus diagram"],
  [/rabies/i, "rabies virus electron micrograph"],
  [/histoplasma|blastomyces|coccidioid|sporothrix/i, "dimorphic fungus microscopy"],
  [/entamoeba|amoeb/i, "Entamoeba histolytica trophozoite"],
  [/toxoplasma/i, "Toxoplasma gondii tachyzoite"],
  [/ascaris|hookworm|taenia|echinococcus/i, "helminth egg microscopy"],
  [/biofilm|quorum/i, "bacterial biofilm micrograph"],
  [/nitrogen|nitrif|rhizob/i, "nitrogen cycle bacteria"],
  [/gram stain|peptidoglycan|cell wall/i, "Gram stain micrograph"],
  [/operon|lac operon|transcription/i, "lac operon diagram"],
  [/vaccine/i, "vaccine antigen diagram"],
  [/elisa|serolog/i, "ELISA diagram"],
];

function expandedQueries(topic: string): string[] {
  const extra = EXPAND.filter(([re]) => re.test(topic)).map(([, query]) => query);
  return [topic, ...extra];
}

function taxonName(topic: string): string | null {
  const binomial = topic.match(/\b([A-Z][a-z]{2,})\s+([a-z]{3,})\b/);
  if (binomial) return `${binomial[1]} ${binomial[2]}`;
  const known = topic.split(/[^A-Za-z]+/).find((word) =>
    /^(staphylococcus|escherichia|plasmodium|candida|mycobacterium|salmonella|pseudomonas|vibrio|bacillus|streptococcus|aspergillus|cryptococcus|neisseria|klebsiella|clostridium|listeria|giardia|toxoplasma|trypanosoma|leishmania|schistosoma)$/i.test(
      word,
    ),
  );
  return known ?? null;
}

async function searchWikimedia(query: string): Promise<MediaItem[]> {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search" +
    `&gsrnamespace=6&gsrlimit=16&prop=imageinfo&iiprop=url|mime|extmetadata&iiurlwidth=960` +
    `&gsrsearch=${encodeURIComponent(query)}`;
  const body = (await getJson(url)) as {
    query?: {
      pages?: Record<
        string,
        {
          title?: string;
          imageinfo?: Array<{
            thumburl?: string;
            url?: string;
            mime?: string;
            extmetadata?: Record<string, { value?: string }>;
          }>;
        }
      >;
    };
  } | null;
  const pages = Object.values(body?.query?.pages ?? {});
  const out: MediaItem[] = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    const src = info?.thumburl || info?.url || "";
    const meta = info?.extmetadata ?? {};
    const title = clean(page.title).replace(/^File:/i, "").replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " ");
    if (!sharesTerm(title, query) && out.length >= 5) continue;
    if ((info?.mime || "").includes("svg")) continue;
    const made = item({
      title,
      src,
      mime: info?.mime,
      credit: clean(meta.Artist?.value).slice(0, 80) || "Wikimedia Commons",
      source: "Wikimedia Commons",
      license: clean(meta.LicenseShortName?.value) || "Open licence",
      keywords: query.split(/[^a-z0-9]+/i).slice(0, 6),
    });
    if (made) out.push(made);
  }
  return out;
}

async function searchOpenverse(query: string, gif = false): Promise<MediaItem[]> {
  const url =
    `https://api.openverse.org/v1/images/?page_size=12&q=${encodeURIComponent(query)}` +
    (gif ? "&extension=gif" : "");
  const body = (await getJson(url)) as {
    results?: Array<{
      title?: string;
      url?: string;
      creator?: string;
      license?: string;
      source?: string;
      filetype?: string;
    }>;
  } | null;
  const out: MediaItem[] = [];
  for (const row of body?.results ?? []) {
    const title = clean(row.title) || query;
    if (row.title && !sharesTerm(title, query) && out.length >= 4) continue;
    const made = item({
      title,
      src: row.url || "",
      mime: row.filetype,
      kind: gif ? "gif" : undefined,
      credit: clean(row.creator) || "Openverse",
      source: `Openverse / ${clean(row.source) || "open image"}`,
      license: row.license || "Open licence",
      keywords: query.split(/[^a-z0-9]+/i).slice(0, 6),
    });
    if (made) out.push(made);
  }
  return out;
}

async function searchWikipedia(topic: string): Promise<MediaItem[]> {
  const title = topic.trim().replace(/\s+/g, "_");
  if (title.length < 3) return [];
  const body = (await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)) as {
    title?: string;
    originalimage?: { source?: string };
    thumbnail?: { source?: string };
    description?: string;
  } | null;
  const src = body?.originalimage?.source || body?.thumbnail?.source || "";
  const made = item({
    title: clean(body?.title) || topic,
    src,
    credit: "Wikipedia",
    source: "Wikipedia",
    license: "CC BY-SA",
    keywords: [topic, clean(body?.description)].join(" ").split(/[^a-z0-9]+/i).slice(0, 6),
  });
  return made ? [made] : [];
}

async function searchWellcome(query: string): Promise<MediaItem[]> {
  const body = (await getJson(
    `https://api.wellcomecollection.org/catalogue/v2/images?pageSize=6&query=${encodeURIComponent(query)}`,
  )) as {
    results?: Array<{
      id?: string;
      source?: { title?: string; credit?: string };
      thumbnail?: { url?: string };
      locations?: Array<{ license?: { label?: string } }>;
    }>;
  } | null;
  const out: MediaItem[] = [];
  for (const row of body?.results ?? []) {
    const thumb = row.thumbnail?.url || "";
    const iiif = row.id ? `https://iiif.wellcomecollection.org/image/${row.id}/full/800,/0/default.jpg` : thumb;
    const made = item({
      title: clean(row.source?.title) || query,
      src: iiif || thumb,
      credit: clean(row.source?.credit) || "Wellcome Collection",
      source: "Wellcome Collection",
      license: row.locations?.[0]?.license?.label || "Open licence",
      keywords: query.split(/[^a-z0-9]+/i).slice(0, 6),
    });
    if (made) out.push(made);
  }
  return out;
}

async function searchGbif(name: string): Promise<MediaItem[]> {
  const found = (await getJson(`https://api.gbif.org/v1/species/search?limit=1&q=${encodeURIComponent(name)}`)) as {
    results?: Array<{ key?: number; scientificName?: string }>;
  } | null;
  const key = found?.results?.[0]?.key;
  if (!key) return [];
  const media = (await getJson(`https://api.gbif.org/v1/species/${key}/media?limit=4`)) as {
    results?: Array<{ identifier?: string; title?: string; creator?: string; license?: string }>;
  } | null;
  const out: MediaItem[] = [];
  for (const row of media?.results ?? []) {
    const made = item({
      title: clean(row.title) || found?.results?.[0]?.scientificName || name,
      src: row.identifier || "",
      credit: clean(row.creator) || "GBIF",
      source: "GBIF",
      license: row.license || "Open licence",
      keywords: name.split(/\s+/),
    });
    if (made) out.push(made);
  }
  return out;
}

async function searchOpenI(query: string): Promise<MediaItem[]> {
  const url = `https://openi.nlm.nih.gov/api/search?query=${encodeURIComponent(query)}&it=mc,g,c&m=1&n=12`;
  const body = (await getJson(url, 7000)) as {
    list?: Array<{
      title?: string;
      imgLarge?: string;
      imgThumbLarge?: string;
      authors?: string;
      journal_title?: string;
      pmcid?: string;
    }>;
  } | null;
  const out: MediaItem[] = [];
  for (const row of body?.list ?? []) {
    const path = row.imgLarge || row.imgThumbLarge || "";
    if (!path) continue;
    const src = path.startsWith("http") ? path : `https://openi.nlm.nih.gov${path}`;
    const title = clean(row.title) || query;
    if (!sharesTerm(title, query) && !sharesTerm(query, title) && out.length >= 4) continue;
    const made = item({
      title,
      src,
      kind: "micrograph",
      credit: clean(row.authors).slice(0, 80) || "NLM Open-i",
      source: row.pmcid ? `NLM Open-i / ${row.pmcid}` : "NLM Open-i",
      license: "PMC open access",
      keywords: query.split(/[^a-z0-9]+/i).slice(0, 6),
    });
    if (made) out.push(made);
  }
  return out;
}

async function searchINaturalist(name: string): Promise<MediaItem[]> {
  const body = (await getJson(
    `https://api.inaturalist.org/v1/taxa?per_page=1&q=${encodeURIComponent(name)}`,
  )) as {
    results?: Array<{
      name?: string;
      preferred_common_name?: string;
      default_photo?: { medium_url?: string; attribution?: string; license_code?: string };
    }>;
  } | null;
  const row = body?.results?.[0];
  const src = row?.default_photo?.medium_url || "";
  const made = item({
    title: row?.preferred_common_name || row?.name || name,
    src,
    credit: clean(row?.default_photo?.attribution) || "iNaturalist",
    source: "iNaturalist",
    license: row?.default_photo?.license_code || "Open licence",
    keywords: name.split(/\s+/),
    kind: "photo",
  });
  return made ? [made] : [];
}

async function searchWikipediaLoose(topic: string): Promise<MediaItem[]> {
  const found = (await getJson(
    `https://en.wikipedia.org/w/api.php?action=opensearch&limit=3&namespace=0&format=json&search=${encodeURIComponent(topic)}`,
  )) as [string, string[]] | null;
  const titles = Array.isArray(found?.[1]) ? found[1].slice(0, 2) : [];
  const parts = await Promise.all(titles.map((title) => searchWikipedia(title).catch(() => [] as MediaItem[])));
  return dedupeMedia(parts.flat());
}

async function searchLecture(queries: string[]): Promise<MediaItem[]> {
  const cleaned = queries.map((q) => q.trim()).filter((q) => q.length > 2);
  const [head, ...rest] = cleaned;
  if (!head) return [];
  const taxon = taxonName(head) || taxonName(cleaned.join(" "));
  const jobs: Promise<MediaItem[]>[] = [
    searchWikimedia(head),
    searchWikimedia(`${head} micrograph`),
    searchWikimedia(`${head} diagram`),
    searchWikimedia(`${head} microscopy`),
    searchOpenverse(head),
    searchOpenverse(`${head} microscopy`),
    searchOpenverse(`${head} diagram`),
    searchOpenI(head),
    searchOpenI(`${head} micrograph`),
    searchWikipedia(head),
    searchWikipediaLoose(head),
    searchWellcome(`${head} microbiology`),
    searchEuropePmcFigures(head),
  ];
  if (taxon) jobs.push(searchGbif(taxon), searchINaturalist(taxon), searchOpenI(`${taxon} micrograph`), searchWikimedia(`${taxon} micrograph`));
  for (const query of rest.slice(0, 12)) {
    jobs.push(searchWikimedia(query), searchOpenI(query));
  }
  for (const query of rest.slice(0, 4)) jobs.push(searchOpenverse(query));
  const parts = await Promise.all(jobs.map((job) => job.catch(() => [] as MediaItem[])));
  return dedupeMedia(parts.flat());
}

interface PubMedSummary {
  title?: string;
  fulljournalname?: string;
  source?: string;
  pubdate?: string;
  volume?: string;
  pages?: string;
  elocationid?: string;
  authors?: Array<{ name?: string }>;
}

async function searchPubMed(topic: string): Promise<Citation[]> {
  const qualified = await searchPubMedTerm(`${topic} microbiology`);
  if (qualified.length >= 4) return qualified;
  const plain = await searchPubMedTerm(topic);
  const seen = new Set<string>();
  return [...qualified, ...plain].filter((paper) => {
    const key = paper.pmid || paper.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchPubMedTerm(topic: string): Promise<Citation[]> {
  const term = topic.replace(/\s+/g, " ").trim();
  const searchUrl =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=10&sort=relevance" +
    `&tool=juw-microslides&email=microslides@juw.edu.pk&term=${encodeURIComponent(term)}`;
  const found = (await getJson(searchUrl)) as { esearchresult?: { idlist?: string[] } } | null;
  const ids = found?.esearchresult?.idlist?.filter(Boolean).slice(0, 10) ?? [];
  if (!ids.length) return [];
  const summaryUrl =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json" +
    `&tool=juw-microslides&email=microslides@juw.edu.pk&id=${ids.join(",")}`;
  const summary = (await getJson(summaryUrl)) as {
    result?: Record<string, PubMedSummary | string[] | undefined>;
  } | null;
  const papers: Citation[] = [];
  for (const id of ids) {
    const row = summary?.result?.[id];
    if (!row || Array.isArray(row) || typeof row === "string" || !row.title) continue;
    papers.push({
      id: `pmid-${id}`,
      pmid: id,
      authors:
        (row.authors ?? [])
          .map((a) => a.name)
          .filter(Boolean)
          .slice(0, 3)
          .join(", ") || "Unknown",
      title: row.title.replace(/\.$/, ""),
      journal: row.fulljournalname || row.source || "PubMed",
      year: (row.pubdate || "").slice(0, 4) || "n.d.",
      volume: row.volume,
      pages: row.pages,
      doi: (row.elocationid || "").replace(/^doi:\s*/i, "") || undefined,
    });
  }
  return papers;
}

async function searchEuropePmcFigures(topic: string): Promise<MediaItem[]> {
  const found = (await getJson(
    "https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&pageSize=4&resultType=core" +
      `&query=${encodeURIComponent(`${topic} HAS_FT:Y`)}`,
    7000,
  )) as {
    resultList?: { result?: Array<{ pmcid?: string; title?: string }> };
  } | null;
  const ids = (found?.resultList?.result ?? []).map((row) => row.pmcid).filter((id): id is string => Boolean(id)).slice(0, 3);
  const figures = await Promise.all(
    ids.map(async (pmcid) => {
      const body = (await getJson(`https://www.ebi.ac.uk/europepmc/webservices/rest/${pmcid}/figures?format=json`, 6000)) as {
        figure?: Array<{ label?: string; caption?: string; imageUrl?: string; url?: string }>;
      } | null;
      return (body?.figure ?? []).slice(0, 2).map((fig) =>
        item({
          title: clean(fig.label || fig.caption).slice(0, 140) || `${topic} figure`,
          src: fig.imageUrl || fig.url || "",
          kind: "micrograph",
          credit: pmcid,
          source: `Europe PMC / ${pmcid}`,
          license: "PMC open access",
          keywords: topic.split(/[^a-z0-9]+/i).slice(0, 6),
        }),
      );
    }),
  );
  return figures.flat().filter((media): media is MediaItem => Boolean(media));
}

async function searchCrossref(topic: string): Promise<Citation[]> {
  const url =
    `https://api.crossref.org/works?rows=6&mailto=microslides@juw.edu.pk&select=DOI,title,author,container-title,issued&query=${encodeURIComponent(`${topic} microbiology`)}`;
  const body = (await getJson(url)) as {
    message?: {
      items?: Array<{
        DOI?: string;
        title?: string[];
        "container-title"?: string[];
        author?: Array<{ family?: string; given?: string }>;
        issued?: { "date-parts"?: number[][] };
      }>;
    };
  } | null;
  return (body?.message?.items ?? [])
    .filter((work) => work.title?.[0])
    .map((work) => ({
      id: `doi-${(work.DOI || uid("doi")).toLowerCase()}`,
      authors:
        (work.author ?? [])
          .slice(0, 3)
          .map((a) => [a.family, a.given].filter(Boolean).join(" "))
          .filter(Boolean)
          .join(", ") || "Unknown",
      title: (work.title?.[0] || "").replace(/\.$/, ""),
      journal: work["container-title"]?.[0] || "Crossref",
      year: String(work.issued?.["date-parts"]?.[0]?.[0] || "n.d."),
      doi: work.DOI,
    }));
}

async function searchSemanticScholar(topic: string): Promise<Citation[]> {
  const url =
    "https://api.semanticscholar.org/graph/v1/paper/search?limit=6" +
    `&fields=title,year,authors,venue,externalIds&query=${encodeURIComponent(`${topic} microbiology`)}`;
  const body = (await getJson(url, 6000)) as {
    data?: Array<{
      paperId?: string;
      title?: string;
      year?: number;
      venue?: string;
      authors?: Array<{ name?: string }>;
      externalIds?: { DOI?: string; PubMed?: string };
    }>;
  } | null;
  return (body?.data ?? [])
    .filter((paper) => paper.title)
    .map((paper) => ({
      id: paper.externalIds?.PubMed ? `pmid-${paper.externalIds.PubMed}` : `s2-${paper.paperId || uid("s2")}`,
      pmid: paper.externalIds?.PubMed,
      doi: paper.externalIds?.DOI,
      authors: (paper.authors ?? []).map((a) => a.name).filter(Boolean).slice(0, 3).join(", ") || "Unknown",
      title: (paper.title || "").replace(/\.$/, ""),
      journal: paper.venue || "Semantic Scholar",
      year: paper.year ? String(paper.year) : "n.d.",
    }));
}

async function searchEuropePmc(topic: string): Promise<Citation[]> {
  const url =
    "https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&pageSize=8&resultType=lite" +
    `&query=${encodeURIComponent(`${topic} microbiology`)}`;
  const body = (await getJson(url)) as {
    resultList?: {
      result?: Array<{
        title?: string;
        authorString?: string;
        journalTitle?: string;
        pubYear?: string;
        doi?: string;
        pmid?: string;
      }>;
    };
  } | null;
  return (body?.resultList?.result ?? [])
    .filter((row) => row.title)
    .map((row) => ({
      id: row.pmid ? `pmid-${row.pmid}` : uid("pmc"),
      pmid: row.pmid,
      authors: (row.authorString || "Unknown").split(",").slice(0, 3).join(","),
      title: (row.title || "").replace(/\.$/, ""),
      journal: row.journalTitle || "Europe PMC",
      year: row.pubYear || "n.d.",
      doi: row.doi,
    }));
}

async function searchOpenAlexWorks(topic: string): Promise<Citation[]> {
  const url =
    `https://api.openalex.org/works?per_page=8&mailto=microslides@juw.edu.pk&search=${encodeURIComponent(`${topic} microbiology`)}`;
  const body = (await getJson(url)) as {
    results?: Array<{
      id?: string;
      display_name?: string;
      publication_year?: number;
      doi?: string;
      authorships?: Array<{ author?: { display_name?: string } }>;
      primary_location?: { source?: { display_name?: string } };
    }>;
  } | null;
  return (body?.results ?? [])
    .filter((work) => work.display_name)
    .map((work) => ({
      id: `oa-${work.id?.split("/").pop() || uid("oa")}`,
      authors:
        work.authorships
          ?.slice(0, 3)
          .map((a) => a.author?.display_name)
          .filter((name): name is string => Boolean(name))
          .join(", ") || "Unknown",
      title: (work.display_name || "").replace(/\.$/, ""),
      journal: work.primary_location?.source?.display_name || "OpenAlex",
      year: work.publication_year ? String(work.publication_year) : "n.d.",
      doi: work.doi?.replace(/^https?:\/\/doi.org\//i, ""),
    }));
}

function dedupeCitations(list: Citation[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const paper of list) {
    const key = (paper.doi || paper.pmid || paper.title).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(paper);
  }
  return out.slice(0, 24);
}

function scoreMedia(media: MediaItem, text: string): number {
  const terms = text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 3);
  const hay = `${media.title} ${media.keywords.join(" ")} ${media.source}`.toLowerCase();
  let score = 0;
  for (const term of terms) if (hay.includes(term)) score += 2;
  if (/micrograph|diagram|schematic|stain/.test(hay) && /figure|morpholog|visible|stain|cycle|pathway/.test(text.toLowerCase())) {
    score += 2;
  }
  return score;
}

function assignMedia(slides: DeckMediaQuery["slides"], pool: MediaItem[], topic: string): Record<string, MediaItem> {
  const assigned: Record<string, MediaItem> = {};
  const used = new Set<string>();
  const content = slides.filter((slide) => slide.id && !/^(title|learning objectives)\b/i.test(slide.title));
  const ranked = content
    .map((slide) => ({ slide, weight: slide.text.length + slide.title.length }))
    .sort((a, b) => b.weight - a.weight);
  for (const { slide } of ranked) {
    let best: MediaItem | null = null;
    let bestScore = 0;
    for (const media of pool) {
      if (used.has(media.src)) continue;
      const score = scoreMedia(media, `${topic} ${slide.title} ${slide.text}`);
      if (score > bestScore) {
        best = media;
        bestScore = score;
      }
    }
    if (!best || bestScore < 1) continue;
    used.add(best.src);
    assigned[slide.id] = best;
  }
  for (const slide of content) {
    if (assigned[slide.id]) continue;
    const fallback =
      pool.find((media) => !used.has(media.src) && (sharesTerm(media.title, topic) || sharesTerm(media.title, slide.title))) ||
      pool.find((media) => !used.has(media.src));
    if (!fallback) continue;
    used.add(fallback.src);
    assigned[slide.id] = fallback;
  }
  return assigned;
}

export async function gatherDeckResearch(input: DeckMediaQuery): Promise<DeckResearch> {
  const topic = input.topic.trim();
  const discipline = input.discipline.trim();
  const slideQueries = input.slides
    .filter((slide) => !/learning objective|take-home|selected reference|^title$/i.test(slide.title))
    .slice(0, 16)
    .map((slide) => {
      const bare = slide.title.replace(new RegExp(topic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), "").replace(/^[:\s—-]+/, "").trim();
      const hint = /figure|morpholog|stain|visible|structure/.test(slide.title.toLowerCase())
        ? "micrograph"
        : /cycle|pathway|mechanism|envelope|genome/.test(slide.title.toLowerCase())
          ? "diagram"
          : /curve|quantitative|kinetic|number/.test(slide.title.toLowerCase())
            ? "graph"
            : "microscopy";
      return `${topic} ${bare} ${hint}`.replace(/\s+/g, " ").trim();
    });
  const queries = [
    ...expandedQueries(topic),
    `${topic} micrograph`,
    `${topic} diagram`,
    `${topic} microscopy`,
    discipline && discipline !== topic ? `${topic} ${discipline}` : "",
    ...slideQueries,
  ].filter((query, index, all) => query.length > 2 && all.indexOf(query) === index);
  const [media, ...papers] = await Promise.all([
    searchLecture(queries),
    searchPubMed(topic).catch(() => [] as Citation[]),
    searchPubMed(`${topic} review`).catch(() => [] as Citation[]),
    searchEuropePmc(topic).catch(() => [] as Citation[]),
    searchOpenAlexWorks(topic).catch(() => [] as Citation[]),
    searchCrossref(topic).catch(() => [] as Citation[]),
    searchSemanticScholar(topic).catch(() => [] as Citation[]),
  ]);
  const assigned = assignMedia(input.slides, media, topic);
  const taken = new Set(Object.values(assigned).map((m) => m.src));
  const pool = media.filter((m) => !taken.has(m.src)).slice(0, 40);
  return {
    ok: true,
    assigned,
    pool,
    items: media.slice(0, 72),
    citations: dedupeCitations(papers.flat()),
  };
}

export const collectDeckMedia = createServerFn({ method: "POST" })
  .validator((input: DeckMediaQuery) => input)
  .handler(async ({ data }) => gatherDeckResearch(data));

export const searchOpenMedia = createServerFn({ method: "POST" })
  .validator((input: { query: string }) => input)
  .handler(async ({ data }) => {
    const query = data.query.trim();
    if (query.length < 2) return { ok: false as const, error: "Type a species, stain, or method." };
    const items = await searchLecture([query, `${query} microbiology micrograph`]);
    if (!items.length) return { ok: false as const, error: "No open-licence hits. Try a species, stain, or method name." };
    return { ok: true as const, items: items.slice(0, 24) };
  });

export const proxyImages = createServerFn({ method: "POST" })
  .validator((input: { srcs: string[] }) => ({ srcs: (input.srcs ?? []).filter((src) => /^https?:/i.test(src)).slice(0, 12) }))
  .handler(async ({ data }) => {
    const map: Record<string, string> = {};
    await Promise.all(
      data.srcs.map(async (src) => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 7000);
        try {
          const res = await fetch(src, {
            signal: ctrl.signal,
            headers: { "User-Agent": UA, Accept: "image/avif,image/webp,image/apng,image/*,*/*" },
          });
          if (!res.ok) return;
          const type = (res.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
          if (!/^image\/(png|jpe?g|gif|webp)$/i.test(type)) return;
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length < 80 || buf.length > 3_500_000) return;
          map[src] = `data:${type};base64,${buf.toString("base64")}`;
        } catch {
          /* leave this figure to the teaching visual */
        } finally {
          clearTimeout(timer);
        }
      }),
    );
    return { ok: true as const, map };
  });

