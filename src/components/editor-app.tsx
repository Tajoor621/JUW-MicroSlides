import { exportTeachingPdf } from "@/lib/export-teaching";
import { ProfessionalWorkspace } from "./professional-workspace";
import { packProject } from "@/lib/project-format";
import { saveFile } from "@/lib/desktop";
import { AppUpdates } from "./app-updates";
import { storageHealth } from "@/lib/durable-storage";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Library,
  Microscope,
  Moon,
  PanelLeft,
  PanelRight,
  Play,
  Plus,
  Printer,
  Settings,
  Sun,
  Trash2,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { JUW } from "@/lib/brand";
import { useDeckStore } from "@/lib/deck-store";
import { exportPptx } from "@/lib/export-pptx";
import { CITATION_STYLES, LAYOUTS, type CitationStyle, type Layout } from "@/lib/types";
import { researchTheme, SLIDE_THEMES, THEME_TOKENS } from "@/lib/slide-themes";
import { GenerateDialog } from "./generate-dialog";
import { GeneratePanel } from "./generate-panel";
import { InspectorPanel } from "./inspector-panel";
import { Presenter } from "./presenter";
import { SlideView } from "./slide-view";
import { undo, redo } from "@/lib/history";
import { LocalAiSettings } from "./local-ai-settings";
import { LibraryBackup } from "./library-backup";
import { Wordmark } from "./wordmark";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tooltip, TooltipProvider } from "./ui/tooltip";

