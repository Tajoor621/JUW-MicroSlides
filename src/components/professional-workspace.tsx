import { citationCslData } from "@/lib/csl-format";
import { proposeReplacement } from "@/lib/local-ai";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useDeckStore } from "@/lib/deck-store";
import { classroomReady, integrityAudit, duplicateStatements } from "@/lib/deck-integrity";
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
export function ProfessionalWorkspace() {
  const deck = useDeckStore((s) => s.deck()),
    slide = useDeckStore((s) => s.slide()),
    index = useDeckStore((s) => s.selectedIndex);
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
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={() => {
              setFindings(integrityAudit(deck));
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
          The evidence gate covers bullet statements; review scientific headings, captions and
          speaker notes separately. Regeneration: select a slide, use the replacement editor below,
          inspect the complete proposal, then apply. Evidence review becomes stale for changed
          claims. Ctrl+N: new lecture · Ctrl+S: project · Ctrl+O: project library · F5: present ·
          Escape: exit.
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
    deck = useDeckStore((s) => s.deck()),
    index = useDeckStore((s) => s.selectedIndex);
  const [proposal, setProposal] = useState("");
  const [drafting, setDrafting] = useState(false);
  if (!slide || !deck) return null;
  if (slide.layout === "title")
    return (
      <p className="text-xs text-muted">
        Edit the opening topic, scope and university metadata directly on the canvas. Select a
        teaching slide to propose replacement content.
      </p>
    );
  const candidate = proposal ? JSON.parse(proposal) : {};
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
          try {
            setProposal(JSON.stringify(await proposeReplacement(deck, slide), null, 2));
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
          onChange={(e) => setProposal(JSON.stringify({ ...candidate, title: e.target.value }))}
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
          onChange={(e) =>
            setProposal(JSON.stringify({ ...candidate, bullets: e.target.value.split("\n") }))
          }
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
          onChange={(e) => setProposal(JSON.stringify({ ...candidate, notes: e.target.value }))}
        />
      </label>
      <Button
        size="sm"
        disabled={slide.locked}
        onClick={() => {
          try {
            const p = JSON.parse(proposal);
            if (
              typeof p.title !== "string" ||
              !Array.isArray(p.bullets) ||
              !p.bullets.length ||
              p.bullets.some((b: unknown) => typeof b !== "string" || !b.trim())
            )
              throw Error("Provide a title and substantive bullets.");
            const replacement = {
              ...slide,
              title: p.title,
              subtitle: "",
              bullets: p.bullets,
              leftBullets: [],
              rightBullets: [],
              claims: [],
              citations: [],
              notes: typeof p.notes === "string" ? p.notes : "",
            };
            const all = deck.slides.map((s, i) => (i === index ? replacement : s));
            if (duplicateStatements(all).some((d) => d.first === index || d.second === index))
              throw Error("Replacement overlaps another teaching statement.");
            useDeckStore.getState().patchSlide(index, replacement);
            setProposal("");
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
