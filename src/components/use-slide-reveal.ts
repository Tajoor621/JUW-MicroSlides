import { useCallback, useEffect, useState } from "react";
import type { Slide } from "@/lib/types";
/** Keep reveal state local to the presentation; never mutate scientific content. */
export function useSlideReveal(
  slide: Slide | undefined,
  index: number,
  select: (index: number) => void,
  exit: () => void,
  enabled = true,
) {
  const [progressive, setProgressive] = useState(false),
    [reveal, setReveal] = useState({ id: "", count: 0 });
  const count = reveal.id === slide?.id ? reveal.count : 0;
  const points =
    slide?.layout === "lab-protocol"
      ? slide.revealSteps?.length || slide.protocol?.steps.length || 0
      : slide?.layout === "process-flow"
        ? slide.revealSteps?.length || slide.teaching?.steps.length || 0
        : slide
          ? [...slide.bullets, ...slide.leftBullets, ...slide.rightBullets].length
          : 0;
  const next = useCallback(() => {
    if (progressive && count < points && slide) setReveal({ id: slide.id, count: count + 1 });
    else select(index + 1);
  }, [progressive, count, points, slide, select, index]);
  const previous = useCallback(() => {
    if (progressive && count > 0 && slide) setReveal({ id: slide.id, count: count - 1 });
    else select(index - 1);
  }, [progressive, count, slide, select, index]);
  const control = useCallback(
    (key: string) => {
      if (key === "Escape") exit();
      else if (key === "ArrowLeft") previous();
      else if (key === "ArrowRight" || key === " ") next();
    },
    [exit, next, previous],
  );
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (["Escape", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
        control(e.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, control]);
  return {
    progressive,
    setProgressive,
    revealCount: progressive ? count : 999,
    next,
    previous,
    control,
  };
}
