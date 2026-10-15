import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useDeckStore } from "@/lib/deck-store";
import { SlideView } from "./slide-view";
import { Button } from "./ui/button";

export function Presenter() {
  const presenting = useDeckStore((s) => s.presenting);
  const setPresenting = useDeckStore((s) => s.setPresenting);
  const deck = useDeckStore((s) => s.deck());
  const index = useDeckStore((s) => s.selectedIndex);
  const select = useDeckStore((s) => s.select);
  const style = useDeckStore((s) => s.citationStyle);
  const slide = deck?.slides[index];

  useEffect(() => {
    if (!presenting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresenting(false);
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        select(index + 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        select(index - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting, index, select, setPresenting]);

  if (!presenting || !deck || !slide) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-navy p-3 sm:p-6">
      <div className="mb-3 flex items-center justify-between text-fg">
        <p className="truncate font-serif text-sm">{deck.title}</p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => select(index - 1)} aria-label="Previous">
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => select(index + 1)} aria-label="Next">
            <ChevronRight />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setPresenting(false)} aria-label="Exit">
            <X />
          </Button>
        </div>
      </div>
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 items-center">
        <SlideView
          slide={slide}
          deck={deck}
          index={index}
          total={deck.slides.length}
          citationStyle={style}
          present
        />
      </div>
      {slide.notes ? (
        <p className="mx-auto mt-3 max-w-6xl text-xs text-muted">Speaker: {slide.notes}</p>
      ) : null}
    </div>
  );
}
