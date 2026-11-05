import { DesktopPresenter } from "./desktop-presenter";
import { isDesktop } from "@/lib/desktop";
import { useSlideReveal } from "./use-slide-reveal";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDeckStore } from "@/lib/deck-store";
import { SlideView } from "./slide-view";
import { Button } from "./ui/button";

function ElapsedClock() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  const label = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <span className="mr-2 text-xs tabular-nums" aria-label={`Elapsed ${label}`}>
      {label}
    </span>
  );
}

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
  const [blank, setBlank] = useState(false);
  useEffect(() => {
    if (!presenting || isDesktop()) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable)
        return;
      if (event.key === "b" || event.key === "B" || event.key === ".") {
        event.preventDefault();
        setBlank((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting]);

  if (!presenting || !deck || !slide) return null;

  if (isDesktop()) return <DesktopPresenter />;
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-navy p-3 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-fg">
        <p className="min-w-0 truncate font-serif text-sm">{deck.title}</p>
        <div className="flex flex-wrap items-center gap-1">
          <label className="mr-3 text-xs">
            <input
              type="checkbox"
              checked={progressive}
              onChange={(e) => setProgressive(e.target.checked)}
            />{" "}
            Reveal one point at a time
          </label>
          <span className="mr-2 text-xs tabular-nums" aria-live="polite">
            Slide {index + 1} of {deck.slides.length}
          </span>
          <ElapsedClock />
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={blank}
            onClick={() => setBlank((value) => !value)}
          >
            {blank ? "Show slide" : "Blank screen"}
          </Button>
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
        {blank ? (
          <p role="status" className="w-full text-center text-sm text-muted">
            Slide hidden. The deck is unchanged. Press B or full stop to show it again.
          </p>
        ) : (
          <SlideView
            slide={slide}
            deck={deck}
            index={index}
            total={deck.slides.length}
            citationStyle={style}
            present
            revealCount={revealCount}
          />
        )}
      </div>
      {slide.notes ? (
        <p className="mx-auto mt-3 max-w-6xl text-xs text-muted">Speaker: {slide.notes}</p>
      ) : null}
    </div>
  );
}
