import type { SlideTheme } from "./slide-themes";

export const LAYOUTS = ["title", "content", "two-column", "full-image", "blank"] as const;

export type Layout = (typeof LAYOUTS)[number];

export const LEVELS = [
  "Undergraduate",
  "Graduate",
  "Medical school",
  "PhD / research seminar",
] as const;

export type Level = (typeof LEVELS)[number];

export const CITATION_STYLES = ["Vancouver", "APA", "Harvard", "Nature", "AMA"] as const;
export type CitationStyle = (typeof CITATION_STYLES)[number];

export const MAX_SLIDES = 400;

export type MediaKind = "micrograph" | "diagram" | "icon" | "photo" | "gif" | "chart";

export interface MediaItem {
  id: string;
  kind: MediaKind;
  title: string;
  src: string;
  credit: string;
  source: string;
  license: string;
  licenseUrl?: string;
  keywords: string[];
}

export interface Citation {
  id: string;
  cslAuthors?: { family?: string; given?: string; literal?: string }[];
  pmid?: string;
  authors: string;
  title: string;
  journal: string;
  year: string;
  volume?: string;
  pages?: string;
  doi?: string;
}

export interface Slide {
  id: string;
  layout: Layout;
  theme: SlideTheme;
  title: string;
  subtitle: string;
  bullets: string[];
  leftBullets: string[];
  rightBullets: string[];
  notes: string;
  citations: Citation[];
  media: MediaItem[];
}

export interface Deck {
  id: string;
  title: string;
  topic: string;
  discipline: string;
  level: Level;
  citationStyle: CitationStyle;
  course: string;
  courseCode: string;
  preparedBy: string;
  department: string;
  slides: Slide[];
  mediaPool: MediaItem[];
  generationSource?: "knowledge" | "cloud-ai" | "local-ai";
  updatedAt: number;
}

export type DeckMetaPatch = Partial<
  Pick<
    Deck,
    | "title"
    | "topic"
    | "discipline"
    | "level"
    | "course"
    | "courseCode"
    | "preparedBy"
    | "department"
  >
>;

export interface GenerateInput {
  topic: string;
  discipline: string;
  count: number;
  level: Level;
  notes: string;
  mode: "manual" | "ai";
  course?: string;
  courseCode?: string;
  preparedBy?: string;
  department?: string;
}

export interface GenerateDraft {
  topic: string;
  discipline: string;
  count: number;
  level: Level;
  notes: string;
  course: string;
  courseCode: string;
  preparedBy: string;
  mode: "manual" | "ai";
}
