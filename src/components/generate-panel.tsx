import { ChevronDown, ChevronUp } from "lucide-react";
import { useDeckStore } from "@/lib/deck-store";
import { GenerateForm } from "./generate-form";
import { Button } from "./ui/button";

export function GeneratePanel() {
  const open = useDeckStore((s) => s.generatorOpen);
  const setOpen = useDeckStore((s) => s.setGeneratorOpen);

  return (
    <section className="shrink-0 rounded-md border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex min-h-11 w-full items-center justify-between px-3 py-2 text-left"
        aria-expanded={open}
      >
        <span>
          <span className="block font-serif text-base text-fg">Generate a scientific deck</span>
          <span className="block text-xs text-muted">
            Official JUW title slide — only the topic name changes. Ten microbiology themes. Microscope on the introduction only.
          </span>
        </span>
        {open ? <ChevronUp className="size-4 text-muted" /> : <ChevronDown className="size-4 text-muted" />}
      </button>
      {open ? (
        <div className="border-t border-border px-3 pb-3 pt-3">
          <GenerateForm compact />
        </div>
      ) : (
        <div className="flex justify-end px-3 pb-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
            Open generator
          </Button>
        </div>
      )}
    </section>
  );
}
