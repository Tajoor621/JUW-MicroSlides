import type { Citation, Deck, MediaItem } from "./types";
import { mediaKey, wikimediaFileName } from "./utils";

import { RAW_CATALOG } from "./media-catalog-data";

const FILE_FIXES: Record<string, string> = {
  "Candida_albicans_Gram.jpg": "Candida_albicans.jpg",
  "Helicobacter_pylori_EM.jpg": "Helicobacter_pylori.jpg",
  "Root_nodules.jpg": "Glycine_max_root_nodules.jpg",
  "Gram_Stain_Technique.png": "Gram_stain_01.jpg",
  "SDS-PAGE_electrophoresis.jpg": "SDS-PAGE.jpg",
  "Gram-positive_and_negative_cell_wall.svg": "Gram_positive_bacteria.jpg",
  "Bacterial_colonies.jpg": "Petri_dish.jpg",
  "Neutrophil_with_anthrax_bacteria.jpg": "Neutrophil.jpg",
  "Entamoeba_histolytica_life_cycle_stages.jpg": "Entamoeba_histolytica.jpg",
  "Bacillus_subtilis_Spore_Stain.jpg": "Bacillus_subtilis_Spore.jpg",
};

const BROKEN_FILES = new Set([
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
  "Phage_lytic_cycle.svg",
]);

function commonsFile(file: string): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=640`;
}

export const MEDIA_CATALOG: MediaItem[] = RAW_CATALOG.map((item) => {
  const file = wikimediaFileName(item.src);
  if (file && FILE_FIXES[file]) return { ...item, src: commonsFile(FILE_FIXES[file]) };
  if (file && BROKEN_FILES.has(file)) {
    return {
      ...item,
      src: uniqueBars(item.title),
      credit: "JUW-MicroSlides teaching visual (CC0)",
      source: "Generated open teaching diagram",
      license: "CC0",
    };
  }
  if (file && item.src.includes("thumb.php")) {
    return {
      ...item,
      src: `https://commons.wikimedia.org/w/thumb.php?f=${encodeURIComponent(file)}&width=640`,
    };
  }
  if (file && item.src.includes("Special:FilePath")) {
    return { ...item, src: commonsFile(file) };
  }
  return item;
});

