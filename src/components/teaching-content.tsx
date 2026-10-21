import { useEffect, useRef, useState } from "react";
import type { Slide } from "@/lib/types";
import { EvidenceBadge } from "./evidence-badge";
import { teachingOf } from "@/lib/teaching";
import { TeachingDiagram } from "./teaching-diagram";
export function TeachingContent({
  slide,
  color,
  reveal = 999,
  basis = {},
}: {
  slide: Slide;
  color: string;
  reveal?: number;
  basis?: Record<string, string[]>;
}) {
  const p = teachingOf(slide),
    image = slide.media[0],
    ref = useRef<HTMLImageElement>(null),
    [width, setWidth] = useState(1),
    [displayWidth, setDisplayWidth] = useState(1);
  useEffect(() => {
    setWidth(ref.current?.naturalWidth || 1);
    setDisplayWidth(ref.current?.clientWidth || 1);
  }, [image?.src]);
  const bulletRows = [...slide.bullets, ...slide.leftBullets, ...slide.rightBullets];
  return (
    <div className="grid h-full min-h-0 grid-cols-2 gap-6" data-teaching-content>
      <figure className="min-w-0">
        <div className="relative">
          {p.diagram ? (
            <TeachingDiagram
              kind={p.diagram}
              label={p.diagramLabel}
              alt={p.altText}
              color={color}
            />
          ) : image ? (
            <img
              ref={ref}
              onLoad={(e) => {
                setWidth(e.currentTarget.naturalWidth);
                setDisplayWidth(e.currentTarget.clientWidth);
              }}
              src={image.src}
              alt={p.altText || image.title}
              className="max-h-60 max-w-full object-contain"
            />
          ) : (
            <p className="rounded border border-border p-6 text-sm">
              Visual required before teaching export
            </p>
          )}
          {p.labels.map((l, i) => (
            <span
              key={i}
              className="absolute bg-paper px-1 text-sm font-semibold text-ink"
              style={{ left: `${l.x}%`, top: `${l.y}%` }}
            >
              {l.text}
            </span>
          ))}
          {p.scaleBar && image && !p.diagram && (
            <div className="absolute bottom-1 left-0 w-full text-xs text-ink">
              <div
                style={{
                  width: `${(p.scaleBar.pixels / width) * displayWidth}px`,
                  borderTop: "4px solid currentColor",
                }}
              />
              {p.scaleBar.physicalLength} {p.scaleBar.unit}
            </div>
          )}
        </div>
        <figcaption className="mt-2 text-xs leading-snug text-ink-muted">
          {p.legend ||
            (p.diagram
              ? "Original conceptual schematic; not to scale."
              : image
                ? `${image.title} · ${image.credit} · ${image.license}`
                : "Visual required.")}
        </figcaption>
      </figure>
      <div className="min-w-0 space-y-3">
        {p.definition && (
          <p className="text-xl font-semibold">
            {p.definition}
            <EvidenceBadge basis={basis} field="teaching.definition" />
          </p>
        )}
        {slide.layout === "comparison" ? (
          <table className="w-full text-sm">
            <caption className="text-left font-semibold">Comparison</caption>
            <thead>
              <tr>
                <th>Criterion</th>
                <th>Option A</th>
                <th>Option B</th>
              </tr>
            </thead>
            <tbody>
              {p.comparison.map((r, i) => (
                <tr key={i}>
                  <th scope="row">{r.criterion}</th>
                  <td>{r.left}</td>
                  <td>
                    {r.right}
                    <EvidenceBadge basis={basis} field={`teaching.comparison.${i}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : slide.layout === "process-flow" ? (
          <ol className="space-y-2 text-xl">
            {p.steps.map((s, i) => (
              <li key={i} style={{ visibility: i < reveal ? "visible" : "hidden" }}>
                <strong>{i + 1}.</strong> {s}
                <EvidenceBadge basis={basis} field={`teaching.steps.${i}`} />
              </li>
            ))}
          </ol>
        ) : (
          <ul className="space-y-2 text-xl">
            {bulletRows.map((b, i) => {
              return (
                <li key={i} style={{ visibility: i < reveal ? "visible" : "hidden" }}>
                  • {b}
                  <EvidenceBadge basis={basis} field={`bullet.${i}`} />
                </li>
              );
            })}
          </ul>
        )}
        {p.mechanism && (
          <p className="text-lg">
            <strong>Mechanism:</strong> {p.mechanism}
            <EvidenceBadge basis={basis} field="teaching.mechanism" />
          </p>
        )}
        {p.advantage && (
          <p className="border-l-4 border-emerald-600 pl-2 text-lg">
            <strong>Advantages:</strong> {p.advantage}
            <EvidenceBadge basis={basis} field="teaching.advantage" />
          </p>
        )}
        {p.limitation && (
          <p className="border-l-4 border-amber-600 pl-2 text-lg">
            <strong>Limitations:</strong> {p.limitation}
            <EvidenceBadge basis={basis} field="teaching.limitation" />
          </p>
        )}
        {p.quantitative.slice(0, 2).map((q, i) => (
          <p key={i} className="text-base">
            <strong>
              {q.metric}: {q.value} {q.units}
            </strong>
            <br />
            {q.conditions}
            <EvidenceBadge basis={basis} field={`teaching.quantitative.${i}`} />
          </p>
        ))}
        {p.equation && (
          <p className="font-mono text-lg">
            {p.equation}
            <EvidenceBadge basis={basis} field="teaching.equation" />
          </p>
        )}
        {p.assumptions && (
          <p className="text-base">
            <strong>Model assumptions:</strong> {p.assumptions}
          </p>
        )}
        {p.discussion && (
          <p className="text-base">
            <strong>Discussion:</strong> {p.discussion}
          </p>
        )}
      </div>
    </div>
  );
}
