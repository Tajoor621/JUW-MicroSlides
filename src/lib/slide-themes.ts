export const SLIDE_THEMES = [
  "classic",
  "gram",
  "culture",
  "fluorescence",
  "molecular",
  "clinical",
  "mycology",
  "outbreak",
  "parasitology",
  "phycology",
] as const;

export type SlideTheme = (typeof SLIDE_THEMES)[number];

export interface ThemeTokens {
  id: SlideTheme;
  label: string;
  blurb: string;
  frame: string;
  band: string;
  slide: string;
  ink: string;
  navy: string;
  accent: string;
  muted: string;
  dark: boolean;
}

export const THEME_TOKENS: Record<SlideTheme, ThemeTokens> = {
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
    dark: false,
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
    accent: "#7040A0",
    muted: "#6B5A7A",
    dark: false,
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
    dark: false,
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
    dark: true,
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
    dark: false,
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
    dark: false,
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
    dark: false,
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
    dark: false,
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
    dark: false,
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
    dark: false,
  },
};

export function themeOf(id?: string | null): ThemeTokens {
  if (id && id in THEME_TOKENS) return THEME_TOKENS[id as SlideTheme];
  return THEME_TOKENS.classic;
}

export function themeVars(id?: string | null): Record<string, string> {
  const t = themeOf(id);
  return {
    "--color-frame": t.frame,
    "--color-frame-band": t.band,
    "--color-slide": t.slide,
    "--color-ink": t.ink,
    "--color-navy": t.navy,
    "--color-accent": t.accent,
    "--color-ink-muted": t.muted,
  };
}
export function researchTheme(topic: string, discipline: string, layout: string): SlideTheme {
  void layout; // Branding is fixed; topic palettes apply to introductions too.
  const subject = `${topic} ${discipline}`.toLowerCase();
  if (/gram.?stain|acid.?fast/.test(subject)) return "gram";
  if (/fluorescen|confocal/.test(subject)) return "fluorescence";
  if (/outbreak|epidem|one health|transmission/.test(subject)) return "outbreak";
  if (/virus|viral|virolog|influenza|phage|sars/.test(subject)) return "molecular";
  if (/enzyme|biotech|industrial|food|dairy|ferment/.test(subject)) return "culture";
  if (
    /genom|chromosom|nucleoid|plasmid|genetic|dna|rna|pcr|molecular|conjugation|competence|transformation/.test(
      subject,
    )
  )
    return "molecular";
  if (/fung|myco|candida|yeast/.test(subject)) return "mycology";
  if (/parasit|malaria|plasmod/.test(subject)) return "parasitology";
  if (/alga|phycolog/.test(subject)) return "phycology";
  if (/clinical|medical|immun|antimicrobial/.test(subject)) return "clinical";
  if (/environment|soil|outbreak|epidem/.test(subject)) return "outbreak";
  if (/bacteriol/.test(subject)) return "gram";
  return "classic";
}