export function searchMedia(query: string, limit = 12, exclude = new Set<string>()): MediaItem[] {
  const q = query.trim().toLowerCase();
  const pool = MEDIA_CATALOG.filter(
    (item) => !exclude.has(item.id) && !exclude.has(mediaKey(item.src)),
  );
  if (!q) return pool.slice(0, limit);
  const terms = q.split(/\s+/).filter((t) => t.length > 1);
  const scored = pool.map((item) => {
    const hay =
      `${item.title} ${item.keywords.join(" ")} ${item.kind} ${item.source}`.toLowerCase();
    const score = terms.reduce(
      (n, t) => n + (hay.includes(t) ? 2 : 0) + (item.title.toLowerCase().includes(t) ? 2 : 0),
      0,
    );
    return { item, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored
    .filter((x) => x.score > 0)
    .map((s) => s.item)
    .slice(0, limit);
}

export function suggestMediaForText(
  text: string,
  limit = 3,
  exclude = new Set<string>(),
): MediaItem[] {
  return searchMedia(text, limit, exclude);
}

export function takeUniqueMedia(text: string, used: Set<string>): MediaItem {
  const hit = searchMedia(text, 8, used)[0];
  if (hit) return hit;
  return teachingVisual(text, used);
}

export function fallbackVisual(title: string): MediaItem {
  return teachingVisual(title || "Open teaching figure", new Set());
}

export function usedMediaKeys(deck: Deck): Set<string> {
  const used = new Set<string>();
  for (const slide of deck.slides) {
    for (const m of slide.media) {
      used.add(m.id);
      used.add(mediaKey(m.src));
    }
  }
  for (const m of deck.mediaPool ?? []) {
    used.add(m.id);
    used.add(mediaKey(m.src));
  }
  return used;
}

export function applyCollectedMedia(
  deck: Deck,
  collected?: {
    assigned?: Record<string, MediaItem>;
    pool?: MediaItem[];
    items?: MediaItem[];
    citations?: Citation[];
  } | null,
): Deck {
  const extras = [
    ...Object.values(collected?.assigned ?? {}),
    ...(collected?.pool ?? []),
    ...(collected?.items ?? []),
  ];
  const next = attachUniqueMedia(deck, extras, collected?.assigned);
  const papers = collected?.citations ?? [];
  if (!papers.length) return next;
  const seen = new Set<string>();
  const fresh = papers.filter((paper) => {
    const key = (paper.doi || paper.pmid || paper.title).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!fresh.length) return next;
  const usedPapers = new Set<string>();
  const slides = next.slides.map((slide, index) => {
    if (/reference/i.test(slide.title)) {
      const merged = [...slide.citations];
      for (const paper of fresh) {
        if (!merged.some((c) => c.id === paper.id || c.title === paper.title)) merged.push(paper);
      }
      return {
        ...slide,
        citations: merged.slice(0, 8),
        bullets: merged.slice(0, 6).map((c) => `${c.authors} (${c.year}). ${c.title}.`),
      };
    }
    if (slide.layout === "title" || slide.citations.length > 0) return slide;
    const wantsPaper =
      /evidence|history|paper|mechanism|vignette|why .* matters/i.test(slide.title) ||
      index % 4 === 2;
    if (!wantsPaper) return slide;
    const paper = fresh.find((item) => !usedPapers.has(item.id));
    if (!paper) return slide;
    usedPapers.add(paper.id);
    return { ...slide, citations: [paper] };
  });
  return { ...next, slides };
}

export function attachUniqueMedia(
  deck: Deck,
  extras: MediaItem[] = [],
  preferred: Record<string, MediaItem> = {},
): Deck {
  const used = new Set<string>();
  const slides = deck.slides.map((slide) => {
    if (slide.layout === "title") return { ...slide, media: [] };
    const preferredHit = preferred[slide.id];
    if (preferredHit && !used.has(preferredHit.id) && !used.has(mediaKey(preferredHit.src))) {
      used.add(preferredHit.id);
      used.add(mediaKey(preferredHit.src));
      return { ...slide, media: [preferredHit] };
    }
    const existing = slide.media.filter((m) => {
      const key = mediaKey(m.src);
      if (used.has(m.id) || used.has(key)) return false;
      used.add(m.id);
      used.add(key);
      return true;
    });
    if (existing.length > 0) return { ...slide, media: existing.slice(0, 1) };

    const query = `${slide.title} ${slide.subtitle} ${slide.bullets.join(" ")} ${slide.leftBullets.join(" ")} ${deck.topic} ${deck.discipline}`;
    const extraHit = extras.find(
      (m) => !used.has(m.id) && !used.has(mediaKey(m.src)) && matchesQuery(m, query),
    );
    const media = extraHit ?? takeUniqueMedia(query, used);
    used.add(media.id);
    used.add(mediaKey(media.src));
    return { ...slide, media: [media] };
  });

  const pool: MediaItem[] = [];
  const seen = new Set(used);
  const candidates = [
    ...(deck.mediaPool ?? []),
    ...extras,
    ...searchMedia(`${deck.topic} ${deck.discipline}`, 80, seen),
    ...searchMedia("", 80, seen),
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

  return { ...deck, slides, mediaPool: pool };
}

function matchesQuery(item: MediaItem, query: string): boolean {
  const hay = `${item.title} ${item.keywords.join(" ")}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2)
    .some((t) => hay.includes(t));
}

function teachingVisual(seed: string, used: Set<string>): MediaItem {
  const s = seed.toLowerCase();
  const templates = [
    {
      id: "viz-growth",
      kind: "chart" as const,
      title: "Microbial growth curve",
      draw: growthChart,
      hit: /growth|lag|log phase|cfu|batch.culture/,
    },
    {
      id: "viz-immobilise",
      kind: "diagram" as const,
      title: "Enzyme immobilisation modes",
      draw: immobiliseDiagram,
      hit: /immobil|enzyme|alginate|adsorption|entrap|covalent/,
    },
    {
      id: "viz-oxygen",
      kind: "chart" as const,
      title: "Oxygen classes of microbes",
      draw: oxygenChart,
      hit: /oxygen|aerob|anaerob|microaeroph/,
    },
    {
      id: "viz-gram",
      kind: "diagram" as const,
      title: "Gram wall comparison",
      draw: gramDiagram,
      hit: /gram|peptidoglycan|envelope|staph|mrsa|wall/,
    },
    {
      id: "viz-cycle",
      kind: "diagram" as const,
      title: "Replication cycle",
      draw: cycleDiagram,
      hit: /cycle|replicat|virus|viral|phage|baltimore/,
    },
    {
      id: "viz-mic",
      kind: "chart" as const,
      title: "MIC dilution series",
      draw: micChart,
      hit: /mic\b|dilution|ast|antibiotic|resist/,
    },
    {
      id: "viz-central",
      kind: "diagram" as const,
      title: "Central dogma in microbes",
      draw: dogmaDiagram,
      hit: /dna|rna|translat|transcri|gene|pcr|16s|qpcr/,
    },
    {
      id: "viz-hurdle",
      kind: "diagram" as const,
      title: "Hurdle technology",
      draw: hurdleDiagram,
      hit: /hurdle|food|spoilage|aw\b|dairy/,
    },
    {
      id: "viz-mm",
      kind: "chart" as const,
      title: "Michaelis–Menten kinetics",
      draw: mmChart,
      hit: /kinetics|michaelis|km\b|vmax|enzyme/,
    },
    {
      id: "viz-pcr",
      kind: "diagram" as const,
      title: "Thermal cycle",
      draw: pcrDiagram,
      hit: /pcr|qpcr|thermal|primer|amplicon|16s/,
    },
    {
      id: "viz-biofilm",
      kind: "diagram" as const,
      title: "Biofilm stages",
      draw: biofilmDiagram,
      hit: /biofilm|eps|device|catheter/,
    },
    {
      id: "viz-batch",
      kind: "chart" as const,
      title: "Batch vs fed-batch",
      draw: batchChart,
      hit: /fed-batch|bioreactor|ferment|industrial/,
    },
    {
      id: "viz-bars",
      kind: "chart" as const,
      title: "Lecture quantitative panel",
      draw: uniqueBars,
      hit: /.*/,
    },
    {
      id: "viz-flow",
      kind: "diagram" as const,
      title: "Process flow",
      draw: uniqueFlow,
      hit: /.*/,
    },
  ];
  const matched = templates.filter((t) => t.hit.test(s));
  const pool = matched.length
    ? matched
    : templates.filter((t) => t.id === "viz-bars" || t.id === "viz-flow");
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
      keywords: seed.toLowerCase().split(/\s+/).slice(0, 6),
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
    keywords: seed.toLowerCase().split(/\s+/).slice(0, 6),
  };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function svgWrap(body: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">${body}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function growthChart(label: string): string {
  return svgWrap(
    `<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Batch-culture growth curve</text>
     <text x="24" y="52" font-size="11" font-family="sans-serif" fill="#5c6b7a">${escapeXml(label)}</text>
     <polyline fill="none" stroke="#2f6f86" stroke-width="4" points="60,300 140,295 220,210 340,90 480,80 580,160"/>
     <text x="70" y="330" font-size="11" fill="#5c6b7a">lag</text>
     <text x="210" y="330" font-size="11" fill="#5c6b7a">log</text>
     <text x="400" y="330" font-size="11" fill="#5c6b7a">stationary</text>
     <text x="530" y="330" font-size="11" fill="#5c6b7a">death</text>`,
  );
}

function immobiliseDiagram(label: string): string {
  return svgWrap(
    `<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Enzyme immobilisation</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label)}</text>
     <circle cx="120" cy="190" r="54" fill="#c5d4de" stroke="#0b1520" stroke-width="2"/>
     <text x="120" y="196" text-anchor="middle" font-size="12">adsorption</text>
     <rect x="230" y="140" width="110" height="100" rx="8" fill="#e8edf4" stroke="#0b1520" stroke-width="2"/>
     <text x="285" y="196" text-anchor="middle" font-size="12">entrapment</text>
     <circle cx="430" cy="190" r="54" fill="#4e8ea8" opacity=".35" stroke="#0b1520" stroke-width="2"/>
     <text x="430" y="196" text-anchor="middle" font-size="12">covalent</text>
     <rect x="520" y="150" width="80" height="80" rx="40" fill="#954a33" opacity=".25" stroke="#0b1520" stroke-width="2"/>
     <text x="560" y="196" text-anchor="middle" font-size="12">membrane</text>`,
  );
}

function oxygenChart(label: string): string {
  return svgWrap(
    `<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Oxygen relationships</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label)}</text>
     ${["obligate aerobe", "facultative", "aerotolerant", "microaerophile", "obligate anaerobe"]
       .map(
         (name, i) =>
           `<rect x="${70 + i * 110}" y="110" width="90" height="180" rx="8" fill="#fff" stroke="#0b1520"/>
            <text x="${115 + i * 110}" y="310" text-anchor="middle" font-size="10">${name}</text>`,
       )
       .join("")}
     <circle cx="115" cy="140" r="12" fill="#2f6f86"/>
     <circle cx="225" cy="140" r="10" fill="#2f6f86"/><circle cx="225" cy="250" r="10" fill="#2f6f86"/>
     <circle cx="335" cy="200" r="10" fill="#2f6f86"/>
     <circle cx="445" cy="175" r="10" fill="#2f6f86"/>
     <circle cx="555" cy="260" r="12" fill="#2f6f86"/>`,
  );
}

function gramDiagram(label: string): string {
  return svgWrap(
    `<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Cell envelope</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label)}</text>
     <rect x="70" y="120" width="220" height="160" fill="#6b8f71"/>
     <rect x="90" y="150" width="180" height="100" fill="#d7c4a3"/>
     <text x="180" y="300" text-anchor="middle" font-size="13">Gram-positive</text>
     <rect x="360" y="120" width="220" height="160" fill="#c5d4de"/>
     <rect x="380" y="145" width="180" height="24" fill="#954a33"/>
     <rect x="380" y="185" width="180" height="40" fill="#6b8f71"/>
     <rect x="380" y="240" width="180" height="24" fill="#d7c4a3"/>
     <text x="470" y="300" text-anchor="middle" font-size="13">Gram-negative</text>`,
  );
}

function cycleDiagram(label: string): string {
  return svgWrap(
    `<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Infection / replication cycle</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label)}</text>
     ${["attach", "enter", "replicate", "assemble", "release"]
       .map((n, i) => {
         const x = 70 + i * 110;
         return `<circle cx="${x + 30}" cy="190" r="34" fill="#4e8ea8" opacity=".3" stroke="#0b1520"/>
                 <text x="${x + 30}" y="196" text-anchor="middle" font-size="12">${n}</text>
                 ${i < 4 ? `<path d="M${x + 70} 190 h30" stroke="#0b1520" marker-end="url(#a)"/>` : ""}`;
       })
       .join("")}`,
  );
}

function micChart(label: string): string {
  return svgWrap(
    `<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Broth microdilution (MIC)</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label)}</text>
     ${Array.from({ length: 8 }, (_, i) => {
       const x = 50 + i * 70;
       const cloudy = i < 4;
       return `<rect x="${x}" y="120" width="58" height="140" rx="6" fill="${cloudy ? "#c5d4de" : "#f7f4ec"}" stroke="#0b1520"/>
               <text x="${x + 29}" y="290" text-anchor="middle" font-size="10">${64 >> i} µg</text>`;
     }).join("")}
     <text x="50" y="330" font-size="12" fill="#2f6f86">growth →</text>
     <text x="430" y="330" font-size="12" fill="#2f6f86">MIC (first clear well)</text>`,
  );
}

function dogmaDiagram(label: string): string {
  return svgWrap(
    `<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Information flow</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label)}</text>
     <rect x="40" y="150" width="140" height="70" rx="8" fill="#fff" stroke="#0b1520"/><text x="110" y="190" text-anchor="middle">DNA</text>
     <rect x="250" y="150" width="140" height="70" rx="8" fill="#fff" stroke="#0b1520"/><text x="320" y="190" text-anchor="middle">mRNA</text>
     <rect x="460" y="150" width="140" height="70" rx="8" fill="#fff" stroke="#0b1520"/><text x="530" y="190" text-anchor="middle">protein</text>
     <text x="175" y="140" font-size="12">transcription</text>
     <text x="385" y="140" font-size="12">translation</text>`,
  );
}

function hurdleDiagram(label: string): string {
  return svgWrap(
    `<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Hurdle technology</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label)}</text>
     ${["pH", "aw", "T°", "salt", "MAP", "compete"]
       .map(
         (n, i) =>
           `<rect x="${50 + i * 95}" y="${120 + (i % 2) * 20}" width="80" height="120" fill="#4e8ea8" opacity="${0.25 + i * 0.08}" stroke="#0b1520"/>
            <text x="${90 + i * 95}" y="310" text-anchor="middle" font-size="12">${n}</text>`,
       )
       .join("")}`,
  );
}

function mmChart(label: string): string {
  return svgWrap(
    `<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Michaelis–Menten</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label)}</text>
     <polyline fill="none" stroke="#2f6f86" stroke-width="4" points="50,300 90,220 140,160 220,120 340,95 520,85"/>
     <line x1="50" y1="80" x2="580" y2="80" stroke="#954a33" stroke-dasharray="6 4"/>
     <text x="500" y="72" font-size="12" fill="#954a33">Vmax</text>
     <text x="300" y="340" font-size="12" fill="#5c6b7a">[S] →</text>
     <text x="20" y="190" font-size="12" fill="#5c6b7a" transform="rotate(-90 20 190)">v</text>`,
  );
}

function pcrDiagram(label: string): string {
  return svgWrap(
    `<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">PCR thermal cycle</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label)}</text>
     ${["95° denature", "55° anneal", "72° extend"]
       .map((n, i) => {
         const x = 70 + i * 180;
         return `<rect x="${x}" y="130" width="150" height="110" rx="10" fill="#fff" stroke="#0b1520"/>
                 <text x="${x + 75}" y="192" text-anchor="middle" font-size="14">${n}</text>`;
       })
       .join("")}`,
  );
}

function biofilmDiagram(label: string): string {
  return svgWrap(
    `<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Biofilm development</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label)}</text>
     ${["attach", "colonise", "EPS", "mature", "disperse"]
       .map((n, i) => {
         const x = 50 + i * 118;
         return `<circle cx="${x + 40}" cy="190" r="${28 + i * 3}" fill="#4e8ea8" opacity="${0.25 + i * 0.1}" stroke="#0b1520"/>
                 <text x="${x + 40}" y="270" text-anchor="middle" font-size="12">${n}</text>`;
       })
       .join("")}`,
  );
}

function batchChart(label: string): string {
  return svgWrap(
    `<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Batch vs fed-batch</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label)}</text>
     <polyline fill="none" stroke="#954a33" stroke-width="4" points="50,300 120,200 220,120 400,110 560,200"/>
     <polyline fill="none" stroke="#2f6f86" stroke-width="4" points="50,300 140,240 240,160 360,100 560,70"/>
     <text x="430" y="70" font-size="12" fill="#2f6f86">fed-batch</text>
     <text x="430" y="200" font-size="12" fill="#954a33">batch</text>`,
  );
}

function uniqueBars(label: string): string {
  const h = hash(label);
  const bars = Array.from({ length: 7 }, (_, i) => {
    const ht = 48 + ((h >> (i * 3)) % 170);
    const x = 70 + i * 76;
    return `<rect x="${x}" y="${300 - ht}" width="52" height="${ht}" fill="${i % 2 ? "#2f6f86" : "#954a33"}" opacity="${0.45 + (i % 3) * 0.15}"/>
            <text x="${x + 26}" y="322" text-anchor="middle" font-size="9" fill="#5c6b7a">${String.fromCharCode(65 + i)}</text>`;
  }).join("");
  return svgWrap(
    `<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Open teaching chart</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label.slice(0, 72))}</text>
     ${bars}`,
  );
}

function uniqueFlow(label: string): string {
  const words = label
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 4);
  const steps = words.length ? words : ["sample", "assay", "read", "decide"];
  const nodes = steps
    .map((w, i) => {
      const x = 40 + i * 150;
      return `<rect x="${x}" y="140" width="130" height="80" rx="10" fill="#fff" stroke="#0b1520"/>
              <text x="${x + 65}" y="186" text-anchor="middle" font-size="13">${escapeXml(w.slice(0, 12))}</text>
              ${i < steps.length - 1 ? `<path d="M${x + 134} 180 h12" stroke="#0b1520" stroke-width="2"/>` : ""}`;
    })
    .join("");
  return svgWrap(
    `<rect width="640" height="360" fill="#f7f4ec"/>
     <text x="24" y="32" font-size="16" font-family="Georgia,serif" fill="#0b1520">Open teaching schematic</text>
     <text x="24" y="52" font-size="11" fill="#5c6b7a">${escapeXml(label.slice(0, 72))}</text>
     ${nodes}`,
  );
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
