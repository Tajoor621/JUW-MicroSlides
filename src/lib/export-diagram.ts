import { createElement } from "react";
import { TeachingDiagram } from "@/components/teaching-diagram";
import { teachingOf } from "./teaching";
import { themeOf } from "./slide-themes";
import type { Slide } from "./types";
export async function teachingDiagramSvg(slide: Slide) {
  const p = teachingOf(slide);
  if (!p.diagram) throw Error("Select an editable schematic first.");
  const { renderToStaticMarkup } = await import("react-dom/server");
  return renderToStaticMarkup(
    createElement(TeachingDiagram, {
      kind: p.diagram,
      label: p.diagramLabel,
      alt: p.altText,
      color: themeOf(slide.theme).accent,
      steps: p.steps,
    }),
  ).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
}
