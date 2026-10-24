import { CourseBuilder } from "./course-builder";
import {
  exportMarkdownBackup,
  exportLectureHandout,
  exportAccessibleLecture,
} from "@/lib/export-lecture";
import { citationCslData } from "@/lib/csl-format";
import { proposeReplacement } from "@/lib/local-ai";
import { replacementSnapshot } from "@/lib/slide-replacement";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { useDeckStore } from "@/lib/deck-store";
import { teachingDeckSnapshot } from "@/lib/teaching-verification";
import {
  teachingContentFindings,
  teachingReleaseFindings,
  teachingReady as classroomReady,
} from "@/lib/teaching-readiness";
import { teachingFindings, lectureMinutes } from "@/lib/teaching";
import { exportTeachingPack, exportTeachingPdf } from "@/lib/export-teaching";
import { integrityAudit } from "@/lib/deck-integrity";
import {
  flushSavedDecks,
  listDeckRevisions,
  storageUsage,
  readLocalRecord,
  type DeckRevision,
} from "@/lib/durable-storage";
import { packProject, unpackProject } from "@/lib/project-format";
import { isDesktop, saveFile, nativeCall } from "@/lib/desktop";
import { exportPptx } from "@/lib/export-pptx";
import { uid } from "@/lib/utils";
import { Button } from "./ui/button";
export function ProfessionalWorkspace({
  onEditableExport,
  exportBusy,
}: {
  onEditableExport: () => Promise<void>;
  exportBusy: boolean;
}) {
  const deck = useDeckStore((s) => s.deck()),
    slide = useDeckStore((s) => s.slide()),
    index = useDeckStore((s) => s.selectedIndex);
  const [instructor, setInstructor] = useState("");
  const [findings, setFindings] = useState<ReturnType<typeof integrityAudit> | null>(null),
    [auditedAt, setAuditedAt] = useState(""),
    [revisions, setRevisions] = useState<DeckRevision[]>([]),
    [usage, setUsage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!isDesktop()) return;
    void nativeCall<number[] | null>("launch_project")
      .then(async (bytes) => {
        if (!bytes) return;
        const d = await unpackProject(new Uint8Array(bytes));
        useDeckStore.getState().replaceActive({ ...d, id: uid("opened"), updatedAt: Date.now() });
      })
      .catch((e) => toast.error(String(e)));
  }, []);
  useEffect(() => {
    if (!isDesktop()) return;
    let dispose: (() => void) | undefined;
    let cancelled = false;
    void import("@tauri-apps/api/event").then(async ({ listen }) => {
      const stop = await listen("workspace-already-open", () =>
        toast.message(
          "Your workspace is already open. Use Open project with system dialog to import another lecture without replacing your work.",
        ),
      );
      if (cancelled) stop();
      else dispose = stop;
    });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);
  if (!deck) return null;
  const legacy = deck.slides.length > 50;
  async function perform(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Operation failed; your project has been preserved.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="max-h-[45dvh] shrink-0 overflow-auto border-b border-border bg-surface px-3 py-2 text-sm">
      <summary className="cursor-pointer">
        Lecture workspace · {isDesktop() ? "Windows desktop" : "Web companion"} ·{" "}
        {deck.slides.length}/50 slides ·{" "}
        {classroomReady(deck) ? "Evidence gate clear" : "Draft — evidence review required"}
      </summary>
      <div className="mt-3 space-y-3">
        {legacy && (
          <p role="alert">
            Legacy deck preserved intact ({deck.slides.length} slides). Editing/export is limited to
            50; use JSON backup to retain this archive, or import an explicitly reduced copy.
          </p>
        )}
        <p className="text-xs">
          Estimated lecture time: {lectureMinutes(deck)} minutes. Instructor pacing and discussion
          may change this estimate.
        </p>
        <label className="flex items-center gap-2 text-xs">
          Projector / export contrast
          <select
            aria-label="Projector contrast"
            className="rounded border bg-elevated p-2"
            value={deck.exportMode || "light"}
            onChange={(e) =>
              useDeckStore
                .getState()
                .patchDeck({ exportMode: e.target.value as "light" | "dark" | "high-contrast" })
            }
          >
            <option value="light">Theme contrast</option>
            <option value="dark">Dark lecture theatre</option>
            <option value="high-contrast">High contrast / accessibility</option>
          </select>
        </label>
        <label className="block text-xs">
          Lecture typography
          <select
            aria-label="Lecture typography"
            className="m-2 min-h-11 rounded border bg-elevated p-2"
            value={deck.exportTypography || "original"}
            disabled={legacy}
            onChange={(e) =>
              useDeckStore
                .getState()
                .patchDeck({ exportTypography: e.target.value as "original" | "portable" })
            }
          >
            <option value="original">Original — system fonts</option>
            <option value="portable">Portable — embedded DejaVu Sans</option>
          </select>
          <span className="block text-muted">
            Portable typography uses bundled fonts in the preview and embeds full regular/bold fonts
            in PowerPoint. Check layout and record instructor verification after changing it. Office
            and Google Slides rendering still need checking on the teaching device.
          </span>
        </label>
        <CourseBuilder />
        <details>
          <summary>Handouts & accessible exports</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy || !classroomReady(deck)}
              onClick={() => void perform(() => exportLectureHandout(deck))}
            >
              Student handout PDF
            </Button>
            <Button
              size="sm"
              disabled={busy || !classroomReady(deck)}
              onClick={() => void perform(() => exportLectureHandout(deck, true))}
            >
              Lab protocol card PDF
            </Button>
            <Button
              size="sm"
              disabled={busy || !classroomReady(deck)}
              onClick={() => void perform(() => exportAccessibleLecture(deck))}
            >
              High-contrast accessible HTML
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => void perform(() => exportMarkdownBackup(deck))}
            >
              Markdown recovery backup
            </Button>
          </div>
        </details>
        <details>
          <summary>Final instructor verification</summary>
          <p className="text-xs">
            This records a named local instructor attestation, not authenticated identity or
            independent scientific certification. Any deck edit invalidates it.
          </p>
          <label className="block text-xs">
            Verifying instructor name
            <input
              aria-label="Verifying instructor name"
              className="m-2 rounded border bg-elevated p-2"
              maxLength={100}
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
            />
          </label>
          <Button
            size="sm"
            disabled={busy || !instructor.trim() || teachingContentFindings(deck).length > 0}
            onClick={() =>
              void perform(async () => {
                const snapshot = teachingDeckSnapshot(deck),
                  verification = { instructor: instructor.trim(), at: Date.now(), snapshot };
                await exportPptx(
                  { ...deck, teachingVerification: verification },
                  { classroom: true, returnBytes: true },
                );
                const live = useDeckStore.getState().deck();
                if (!live || live.id !== deck.id || teachingDeckSnapshot(live) !== snapshot)
                  throw Error(
                    "The deck changed during verification. Your newer work is preserved; review it again.",
                  );
                useDeckStore.getState().patchDeck({ teachingVerification: verification });
                toast.success("Instructor verification recorded after image and layout preflight.");
              })
            }
          >
            Record instructor verification
          </Button>
          <p className="text-xs">
            {teachingReleaseFindings(deck).find((f) =>
              /instructor verification|named instructor/.test(f.message),
            )?.message || "Current instructor verification recorded."}
          </p>
        </details>
        <p className="text-xs">
          Editable PowerPoint downloads remain available with pending review. Reviewed release
          validation is optional and separate.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="accent"
            disabled={busy || legacy || exportBusy}
            onClick={() => void onEditableExport()}
          >
            Prepare editable PowerPoint
          </Button>
          <Button size="sm" onClick={() => useDeckStore.getState().setGenerateOpen(true)}>
            First Deck setup
          </Button>
          <Button
            size="sm"
            disabled={busy || legacy}
            onClick={() =>
              void perform(async () => {
                await onEditableExport();
                toast.message(
                  "Import the downloaded PPTX through Google Slides: File → Import slides. Inspect imported typography and accessibility before teaching.",
                );
              })
            }
          >
            Export for Google Slides (.pptx)
          </Button>
          <Button
            size="sm"
            disabled={busy || legacy || !classroomReady(deck)}
            onClick={() => void perform(() => exportTeachingPack(deck))}
          >
            Export teaching pack
          </Button>
          <Button
            size="sm"
            disabled={busy || legacy || !classroomReady(deck)}
            onClick={() => void perform(() => exportTeachingPdf(deck))}
          >
            Export reviewed PDF
          </Button>
          <Button
            size="sm"
            disabled={busy}
            onClick={() => {
              setFindings([
                ...integrityAudit(deck),
                ...teachingFindings(deck).map((f) => ({
                  ...f,
                  slideId: deck.slides[f.index].id,
                  severity: "critical" as const,
                  category: "teaching" as const,
                  quote: "",
                })),
              ]);
              setAuditedAt(deck.revisionId || String(deck.updatedAt));
            }}
          >
            Audit entire deck
          </Button>
          <Button
            size="sm"
            disabled={busy || legacy || !classroomReady(deck)}
            onClick={() => void perform(() => exportPptx(deck, { classroom: true }))}
          >
            Export reviewed PPTX
          </Button>
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              void perform(async () => {
                await flushSavedDecks();
                const bytes = await packProject(deck);
                await saveFile(
                  `${deck.title.replace(/[^\p{L}\p{N}-]/gu, "-")}.juwslides`,
                  bytes,
                  "juwslides",
                );
              })
            }
          >
            Save portable project
          </Button>
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              void perform(async () => {
                const refs = new Map(
                  deck.slides
                    .flatMap((s) => s.citations)
                    .map((c) => [(c.doi || c.pmid || c.id).toLowerCase(), c]),
                );
                await saveFile(
                  "lecture-references.json",
                  new TextEncoder().encode(
                    JSON.stringify([...refs.values()].map(citationCslData), null, 2),
                  ),
                  "json",
                );
              })
            }
          >
            Export CSL-JSON references
          </Button>
          <label className="cursor-pointer rounded border border-border p-2 text-xs">
            Open .juwslides
            <input
              aria-label="Open portable project"
              className="block max-w-48 text-xs"
              type="file"
              accept=".juwslides"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f)
                  void perform(async () => {
                    const imported = await unpackProject(new Uint8Array(await f.arrayBuffer()));
                    useDeckStore
                      .getState()
                      .replaceActive({ ...imported, id: uid("project"), updatedAt: Date.now() });
                    toast.success("Project opened as a copy; existing work preserved.");
                  });
                e.target.value = "";
              }}
            />
          </label>
          {isDesktop() && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                void perform(async () => {
                  const { open } = await import("@tauri-apps/plugin-dialog");
                  const path = await open({
                    multiple: false,
                    filters: [{ name: "JUW project", extensions: ["juwslides"] }],
                  });
                  if (typeof path !== "string") return;
                  const { readFile } = await import("@tauri-apps/plugin-fs");
                  const d = await unpackProject(await readFile(path));
                  useDeckStore
                    .getState()
                    .replaceActive({ ...d, id: uid("project"), updatedAt: Date.now() });
                })
              }
            >
              Open project with system dialog
            </Button>
          )}
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              void perform(async () => {
                await flushSavedDecks();
                setRevisions((await listDeckRevisions(deck.id)).reverse());
                const s = await storageUsage();
                setUsage(
                  `${s.revisions} recovery snapshots · ${(s.revisionBytes / 1e6).toFixed(1)} MB retained · browser estimate ${s.used ? `${(s.used / 1e6).toFixed(1)} MB` : "not available"}. Automatic recovery keeps the latest 100 snapshots up to 20 MB; project files remain independent.`,
                );
              })
            }
          >
            Revisions & storage
          </Button>
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              void perform(async () => {
                const raw = await readLocalRecord("generation-job");
                if (!raw) {
                  toast.message("No interrupted generation is saved.");
                  return;
                }
                const job = JSON.parse(raw);
                useDeckStore.getState().patchGenerateDraft(job.input);
                useDeckStore.getState().setGeneratorOpen(true);
                toast.message(
                  "Request restored. Generate again to resume saved local-model batches or reuse cached research; your previous deck remains safe.",
                );
              })
            }
          >
            Resume interrupted request
          </Button>
          {slide && (
            <Button
              size="sm"
              disabled={legacy}
              onClick={() => useDeckStore.getState().patchSlide(index, { locked: !slide.locked })}
            >
              {slide.locked ? "Unlock selected slide" : "Lock selected slide"}
            </Button>
          )}
          <Button
            size="sm"
            disabled={legacy || busy || slide?.locked}
            onClick={() => {
              const text = window.prompt(
                "Expand selected slide in speaker notes (does not add slides):",
                slide?.notes || "",
              );
              if (text !== null) useDeckStore.getState().patchSlide(index, { notes: text });
            }}
          >
            Expand speaker notes
          </Button>
        </div>
        <p className="text-xs text-muted">
          The evidence gate covers bullet statements, headings, figures and speaker notes. Review
          every factual field in Evidence. Regeneration: select a slide, use the replacement editor
          below, inspect the complete proposal, then apply. Evidence review becomes stale for
          changed claims. Ctrl+N: new lecture · Ctrl+S: project · Ctrl+O: project library · F5:
          present · Escape: exit.
        </p>
        {slide && !legacy && <ReplacementEditor key={slide.id} />}
        {usage && <p className="text-xs">{usage}</p>}
        {revisions.slice(0, 20).map((r) => (
          <div key={r.id} className="flex items-center gap-2 text-xs">
            <span>
              {new Date(r.createdAt).toLocaleString()} · {r.deck.slides.length} slides
            </span>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => {
                useDeckStore.getState().replaceActive({
                  ...r.deck,
                  id: uid("recovered"),
                  title: `${r.deck.title} (recovered)`,
                  updatedAt: Date.now(),
                });
                setRevisions([]);
              }}
            >
              Restore as copy
            </Button>
          </div>
        ))}
        {findings && (
          <div aria-label="Integrity audit results">
            <p>
              {auditedAt !== (deck.revisionId || String(deck.updatedAt))
                ? "Audit stale — rerun after edits."
                : `${findings.filter((f) => f.severity === "critical").length} critical findings; ${findings.filter((f) => f.severity === "warning").length} warnings. Screening is not independent scientific certification.`}
            </p>
            {findings.slice(0, 100).map((f, i) => (
              <button
                key={i}
                className="my-1 block w-full rounded border border-border p-2 text-left text-xs"
                onClick={() => {
                  useDeckStore.getState().select(f.index);
                  useDeckStore.getState().setTab("evidence");
                  if (!useDeckStore.getState().inspectorOpen)
                    useDeckStore.getState().toggleInspector();
                }}
              >
                Slide {f.index + 1} · {f.category} · {f.severity}: {f.quote}
                <br />
                {f.message}
              </button>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
function ReplacementEditor() {
  const slide = useDeckStore((s) => s.slide()),
    deck = useDeckStore((s) => s.deck());
  const [proposal, setProposal] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [baseline, setBaseline] = useState("");
  const [keepFigures, setKeepFigures] = useState(false);
  const draftVersion = useRef(0);
  useEffect(
    () => () => {
      draftVersion.current++;
    },
    [],
  );
  if (!slide || !deck) return null;
  if (slide.layout === "title")
    return (
      <p className="text-xs text-muted">
        Edit the opening topic, scope and university metadata directly on the canvas. Select a
        teaching slide to propose replacement content.
      </p>
    );
  const candidate = proposal ? JSON.parse(proposal) : {};
  const stale = Boolean(proposal && baseline !== replacementSnapshot(deck, slide));
  function editProposal(next: unknown) {
    draftVersion.current++;
    if (!proposal) setBaseline(replacementSnapshot(deck!, slide!));
    setProposal(JSON.stringify(next));
  }
  return (
    <details>
      <summary className="cursor-pointer text-xs">Review / apply a replacement slide</summary>
      <p className="text-xs">
        Draft a replacement or write your own title and teaching points. Inspect each point before
        Apply. Current work is kept until Apply; changed content requires fresh evidence review.
      </p>
      <Button
        size="sm"
        disabled={drafting || slide.locked}
        onClick={async () => {
          setDrafting(true);
          const version = ++draftVersion.current;
          const before = replacementSnapshot(deck, slide);
          try {
            const generated = await proposeReplacement(deck, slide);
            const current = useDeckStore.getState().deck();
            const activeSlide = useDeckStore.getState().slide();
            if (
              version !== draftVersion.current ||
              !current ||
              !activeSlide ||
              replacementSnapshot(current, activeSlide) !== before
            )
              throw Error(
                "The slide or proposal changed while the model was drafting. Your newer work was kept.",
              );
            setBaseline(before);
            setProposal(JSON.stringify(generated, null, 2));
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Local model unavailable");
          } finally {
            setDrafting(false);
          }
        }}
      >
        {drafting ? "Drafting replacement…" : "Draft replacement with local model"}
      </Button>
      <label className="mt-2 block text-xs">
        Replacement title
        <input
          aria-label="Replacement title"
          className="mt-1 w-full rounded border bg-elevated p-2"
          value={candidate.title || ""}
          disabled={slide.locked}
          onChange={(e) => editProposal({ ...candidate, title: e.target.value })}
        />
      </label>
      <label className="mt-2 block text-xs">
        Teaching points — one per line
        <textarea
          aria-label="Replacement teaching points"
          className="mt-1 w-full rounded border bg-elevated p-2"
          rows={5}
          value={candidate.bullets?.join("\n") || ""}
          disabled={slide.locked}
          onChange={(e) => editProposal({ ...candidate, bullets: e.target.value.split("\n") })}
        />
      </label>
      <label className="mt-2 block text-xs">
        Proposed speaker notes
        <textarea
          aria-label="Replacement speaker notes"
          className="mt-1 w-full rounded border bg-elevated p-2"
          rows={3}
          value={candidate.notes || ""}
          disabled={slide.locked}
          onChange={(e) => editProposal({ ...candidate, notes: e.target.value })}
        />
      </label>
      {proposal && (
        <section className="my-3 space-y-2 rounded border border-border p-3 text-xs">
          <p>
            Before: {slide.title} ·{" "}
            {[...slide.bullets, ...slide.leftBullets, ...slide.rightBullets].length} teaching points
            · {slide.citations.length} references · {slide.media.length} figures
          </p>
          <p>
            Proposed: {candidate.title || "Title required"} ·{" "}
            {candidate.bullets?.filter((b: string) => b.trim()).length || 0} teaching points. New
            claims start unreviewed; old reference attachments are cleared.
          </p>
          {slide.media.length > 0 && (
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={keepFigures}
                onChange={(e) => setKeepFigures(e.target.checked)}
              />
              I inspected the existing figures and want to retain them on this replacement.
              Otherwise they return to the Media collection.
            </label>
          )}
          {stale && (
            <p role="alert" className="text-danger">
              The slide or research context changed. Discard this proposal and start again.
            </p>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              draftVersion.current++;
              setProposal("");
              setBaseline("");
              setKeepFigures(false);
            }}
          >
            Discard replacement proposal
          </Button>
        </section>
      )}
      <Button
        size="sm"
        disabled={slide.locked || stale || !proposal || drafting}
        onClick={() => {
          try {
            useDeckStore
              .getState()
              .applyInspectedReplacement(slide.id, JSON.parse(proposal), baseline, keepFigures);
            setProposal("");
            setKeepFigures(false);
            toast.success(
              "Replacement applied; previous version retained and new claims need review.",
            );
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Invalid proposal");
          }
        }}
      >
        Apply inspected replacement
      </Button>
    </details>
  );
}
