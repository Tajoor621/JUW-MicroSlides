import { taggedMedia, mediaAttachmentProblem } from "./lecture-media";
import { toast } from "sonner";
import { reconcileDeck, reconcileClaims } from "./deck-integrity";
import { inspectedReplacement } from "./slide-replacement";
import { MAX_SLIDES } from "./types";
import { assertCompleteDeck } from "./deck-completion";
import { create } from "zustand";
import { durableStorage } from "./durable-storage";
import { createJSONStorage, persist } from "zustand/middleware";
import { lectureMeta } from "./brand";
import { generateLocalDeck, sampleDeck, withOfficialIntro } from "./generate-deck";

import { type SlideTheme, researchTheme } from "./slide-themes";
import type {
  Citation,
  CitationStyle,
  Deck,
  DeckMetaPatch,
  GenerateDraft,
  GenerateInput,
  Layout,
  MediaItem,
  Slide,
} from "./types";
import { mediaKey, uid } from "./utils";
import { improveDraft } from "./draft-improvements";

// Decks are never silently evicted; users control deletion.

type InspectorTab = "edit" | "media" | "cite" | "evidence" | "notes" | "copilot";

interface DeckState {
  workspaceEpoch: number;
  savedNotes: import("./educational-notes").EducationalNote[];
  writingNotes: {
    topic: string;
    body: string;
    sources: string;
    level: import("./types").Level;
    mode: "manual" | "ai";
    document?: import("./educational-notes").EducationalNote;
  };
  patchWritingNotes: (patch: Partial<DeckState["writingNotes"]>) => void;
  refreshWorkspace: () => void;
  library: Deck[];
  activeId: string | null;
  selectedIndex: number;
  inspectorTab: InspectorTab;
  citationStyle: CitationStyle;
  chromeTheme: "dark" | "light";
  railOpen: boolean;
  inspectorOpen: boolean;
  presenting: boolean;
  generateOpen: boolean;
  libraryOpen: boolean;
  settingsOpen: boolean;
  generatorOpen: boolean;
  generationMode: "manual" | "ai";
  generateDraft: GenerateDraft;
  hydrateSample: () => void;
  deck: () => Deck | null;
  slide: () => Slide | null;
  setTab: (t: InspectorTab) => void;
  setTheme: (t: "dark" | "light") => void;
  setCitationStyle: (s: CitationStyle) => void;
  toggleRail: () => void;
  toggleInspector: () => void;
  setPresenting: (v: boolean) => void;
  setGenerateOpen: (v: boolean) => void;
  setLibraryOpen: (v: boolean) => void;
  setSettingsOpen: (v: boolean) => void;
  setGeneratorOpen: (v: boolean) => void;
  patchGenerateDraft: (patch: Partial<GenerateDraft>) => void;
  select: (index: number) => void;
  addSlide: () => void;
  removeSlide: (index: number) => void;
  moveSlide: (index: number, dir: -1 | 1) => void;
  patchSlide: (index: number, patch: Partial<Slide>) => void;
  applySafeCorrections: () => number;
  applyInspectedReplacement: (
    slideId: string,
    proposal: unknown,
    snapshot: string,
    keepFigures: boolean,
  ) => void;
  applyDeckTheme: (theme: SlideTheme) => void;
  generationFailure: { topic: string; count: number; message: string } | null;
  setGenerationFailure: (failure: DeckState["generationFailure"]) => void;
  patchDeck: (patch: DeckMetaPatch) => void;
  renameTopic: (title: string) => void;
  setLayout: (layout: Layout) => void;
  attachMedia: (media: MediaItem) => void;
  removeMedia: (mediaId: string) => void;
  attachCitation: (citation: Citation) => void;
  removeCitation: (citationId: string) => void;
  replaceActive: (deck: Deck) => void;
  generate: (input: GenerateInput, deck?: Deck) => void;
  saveCopy: () => void;
  loadDeck: (id: string) => void;
  deleteDeck: (id: string) => void;
}

function bump(deck: Deck, slides?: Slide[]): Deck {
  return reconcileDeck({
    ...deck,
    slides: slides ?? deck.slides,
    revisionId: uid("revision"),
    updatedAt: Date.now(),
  });
}

const STARTER = sampleDeck();
const EMPTY_DRAFT: GenerateDraft = {
  topic: "",
  discipline: "General Microbiology",
  count: 18,
  level: "Undergraduate",
  notes: "",
  course: lectureMeta({}).course,
  courseCode: lectureMeta({}).courseCode,
  preparedBy: lectureMeta({}).preparedBy,
  mode: "manual",
  generationMode: "standard",
  includeObjectives: true,
  includeAssessment: false,
  focusDepth: "standard",
  visualEmphasis: "auto",
  clinicalCases: 3,
};

