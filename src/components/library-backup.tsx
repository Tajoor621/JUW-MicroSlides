import { restoredDeckCopies } from "@/lib/course-builder";
import { readRecoverySave } from "@/lib/durable-storage";
import { useState } from "react";
import { embedMediaSources } from "@/lib/offline-media";
import { toast } from "sonner";
import { useDeckStore } from "@/lib/deck-store";
import { parseBackup } from "@/lib/backup";
import { Button } from "./ui/button";
export function LibraryBackup() {
  const [busy, setBusy] = useState(false);
  async function saveImages() {
    const deck = useDeckStore.getState().deck();
    if (!deck) return;
    setBusy(true);
    try {
      const { results, failed } = await embedMediaSources(
        deck.slides.flatMap((s) => s.media.map((m) => m.src)),
      );
      const current = useDeckStore.getState().library.find((d) => d.id === deck.id);
      if (current) {
        const slides = current.slides.map((s) => ({
          ...s,
          media: s.media.map((m) => ({ ...m, src: results.get(m.src) || m.src })),
        }));
        useDeckStore.setState((s) => ({
          library: s.library.map((d) =>
            d.id === deck.id ? { ...current, slides, updatedAt: Date.now() } : d,
          ),
        }));
      }
      toast.message(
        `${results.size} external images saved in the deck. ${failed} could not be saved. Download a new backup after saving.`,
      );
    } finally {
      setBusy(false);
    }
  }
  function download(currentOnly = false) {
    const state = useDeckStore.getState();
    const current = state.deck();
    const decks = currentOnly && current ? [current] : state.library;
    const raw = JSON.stringify({ format: "juw-microslides", schemaVersion: 1, decks }, null, 2);
    if (new Blob([raw]).size > 100000000 || decks.length > 500) {
      toast.error("Backup is too large. Download individual decks using Current deck backup.");
      return;
    }
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `microslides-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          try {
            const raw = await readRecoverySave();
            if (!raw) {
              toast.message("No damaged save is archived.");
              return;
            }
            const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = "microslides-recovery-original.json";
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          } catch {
            toast.error("Recovery storage is unavailable.");
          }
        }}
      >
        Download previous raw save
      </Button>

      <Button variant="secondary" size="sm" disabled={busy} onClick={() => void saveImages()}>
        {busy ? "Saving images…" : "Save current deck images offline"}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => download()}>
        Download editable backup
      </Button>
      <Button variant="secondary" size="sm" onClick={() => download(true)}>
        Current deck backup
      </Button>
      <label className="block text-sm">
        Restore backup (adds copies)
        <input
          aria-label="Restore backup"
          type="file"
          accept=".json,.md,application/json,text/markdown"
          className="mt-1 block w-full text-xs"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              if (file.size > 100000000) throw new Error("Backup exceeds 100 MB.");
              const decks = restoredDeckCopies(parseBackup(await file.text()));
              useDeckStore.setState((s) => ({
                library: [...decks, ...s.library],
                activeId: decks[0].id,
                selectedIndex: 0,
              }));
              toast.success(`Restored ${decks.length} decks as copies.`);
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Invalid backup. Existing decks were preserved.",
              );
            }
            e.target.value = "";
          }}
        />
      </label>
      <p className="text-xs text-muted">
        Includes editable content and bundled images. External image links still need internet. Keep
        backups somewhere safe.
      </p>
    </div>
  );
}