export function EditorApp() {
  const [hydrated, setHydrated] = useState(false);
  const [online, setOnline] = useState(typeof navigator === "undefined" || navigator.onLine);
  useEffect(() => {
    const refresh = () => setOnline(navigator.onLine);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);
  const [saveStatus, setSaveStatus] = useState(storageHealth.warning || "Saved on this device");
  useEffect(() => {
    const off = useDeckStore.persist.onFinishHydration(() => setHydrated(true));
    if (useDeckStore.persist.hasHydrated()) setHydrated(true);
    const failure = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      setSaveStatus("Save failed — download backup");
      toast.error(message, { duration: Infinity });
    };
    const saving = () => setSaveStatus("Saving…");
    const saved = () => setSaveStatus(storageHealth.warning || "Saved on this device");
    window.addEventListener("juw-storage", failure);
    window.addEventListener("juw-saving", saving);
    window.addEventListener("juw-saved", saved);
    return () => {
      off();
      window.removeEventListener("juw-storage", failure);
      window.removeEventListener("juw-saving", saving);
      window.removeEventListener("juw-saved", saved);
    };
  }, []);
  const theme = useDeckStore((s) => s.chromeTheme);
  const deck = useDeckStore((s) => s.deck());
  const slide = useDeckStore((s) => s.slide());
  const index = useDeckStore((s) => s.selectedIndex);
  const style = useDeckStore((s) => s.citationStyle);
  const select = useDeckStore((s) => s.select);
  const addSlide = useDeckStore((s) => s.addSlide);
  const removeSlide = useDeckStore((s) => s.removeSlide);
  const moveSlide = useDeckStore((s) => s.moveSlide);
  const patchDeck = useDeckStore((s) => s.patchDeck);
  const setLayout = useDeckStore((s) => s.setLayout);
  const railOpen = useDeckStore((s) => s.railOpen);
  const toggleRail = useDeckStore((s) => s.toggleRail);
  const toggleInspector = useDeckStore((s) => s.toggleInspector);
  const setPresenting = useDeckStore((s) => s.setPresenting);
  const setLibraryOpen = useDeckStore((s) => s.setLibraryOpen);
  const setSettingsOpen = useDeckStore((s) => s.setSettingsOpen);
  const setTheme = useDeckStore((s) => s.setTheme);
  const generationMode = useDeckStore((s) => s.generationMode);
  const failure = useDeckStore((s) => s.generationFailure);
  const generatorOpen = useDeckStore((s) => s.generatorOpen);
  const [themeScope, setThemeScope] = useState("deck");
  function applyTheme(theme: (typeof SLIDE_THEMES)[number]) {
    if (themeScope === "deck") useDeckStore.getState().applyDeckTheme(theme);
    else useDeckStore.getState().patchSlide(index, { theme });
  }

  useEffect(() => {
    const finish = () => useDeckStore.getState().hydrateSample();
    if (useDeckStore.persist.hasHydrated()) finish();
    const unsub = useDeckStore.persist.onFinishHydration(finish);
    if (useDeckStore.persist.hasHydrated()) finish();
    return unsub;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    document.title = `${deck?.topic || "Research workspace"} — ${JUW.name} ${JUW.version}`;
  }, [deck?.topic]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target?.tagName;
      if (target?.closest?.('[role="dialog"], [role="alertdialog"]')) {
        if (
          e.key === "F5" ||
          ((e.ctrlKey || e.metaKey) && ["n", "s", "o"].includes(e.key.toLowerCase()))
        )
          e.preventDefault();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && ["n", "s", "o"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        target?.blur(); // Commit any inline content edit before saving or switching views.
        const store = useDeckStore.getState();
        if (e.key.toLowerCase() === "n") store.setGeneratorOpen(true);
        if (e.key.toLowerCase() === "o") store.setLibraryOpen(true);
        if (e.key.toLowerCase() === "s" && store.deck())
          void packProject(store.deck()!)
            .then((data) => saveFile("lecture.juwslides", data, "juwslides"))
            .catch((error) => toast.error(error.message));
        return;
      }
      if (e.key === "F5") {
        e.preventDefault();
        target?.blur();
        useDeckStore.getState().setPresenting(true);
        return;
      }
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable)
        return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        select(index + 1);
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        select(index - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, select]);

  async function onPptx() {
    if (!deck) return;
    try {
      toast.message("Embedding figures into PowerPoint…");
      await exportPptx(deck);
      toast.success("PowerPoint downloaded. Check layout and figure attribution before sharing.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not write the PPTX file.");
    }
  }

  const [printing, setPrinting] = useState(false);

  async function onPdf() {
    if (!deck) return;
    setPrinting(true);
    try {
      await exportTeachingPdf(deck);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF export failed.");
    } finally {
      setPrinting(false);
    }
  }

  const cited = deck?.slides.filter((s) => s.citations.length > 0).length ?? 0;
  const total = deck?.slides.length ?? 0;

  if (!hydrated)
    return (
      <div role="status" className="p-6">
        Opening your saved decks…
      </div>
    );
  return (
    <TooltipProvider>
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-bg text-fg">
        <div role="status" className="shrink-0 border-b border-border px-3 py-1 text-xs text-muted">
          {online ? "Online" : "Offline"} · {saveStatus} ·{" "}
          {deck?.generationSource === "local-ai"
            ? "Local AI draft"
            : deck?.generationSource === "cloud-ai"
              ? "Cloud AI draft"
              : "Knowledge draft"}{" "}
          · Verify scientific claims · Library → backup · Ctrl/Cmd+Z to undo
        </div>
        <AppUpdates />
        <ProfessionalWorkspace />
        {deck?.requestedCount && deck.slides.length < deck.requestedCount ? (
          <p
            role="status"
            className="shrink-0 border-b border-border bg-surface px-3 py-2 text-xs text-fg"
          >
            Saved deck: {deck.slides.length} of {deck.requestedCount} originally requested slides.
            Open Generate and choose Generate deck to build a new complete deck.
          </p>
        ) : null}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-2 sm:px-3">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={toggleRail}
            aria-label="Slides"
          >
            <PanelLeft />
          </Button>
          <Wordmark compact />
          <span className="hidden rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium tracking-wide text-accent-fg sm:inline">
            {JUW.version}
          </span>
          <Input
            value={deck?.slides[0]?.layout === "title" ? deck.slides[0].title : (deck?.title ?? "")}
            onChange={(e) => useDeckStore.getState().renameTopic(e.target.value)}
            className="hidden h-9 max-w-sm border-transparent bg-transparent font-serif text-sm md:block"
            aria-label="Lecture topic"
            placeholder="Type a topic — title slide updates"
          />
          <span
            className={`hidden rounded-full border px-2 py-0.5 text-[10px] tracking-wide sm:inline ${
              generationMode === "ai"
                ? "border-accent bg-accent/15 text-accent"
                : "border-border bg-elevated text-muted"
            }`}
          >
            {generationMode === "ai" ? "AI mode" : "Knowledge mode"}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Tooltip content="New deck">
              <Button
                variant="accent"
                size="sm"
                onClick={() => {
                  const state = useDeckStore.getState();
                  state.setGeneratorOpen(true);
                  if (window.innerWidth < 1024) state.setGenerateOpen(true);
                  else requestAnimationFrame(() => document.getElementById("gen-topic")?.focus());
                }}
              >
                <Microscope className="size-3.5" />
                Generate
              </Button>
            </Tooltip>
            <Tooltip content="Library">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setLibraryOpen(true)}
                aria-label="Library"
              >
                <Library />
              </Button>
            </Tooltip>
            <Tooltip content="Present">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPresenting(true)}
                aria-label="Present"
              >
                <Play />
              </Button>
            </Tooltip>
            <Tooltip content="Export PPTX">
              <Button variant="ghost" size="icon-sm" onClick={onPptx} aria-label="Export PPTX">
                <Download />
              </Button>
            </Tooltip>
            <Tooltip content="Print / PDF">
              <Button variant="ghost" size="icon-sm" onClick={onPdf} aria-label="Export PDF">
                <Printer />
              </Button>
            </Tooltip>
            <Tooltip content={theme === "dark" ? "Light chrome" : "Dark chrome"}>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun /> : <Moon />}
              </Button>
            </Tooltip>
            <Tooltip content="Settings">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSettingsOpen(true)}
                aria-label="Settings"
              >
                <Settings />
              </Button>
            </Tooltip>
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              onClick={toggleInspector}
              aria-label="Inspector"
            >
              <PanelRight />
            </Button>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1">
          {railOpen && (
            <button
              type="button"
              className="absolute inset-0 z-20 bg-navy/50 lg:hidden"
              aria-label="Close slides"
              onClick={toggleRail}
            />
          )}

          <aside
            className={`flex w-56 shrink-0 flex-col border-r border-border bg-surface max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:z-30 max-lg:shadow-panel ${railOpen ? "max-lg:flex" : "max-lg:hidden"} lg:flex`}
          >
            <div className="flex items-center justify-between px-3 py-2 text-xs uppercase tracking-wider text-muted">
              <span>
                Slides · {total} · {cited} cited
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
              {deck?.slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    select(i);
                    if (window.innerWidth < 1024) useDeckStore.getState().toggleRail();
                  }}
                  className={`mb-1.5 w-full rounded-sm border p-2 text-left ${i === index ? "border-accent bg-elevated" : "border-transparent hover:bg-elevated"}`}
                >
                  <span className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted">
                    <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <span>{s.layout}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-fg">{s.title}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-1 border-t border-border p-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={addSlide}>
                <Plus className="size-3.5" />
                Add
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => moveSlide(index, -1)}
                aria-label="Move up"
              >
                <ChevronUp />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => moveSlide(index, 1)}
                aria-label="Move down"
              >
                <ChevronDown />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeSlide(index)}
                aria-label="Delete slide"
              >
                <Trash2 />
              </Button>
            </div>
            <p className="px-3 pb-2 text-[10px] leading-snug text-faint">
              Arrow keys to navigate. Back up your work in Library.
            </p>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto bg-bg p-3 sm:p-5">
            <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-3">
              <div
                className="rounded border border-border bg-surface px-3 py-2 text-sm"
                aria-label="Current deck"
              >
                <strong>
                  {deck?.id === "sample-enzyme-mic4511" ? "Example deck" : "Editing deck"}:
                </strong>{" "}
                {deck?.topic}
                {deck?.id === "sample-enzyme-mic4511" && (
                  <p className="mt-1 text-xs text-muted">
                    This is a saved example, not your new generation. Enter a topic below and choose
                    Generate deck.
                  </p>
                )}
              </div>
              {failure && !generatorOpen && (
                <section
                  role="alert"
                  className="space-y-2 rounded border border-accent bg-surface p-3 text-sm"
                >
                  <p className="font-semibold">
                    Generation stopped: {failure.topic} · {failure.count} requested slides
                  </p>
                  <p>{failure.message}</p>
                  <p className="text-xs text-muted">
                    Still displaying “{deck?.topic}”. Its content has not been replaced or renamed.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => useDeckStore.getState().setGeneratorOpen(true)}
                  >
                    Edit request and retry
                  </Button>
                </section>
              )}
              <GeneratePanel />
              {deck?.contentWarnings?.length ? (
                <div
                  role="note"
                  className="rounded border border-border bg-surface p-3 text-xs text-muted"
                >
                  {deck.contentWarnings.map((warning, i) => (
                    <p key={i}>{warning}</p>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <label className="flex items-center gap-2">
                  Layout
                  <select
                    value={slide?.layout ?? "content"}
                    onChange={(e) => setLayout(e.target.value as Layout)}
                    className="h-10 rounded-sm border border-border bg-elevated px-2 text-sm text-fg"
                    aria-label="Slide layout"
                  >
                    {LAYOUTS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  Theme
                  <select
                    value={slide?.theme ?? "classic"}
                    onChange={(e) => applyTheme(e.target.value as (typeof SLIDE_THEMES)[number])}
                    className="h-10 rounded-sm border border-border bg-elevated px-2 text-sm text-fg disabled:opacity-60"
                    aria-label="Slide theme"
                  >
                    {SLIDE_THEMES.map((t) => (
                      <option key={t} value={t}>
                        {THEME_TOKENS[t].label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  Apply to
                  <select
                    aria-label="Theme applies to"
                    value={themeScope}
                    onChange={(e) => setThemeScope(e.target.value)}
                    className="min-h-11 rounded-sm border border-border bg-elevated px-2 text-sm text-fg"
                  >
                    <option value="deck">Entire deck</option>
                    <option value="slide">This slide</option>
                  </select>
                </label>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    deck && applyTheme(researchTheme(deck.topic, deck.discipline, "content"))
                  }
                >
                  Match topic
                </Button>
                <div className="flex flex-wrap gap-1">
                  {SLIDE_THEMES.map((t) => {
                    const tok = THEME_TOKENS[t];
                    const active = (slide?.theme ?? "classic") === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        title={tok.blurb}
                        aria-pressed={active}
                        onClick={() => applyTheme(t)}
                        className={`min-h-11 rounded-sm border px-1.5 text-[10px] uppercase tracking-wide disabled:opacity-40 ${active ? "ring-2 ring-accent" : ""}`}
                        style={{ background: tok.slide, color: tok.ink, borderColor: tok.frame }}
                      >
                        {tok.label.split(" ")[0]}
                      </button>
                    );
                  })}
                </div>
                <span className="ml-auto tabular-nums">
                  Slide {total ? index + 1 : 0} of {total}
                </span>
              </div>
              {slide && deck ? (
                <div className="w-full shrink-0">
                  <SlideView
                    slide={slide}
                    deck={deck}
                    index={index}
                    total={deck.slides.length}
                    citationStyle={style}
                    className="h-auto"
                    editable
                    onPatch={(patch) => {
                      if (index === 0 && typeof patch.title === "string") {
                        useDeckStore.getState().renameTopic(patch.title);
                        const rest = { ...patch };
                        delete rest.title;
                        if (Object.keys(rest).length) useDeckStore.getState().patchSlide(0, rest);
                        return;
                      }
                      useDeckStore.getState().patchSlide(index, patch);
                    }}
                    onPatchDeck={patchDeck}
                  />
                  <p className="mt-2 text-[11px] text-muted">
                    Click any line on the slide to edit. The JUW crest stays top-left. The
                    Department of Microbiology microscope appears only on the introductory slide.
                  </p>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-dashed border-border text-center">
                  <p className="font-serif text-lg text-fg">No slides yet</p>
                  <p className="mt-1 max-w-sm text-sm text-muted">
                    Generate a deck with the form above, or add a slide from the left rail.
                  </p>
                </div>
              )}
              {slide?.notes ? (
                <p className="line-clamp-2 text-xs text-muted">Notes: {slide.notes}</p>
              ) : null}
            </div>
          </main>

          <InspectorPanel />
        </div>
      </div>
      <GenerateDialog />
      <LibraryDialog />
      <SettingsDialog />
      <Presenter />
      {printing ? <PrintRoot /> : null}
      <Toaster theme={theme === "dark" ? "dark" : "light"} position="bottom-right" />
    </TooltipProvider>
  );
}

function LibraryDialog() {
  const open = useDeckStore((s) => s.libraryOpen);
  const setOpen = useDeckStore((s) => s.setLibraryOpen);
  const library = useDeckStore((s) => s.library);
  const load = useDeckStore((s) => s.loadDeck);
  const del = useDeckStore((s) => s.deleteDeck);
  const saveCopy = useDeckStore((s) => s.saveCopy);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deck library</DialogTitle>
          <DialogDescription>
            Saved on this device. Duplicate before a risky rewrite.
          </DialogDescription>
        </DialogHeader>
        <Button variant="secondary" size="sm" onClick={saveCopy}>
          Duplicate current
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={undo}>
            Undo
          </Button>
          <Button variant="secondary" size="sm" onClick={redo}>
            Redo
          </Button>
        </div>
        <LibraryBackup />
        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
          {library.map((d) => (
            <li key={d.id} className="flex items-center gap-2 rounded-sm border border-border p-2">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => load(d.id)}>
                <span className="block truncate text-sm text-fg">{d.title}</span>
                <span className="text-xs text-muted">
                  {d.discipline} · {d.slides.length} slides
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  if (window.confirm(`Delete “${d.title}”? Export a backup first if needed.`))
                    del(d.id);
                }}
                aria-label="Delete deck"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function SettingsDialog() {
  const open = useDeckStore((s) => s.settingsOpen);
  const setOpen = useDeckStore((s) => s.setSettingsOpen);
  const style = useDeckStore((s) => s.citationStyle);
  const setStyle = useDeckStore((s) => s.setCitationStyle);
  const deck = useDeckStore((s) => s.deck());
  const patchDeck = useDeckStore((s) => s.patchDeck);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Studio settings</DialogTitle>
          <DialogDescription>
            Course header fields print on the official title slide. Citation style applies to the
            inspector, footers, and PPTX.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="course">Course</Label>
          <Input
            id="course"
            value={deck?.course ?? ""}
            onChange={(e) => patchDeck({ course: e.target.value })}
            placeholder="Microbial Enzyme Technology"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ccode">Course code</Label>
          <Input
            id="ccode"
            value={deck?.courseCode ?? ""}
            onChange={(e) => patchDeck({ courseCode: e.target.value })}
            placeholder="MIC-4511"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="prep">Prepared by</Label>
          <Input
            id="prep"
            value={deck?.preparedBy ?? ""}
            onChange={(e) => patchDeck({ preparedBy: e.target.value })}
            placeholder="Ms. Noor"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="dept">Department</Label>
          <Input
            id="dept"
            value={deck?.department ?? ""}
            onChange={(e) => patchDeck({ department: e.target.value })}
            placeholder="Department of Microbiology"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="cstyle">Citation style</Label>
          <select
            id="cstyle"
            value={style}
            onChange={(e) => setStyle(e.target.value as CitationStyle)}
            className="h-10 rounded-sm border border-border bg-elevated px-2 text-sm"
          >
            {CITATION_STYLES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <LocalAiSettings />
      </DialogContent>
    </Dialog>
  );
}

function PrintRoot() {
  const deck = useDeckStore((s) => s.deck());
  const style = useDeckStore((s) => s.citationStyle);
  if (!deck) return null;
  return (
    <div id="print-root" className="hidden print:block">
      {deck.slides.map((slide, i) => (
        <section key={slide.id} className="print-slide">
          <SlideView
            slide={slide}
            deck={deck}
            index={i}
            total={deck.slides.length}
            citationStyle={style}
            present
          />
        </section>
      ))}
    </div>
  );
}
