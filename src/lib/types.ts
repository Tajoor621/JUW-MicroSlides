import type { SlideTheme } from "./slide-themes";

export const LAYOUTS = [
  "title",
  "content",
  "two-column",
  "full-image",
  "blank",
  "comparison",
  "process-flow",
  "bibliography",
] as const;

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

export const MAX_SLIDES = 50;

export type MediaKind = "micrograph" | "diagram" | "icon" | "photo" | "gif" | "chart" | "video";

export interface MediaItem {
  id: string;
  kind: MediaKind;
  title: string;
  src: string;
  credit: string;
  source: string;
  license: string;
  licenseUrl?: string;
  originalSrc?: string;
  provider?: string;
  keywords: string[];
}

export interface Citation {
  evidenceKind?: "primary" | "review" | "textbook";
  publicationCheck?: import("./publication-status").PublicationCheck;
  id: string;
  type?: "article-journal" | "book" | "chapter" | "report" | "webpage";
  url?: string;
  publisher?: string;
  accessed?: string;
  cslJson?: string;
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

export interface Claim {
  id: string;
  text: string;
  teachingPurpose: string;
  classification: "unclassified" | "foundational" | "study-result" | "guideline";
  status: "unreviewed" | "supported-excerpt" | "lecturer-reviewed" | "stale";
  evidence: {
    citationId?: string;
    sourceUrl: string;
    locator: string;
    quote: string;
    access: "abstract" | "full-text" | "textbook" | "guideline" | "instructor";
    checkedAt: number;
  }[];
  reviewedAt?: number;
  sourceSnapshot?: string;
}

export interface Slide {
  teaching?: import("./teaching").Teaching;
  id: string;
  layout: Layout;
  claims?: Claim[];
  surfaceReviews?: import("./surface-review").SurfaceReview[];
  locked?: boolean;
  teachingPurpose?: string;
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
  teachingVerification?: { instructor: string; at: number; snapshot: string };
  exportMode?: "light" | "dark";
  sourceDocuments?: import("./source-documents").SourceDocument[];
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
  requestedCount?: number;
  contentWarnings?: string[];
  researchLinks?: { id: string; title: string; url: string }[];
  generationSource?: "knowledge" | "cloud-ai" | "local-ai";
  revisionId?: string;
  updatedAt: number;
}

export type DeckMetaPatch = Partial<
  Pick<
    Deck,
    | "teachingVerification"
    | "exportMode"
    | "sourceDocuments"
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