export const useDeckStore = create<DeckState>()(
  persist(
    (set, get) => ({
      workspaceEpoch: 0,
      savedNotes: [],
      writingNotes: { topic: "", body: "", sources: "", level: "Undergraduate", mode: "manual" },
      patchWritingNotes: (patch) => set({ writingNotes: { ...get().writingNotes, ...patch } }),
      refreshWorkspace: () =>
        set({
          activeId: null,
          selectedIndex: 0,
          generateDraft: { ...EMPTY_DRAFT, course: "", courseCode: "" },
          writingNotes: {
            topic: "",
            body: "",
            sources: "",
            level: "Undergraduate",
            mode: "manual",
          },
          generationFailure: null,
          workspaceEpoch: get().workspaceEpoch + 1,
          presenting: false,
          generateOpen: false,
          generatorOpen: true,
          inspectorTab: "edit",
          inspectorOpen: false,
          railOpen: false,
        }),
      library: [STARTER],
      activeId: STARTER.id,
      selectedIndex: 0,
      inspectorTab: "edit",
      citationStyle: "Vancouver",
      chromeTheme: "dark",
      railOpen: false,
      inspectorOpen: false,
      presenting: false,
      generateOpen: false,
      libraryOpen: false,
      settingsOpen: false,
      generatorOpen: true,
      generationMode: "manual",
      generateDraft: EMPTY_DRAFT,
      generationFailure: null,
      setGenerationFailure: (generationFailure) => set({ generationFailure }),
      applyDeckTheme: (theme) => {
        const d = get().deck();
        if (!d) return;
        if (d.slides.length > MAX_SLIDES || d.slides.some((s) => s.locked)) {
          toast.error(
            "Unlock every slide before applying a deck theme. Legacy archives stay unchanged.",
          );
          return;
        }
        const next = bump(
          d,
          d.slides.map((s) => ({ ...s, theme })),
        );
        set({ library: get().library.map((item) => (item.id === d.id ? next : item)) });
      },
      hydrateSample: () => {
        const usable = get().library.filter((d) => d.slides.length > 0);
        if (usable.length > 0) return;
        const deck = sampleDeck();
        set({ library: [deck], activeId: deck.id, selectedIndex: 0 });
      },
      deck: () =>
        get().activeId === null
          ? null
          : (get().library.find((d) => d.id === get().activeId) ?? null),
      slide: () => {
        const d = get().deck();
        if (!d) return null;
        return d.slides[get().selectedIndex] ?? d.slides[0] ?? null;
      },
      setTab: (inspectorTab) => set({ inspectorTab }),
      setTheme: (chromeTheme) => set({ chromeTheme }),
      setCitationStyle: (citationStyle) => set({ citationStyle }),
      toggleRail: () => set({ railOpen: !get().railOpen }),
      toggleInspector: () => set({ inspectorOpen: !get().inspectorOpen }),
      setPresenting: (presenting) => set({ presenting }),
      setGenerateOpen: (generateOpen) => set({ generateOpen }),
      setLibraryOpen: (libraryOpen) => set({ libraryOpen }),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
      setGeneratorOpen: (generatorOpen) => set({ generatorOpen }),
      patchGenerateDraft: (patch) => set({ generateDraft: { ...get().generateDraft, ...patch } }),
      select: (index) => {
        const d = get().deck();
        if (!d) return;
        const i = Math.max(0, Math.min(index, d.slides.length - 1));
        set({ selectedIndex: i });
      },
      addSlide: () => {
        const d = get().deck();
        if (!d || d.slides.length >= MAX_SLIDES) return;
        const slide: Slide = {
          id: uid("s"),
          layout: "content",
          theme:
            d.slides.find((s) => s.layout !== "title")?.theme ??
            researchTheme(d.topic, d.discipline, "content"),
          title: "New slide",
          subtitle: "",
          bullets: ["Add a teaching point."],
          leftBullets: [],
          rightBullets: [],
          notes: "",
          citations: [],
          media: [],
        };
        const slides = [...d.slides, slide];
        const next = bump(d, slides);
        set({
          library: get().library.map((x) => (x.id === next.id ? next : x)),
          selectedIndex: slides.length - 1,
        });
      },
      removeSlide: (index) => {
        const d = get().deck();
        if (!d || d.slides.length <= 1 || d.slides.length > MAX_SLIDES || d.slides[index]?.locked)
          return;
        const slides = d.slides.filter((_, i) => i !== index);
        const next = bump(d, slides);
        set({
          library: get().library.map((x) => (x.id === next.id ? next : x)),
          selectedIndex: Math.max(0, Math.min(get().selectedIndex, slides.length - 1)),
        });
      },
      moveSlide: (index, dir) => {
        const d = get().deck();
        if (!d || d.slides.length > MAX_SLIDES) return;
        const j = index + dir;
        if (j < 0 || j >= d.slides.length) return;
        const slides = d.slides.slice();
        const [item] = slides.splice(index, 1);
        slides.splice(j, 0, item);
        const next = bump(d, slides);
        set({
          library: get().library.map((x) => (x.id === next.id ? next : x)),
          selectedIndex: j,
        });
      },
      patchSlide: (index, patch) => {
        const d = get().deck();
        if (!d) return;
        if (d.slides.length > MAX_SLIDES || (d.slides[index]?.locked && patch.locked !== false))
          return;
        const slides = d.slides.map((s, i) =>
          i === index ? reconcileClaims({ ...s, ...patch }) : s,
        );
        const next = bump(d, slides);
        set({ library: get().library.map((x) => (x.id === next.id ? next : x)) });
      },
      applySafeCorrections: () => {
        const d = get().deck();
        if (!d || d.slides.length > MAX_SLIDES) return 0;
        const result = improveDraft(d);
        if (result.changes.length) {
          const next = bump(d, result.deck.slides);
          set({ library: get().library.map((x) => (x.id === next.id ? next : x)) });
        }
        return result.changes.length;
      },
      applyInspectedReplacement: (slideId, proposal, snapshot, keepFigures) => {
        const deck = get().deck();
        if (!deck) throw Error("No active lecture.");
        const patch = inspectedReplacement(deck, slideId, proposal, snapshot, keepFigures);
        const next = bump({ ...deck, mediaPool: patch.mediaPool }, patch.slides);
        set({ library: get().library.map((d) => (d.id === next.id ? next : d)) });
      },
      patchDeck: (patch) => {
        const d = get().deck();
        if (!d || d.slides.length > MAX_SLIDES) return;
        const next = bump({ ...d, ...patch });
        set({ library: get().library.map((x) => (x.id === next.id ? next : x)) });
      },
      renameTopic: (title) => {
        const d = get().deck();
        if (d && (d.slides.length > MAX_SLIDES || d.slides[0]?.locked)) return;
        const generateDraft = { ...get().generateDraft, topic: title };
        if (!d) {
          set({ generateDraft });
          return;
        }
        const slides = d.slides.map((s, i) =>
          i === 0 && s.layout === "title" ? { ...s, title } : s,
        );
        const next = bump({ ...d, title, topic: title.trim() || d.topic }, slides);
        set({
          generateDraft,
          selectedIndex: 0,
          library: get().library.map((x) => (x.id === next.id ? next : x)),
        });
      },
      setLayout: (layout) => {
        const i = get().selectedIndex;
        get().patchSlide(i, { layout });
      },
      attachMedia: (media) => {
        const problem = mediaAttachmentProblem(media);
        if (problem) {
          toast.error(problem);
          return;
        }
        media = taggedMedia(media);
        const d = get().deck();
        const s = get().slide();
        if (!d || !s || s.locked || d.slides.length > MAX_SLIDES) return;
        const key = mediaKey(media.src);
        if (s.media.some((m) => m.id === media.id || mediaKey(m.src) === key)) return;
        const slides = d.slides.map((sl, i) =>
          i === get().selectedIndex
            ? {
                ...sl,
                media: [...sl.media, media].slice(0, 4),
                teaching: sl.teaching
                  ? {
                      ...sl.teaching,
                      diagram: undefined,
                      ...(sl.teaching.diagram || !sl.media.length
                        ? { altText: "", labels: [], scaleBar: undefined, legend: "" }
                        : {}),
                    }
                  : undefined,
              }
            : sl,
        );
        const mediaPool = d.mediaPool ?? [];
        const next = bump({ ...d, mediaPool }, slides);
        set({ library: get().library.map((x) => (x.id === next.id ? next : x)) });
      },
      removeMedia: (mediaId) => {
        const d = get().deck();
        const s = get().slide();
        if (!d || !s || s.locked || d.slides.length > MAX_SLIDES) return;
        const removed = s.media.find((m) => m.id === mediaId);
        const remaining = s.media.filter((m) => m.id !== mediaId);
        const used = new Set<string>();
        d.slides.forEach((sl, i) => {
          if (i === get().selectedIndex) return;
          sl.media.forEach((m) => {
            used.add(m.id);
            used.add(mediaKey(m.src));
          });
        });
        const media = remaining;
        let mediaPool = [...(d.mediaPool ?? [])];
        if (
          removed &&
          !mediaPool.some((m) => m.id === removed.id || mediaKey(m.src) === mediaKey(removed.src))
        ) {
          mediaPool = [removed, ...mediaPool];
        }
        const slides = d.slides.map((sl, i) => (i === get().selectedIndex ? { ...sl, media } : sl));
        const next = bump({ ...d, mediaPool }, slides);
        set({ library: get().library.map((x) => (x.id === next.id ? next : x)) });
      },
      attachCitation: (citation) => {
        const s = get().slide();
        if (!s) return;
        if (s.citations.some((c) => c.id === citation.id)) return;
        get().patchSlide(get().selectedIndex, { citations: [...s.citations, citation] });
      },
      removeCitation: (citationId) => {
        const s = get().slide();
        if (!s) return;
        get().patchSlide(get().selectedIndex, {
          citations: s.citations.filter((c) => c.id !== citationId),
        });
      },
      replaceActive: (deck) => {
        const lib = get().library.filter((d) => d.id !== deck.id);
        set({
          library: [deck, ...lib],
          activeId: deck.id,
          selectedIndex: 0,
        });
      },
      generate: (input, deck) => {
        const made = reconcileDeck(withOfficialIntro(deck ?? generateLocalDeck(input), input));
        assertCompleteDeck(made, input.count);
        made.citationStyle = get().citationStyle;
        get().replaceActive(made);
        set({
          generateOpen: false,
          generatorOpen: false,
          generationMode: input.mode,
          inspectorTab: "edit",
          inspectorOpen: false,
          selectedIndex: 0,
          generateDraft: {
            ...get().generateDraft,
            topic: input.topic,
            discipline: input.discipline,
            count: input.count,
            mode: input.mode,
          },
        });
        if (typeof document !== "undefined") {
          queueMicrotask(() => {
            const stage = document.querySelector("[data-slide-stage]");
            const scroller = stage?.closest("main");
            if (!stage || !(scroller instanceof HTMLElement)) return;
            const top =
              stage.getBoundingClientRect().top -
              scroller.getBoundingClientRect().top +
              scroller.scrollTop -
              8;
            scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
          });
        }
      },
      saveCopy: () => {
        const d = get().deck();
        if (!d) return;
        const copy: Deck = {
          ...d,
          id: uid("deck"),
          title: `${d.title} (copy)`,
          updatedAt: Date.now(),
          slides: d.slides.map((s) => ({ ...s, id: uid("s") })),
        };
        set({ library: [copy, ...get().library], activeId: copy.id });
      },
      loadDeck: (id) => {
        const found = get().library.find((d) => d.id === id);
        if (!found) return;
        set({ activeId: id, selectedIndex: 0, libraryOpen: false });
      },
      deleteDeck: (id) => {
        const lib = get().library.filter((d) => d.id !== id);
        const activeId = get().activeId === id ? (lib[0]?.id ?? null) : get().activeId;
        set({ library: lib, activeId, selectedIndex: 0 });
      },
    }),
    {
      name: "juw-microslides-schema-1",
      storage: createJSONStorage(() => durableStorage),
      version: 1,
      migrate: (state) => state as DeckState,
      partialize: (s) => ({
        library: s.library.filter((d) => d.slides.length > 0),
        activeId: s.activeId,
        writingNotes: s.writingNotes,
        savedNotes: s.savedNotes,
        selectedIndex: s.selectedIndex,
        citationStyle: s.citationStyle,
        chromeTheme: s.chromeTheme,
        generationMode: s.generationMode,
        generateDraft: s.generateDraft,
        generatorOpen: s.generatorOpen,
      }),
      merge: (persisted, current) => {
        const p = (persisted || {}) as Partial<DeckState>;
        // A saved sample is still lecturer work. Refreshing it here changes claim IDs
        // and invalidates review packs on every restart, even without an edit.
        const pLib = (p.library ?? []).filter((d) => d.slides.length > 0);
        const cLib = current.library.filter((d) => d.slides.length > 0);
        const lib = pLib.length ? pLib : cLib;
        if (!lib.length) return current;
        const preferredId = pLib.length ? p.activeId : current.activeId;
        const activeId =
          preferredId === null
            ? null
            : lib.some((d) => d.id === preferredId)
              ? preferredId!
              : lib[0].id;
        return {
          ...current,
          ...p,
          library: lib,
          activeId,
          // Older saves did not retain this panel. Keep completed decks in view;
          // empty workspaces and the starter example still invite generation.
          generatorOpen: p.generatorOpen ?? (!activeId || activeId === "sample-enzyme-mic4511"),
          generateDraft: { ...current.generateDraft, ...(p.generateDraft ?? {}) },
          writingNotes: { ...current.writingNotes, ...(p.writingNotes ?? {}) },
        };
      },
    },
  ),
);

if (typeof window !== "undefined") {
  const boot = () => useDeckStore.getState().hydrateSample();
  // Wait for durable storage before creating a sample or editing.
  useDeckStore.persist.onFinishHydration(boot);
}
