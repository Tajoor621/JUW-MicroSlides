import { educationalNotesPdfBytes } from "@/lib/export-notes";
import { noteText } from "@/lib/educational-notes";
import { useEffect, useRef, useState } from "react";
import { useDeckStore } from "@/lib/deck-store";
import { generateWritingNotes } from "@/lib/writing-notes";
import { generateAiDeck } from "@/lib/browser-services";
import { LEVELS, type Level } from "@/lib/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
export function WritingNotes() {
  const notes = useDeckStore((s) => s.writingNotes);
  const patch = useDeckStore((s) => s.patchWritingNotes);
  const epoch = useDeckStore((s) => s.workspaceEpoch);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [download, setDownload] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), [epoch]);
  useEffect(() => {
    setDownload("");
  }, [notes.document]);
  useEffect(
    () => () => {
      if (download) URL.revokeObjectURL(download);
    },
    [download],
  );
  async function preparePdf() {
    if (!notes.document) {
      setMessage(
        "Regenerate from source passages to create an A4 educational note. Legacy text is preserved.",
      );
      return;
    }
    setBusy(true);
    try {
      const result = await educationalNotesPdfBytes(notes.document);
      if (
        useDeckStore.getState().workspaceEpoch !== epoch ||
        useDeckStore.getState().writingNotes.document?.id !== notes.document.id
      )
        return;
      setDownload(
        URL.createObjectURL(new Blob([new Uint8Array(result.bytes)], { type: "application/pdf" })),
      );
      setMessage(
        `A4 portrait PDF ready: ${result.pages} pages. Check the original sources before teaching.`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Notes PDF could not be prepared.");
    } finally {
      setBusy(false);
    }
  }
  async function run() {
    if (busy) return;
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    setMessage("Preparing notes…");
    try {
      const document = await generateWritingNotes(
        notes,
        current.signal,
        setMessage,
        async (data) => {
          const result = await generateAiDeck({ data, signal: current.signal });
          if (!result.ok) throw Error(result.error);
          return result.deck;
        },
      );
      current.signal.throwIfAborted();
      if (useDeckStore.getState().workspaceEpoch !== epoch) return;
      patch({ body: noteText(document), document });
      useDeckStore.setState((s) => ({
        savedNotes: [document, ...s.savedNotes.filter((n) => n.id !== document.id)],
      }));
      setMessage("Notes ready. Edit below; your slide deck is unchanged.");
    } catch (e) {
      if (useDeckStore.getState().workspaceEpoch === epoch)
        setMessage(
          current.signal.aborted
            ? "Notes generation cancelled. Existing notes kept."
            : e instanceof Error
              ? e.message
              : "Notes generation failed. Existing notes kept.",
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Writing Notes" className="space-y-3">
      <h2 className="font-serif text-lg">Writing Notes</h2>
      <p className="text-xs text-muted">
        Generate source-traced educational notes independently of your slides. Export A4 portrait
        PDF only. Saved on this device and included in JSON backups.
      </p>
      <label className="grid gap-1 text-xs">
        Saved notes
        <select
          aria-label="Saved educational notes"
          className="min-h-11 border border-border bg-elevated"
          value=""
          onChange={(e) => {
            const n = useDeckStore.getState().savedNotes.find((n) => n.id === e.target.value);
            if (n) patch({ topic: n.topic, level: n.level, document: n, body: noteText(n) });
          }}
        >
          <option value="">Choose a saved note</option>
          {useDeckStore.getState().savedNotes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.topic} · {n.date}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs">
        Notes topic
        <Input
          aria-label="Notes topic"
          value={notes.topic}
          disabled={busy}
          onChange={(e) => patch({ topic: e.target.value, document: undefined })}
          placeholder="e.g. Bacterial chromosome organisation"
        />
      </label>
      <label className="grid gap-1 text-xs">
        Notes level
        <select
          aria-label="Notes level"
          className="min-h-11 rounded border border-border bg-elevated px-2"
          disabled={busy}
          value={notes.level}
          onChange={(e) => patch({ level: e.target.value as Level, document: undefined })}
        >
          {LEVELS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs">
        Notes engine
        <select
          aria-label="Notes engine"
          className="min-h-11 rounded border border-border bg-elevated px-2"
          disabled={busy}
          value={notes.mode}
          onChange={(e) => patch({ mode: e.target.value as "manual" | "ai" })}
        >
          <option value="manual">Knowledge research — no key</option>
          <option value="ai">Configured AI / local Ollama</option>
        </select>
      </label>
      <details>
        <summary className="min-h-11 cursor-pointer text-xs">
          Optional source material / offline notes
        </summary>
        <Textarea
          aria-label="Notes source material"
          value={notes.sources}
          disabled={busy}
          onChange={(e) => patch({ sources: e.target.value })}
          placeholder="Paste source excerpts or your own lecture material."
        />
      </details>
      <div className="flex flex-wrap gap-2">
        <Button variant="accent" disabled={busy || !notes.topic.trim()} onClick={() => void run()}>
          {busy ? "Writing notes…" : "Generate notes"}
        </Button>
        {busy && <Button onClick={() => controller.current?.abort()}>Cancel notes</Button>}
      </div>
      {message && (
        <p role="status" className="break-words text-xs">
          {message}
        </p>
      )}
      <label className="grid gap-1 text-xs">
        Source-traced notes (legacy text remains editable)
        <Textarea
          aria-label="Editable notes"
          className="min-h-64"
          value={notes.body}
          disabled={busy}
          readOnly={!!notes.document}
          onChange={(e) => patch({ body: e.target.value })}
          placeholder="Generated notes appear here. You can also write your own."
        />
      </label>
      <Button disabled={busy || !notes.document} onClick={() => void preparePdf()}>
        Prepare A4 notes PDF
      </Button>
      {download && (
        <Button asChild variant="secondary">
          <a
            href={download}
            download={`${notes.topic.replace(/[^\p{L}\p{N}-]/gu, "-").slice(0, 60) || "study-notes"}.pdf`}
          >
            Download notes PDF (A4 portrait)
          </a>
        </Button>
      )}
    </section>
  );
}
