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
    if (!notes.body) {
      setDownload("");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([notes.body], { type: "text/markdown;charset=utf-8" }),
    );
    setDownload(url);
    return () => URL.revokeObjectURL(url);
  }, [notes.body]);
  async function run() {
    if (busy) return;
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    setMessage("Preparing notes…");
    try {
      const body = await generateWritingNotes(notes, current.signal, setMessage, async (data) => {
        const result = await generateAiDeck({ data, signal: current.signal });
        if (!result.ok) throw Error(result.error);
        return result.deck;
      });
      current.signal.throwIfAborted();
      if (useDeckStore.getState().workspaceEpoch !== epoch) return;
      patch({ body });
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
        Generate editable study notes for a topic, independently of your slides. Saved on this
        device.
      </p>
      <label className="grid gap-1 text-xs">
        Notes topic
        <Input
          aria-label="Notes topic"
          value={notes.topic}
          disabled={busy}
          onChange={(e) => patch({ topic: e.target.value })}
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
          onChange={(e) => patch({ level: e.target.value as Level })}
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
        Editable notes
        <Textarea
          aria-label="Editable notes"
          className="min-h-64"
          value={notes.body}
          disabled={busy}
          onChange={(e) => patch({ body: e.target.value })}
          placeholder="Generated notes appear here. You can also write your own."
        />
      </label>
      {download && (
        <Button asChild variant="secondary">
          <a
            href={download}
            download={`${notes.topic.replace(/[^\p{L}\p{N}-]/gu, "-").slice(0, 60) || "study-notes"}.md`}
          >
            Download notes (.md)
          </a>
        </Button>
      )}
    </section>
  );
}
