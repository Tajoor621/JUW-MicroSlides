import { DesktopPresenter } from "./desktop-presenter";
import { isDesktop } from "@/lib/desktop";
import { useSlideReveal } from "./use-slide-reveal";
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
  const { progressive, setProgressive, revealCount, next, previous } = useSlideReveal(
    slide,
    index,
    select,
    () => setPresenting(false),
    presenting && !isDesktop(),
  );

  if (!presenting || !deck || !slide) return null;

  if (isDesktop()) return <DesktopPresenter />;
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-navy p-3 sm:p-6">
      <div className="mb-3 flex items-center justify-between text-fg">
        <p className="truncate font-serif text-sm">{deck.title}</p>
        <div className="flex items-center gap-1">
          <label className="mr-3 text-xs">
            <input
              type="checkbox"
              checked={progressive}
              onChange={(e) => setProgressive(e.target.checked)}
            />{" "}
            Reveal one point at a time
          </label>
          <Button variant="ghost" size="icon-sm" onClick={previous} aria-label="Previous">
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={next} aria-label="Next">
            <ChevronRight />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setPresenting(false)}
            aria-label="Exit"
          >
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
          revealCount={revealCount}
        />
      </div>
      {slide.notes ? (
        <p className="mx-auto mt-3 max-w-6xl text-xs text-muted">Speaker: {slide.notes}</p>
      ) : null}
    </div>
  );
}
