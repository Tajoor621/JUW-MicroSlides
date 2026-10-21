import { teachingDiagramSvg } from "@/lib/export-diagram";
import { saveFile } from "@/lib/desktop";
import { useState } from "react";
import { useDeckStore } from "@/lib/deck-store";
import {
  DIAGRAMS,
  teachingSchema,
  mergeCitationCandidates,
  teachingResearchContext,
  teachingOf,
  teachingFindings,
  lectureMinutes,
  quantitativeCandidate,
  type Teaching,
} from "@/lib/teaching";
import { Button } from "./ui/button";
import { searchPubmed } from "@/lib/ai";
import { toast } from "sonner";
export function TeachingPanel() {
  const deck = useDeckStore((s) => s.deck()),
    slide = useDeckStore((s) => s.slide()),
    index = useDeckStore((s) => s.selectedIndex),
    patch = useDeckStore((s) => s.patchSlide);
  const [busy, setBusy] = useState(false);
  if (!deck || !slide) return null;
  if (index === 0 && slide.layout === "title" && deck.slides.length > 1) return null;
  if (slide.layout === "bibliography")
    return (
      <p className="text-xs text-muted">
        The bibliography uses the complete deck reference list and selected citation style. Choose a
        content layout below to restore structured teaching authoring.
      </p>
    );
  const p = teachingOf(slide),
    update = (value: Partial<Teaching>) => {
      const next = teachingSchema.safeParse({ ...p, ...value });
      if (!next.success) {
        toast.error(
          next.error.issues[0]?.message || "This teaching field exceeds its supported limit.",
        );
        return;
      }
      patch(index, { teaching: next.data });
    };
  const field = (
    key: keyof Pick<
      Teaching,
      | "definition"
      | "mechanism"
      | "advantage"
      | "limitation"
      | "pitfall"
      | "takeaway"
      | "discussion"
      | "equation"
      | "assumptions"
      | "altText"
      | "legend"
      | "diagramLabel"
    >,
    label: string,
  ) => (
    <label className="block text-xs" key={key}>
      {label}
      <textarea
        aria-label={label}
        className="mt-1 w-full rounded border border-border bg-elevated p-2"
        value={p[key]}
        onChange={(e) => update({ [key]: e.target.value })}
      />
    </label>
  );
  const issues = teachingFindings(deck).filter((f) => f.index === index);
  return (
    <details className="teaching-panel rounded border border-border p-3" open>
      <summary className="cursor-pointer font-semibold">Teaching design · {deck.level}</summary>
      <p className="my-2 text-xs text-muted">
        Lecture estimate: {lectureMinutes(deck)} minutes. Values depend on experimental conditions;
        never substitute a generic “typical” number for source evidence.
      </p>
      <div className="space-y-3" aria-disabled={slide.locked}>
        <Button
          size="sm"
          variant="secondary"
          disabled={slide.locked || index === 0}
          onClick={() =>
            patch(index, {
              layout: "bibliography",
              title: "References",
              subtitle: "",
              bullets: [],
              leftBullets: [],
              rightBullets: [],
              claims: [],
              teaching: undefined,
            })
          }
        >
          Use selected slide for auto bibliography
        </Button>
        <p className="text-xs text-muted">
          The bibliography uses all deck references in the selected citation style. Converting this
          slide preserves the exact slide count; its previous version remains in recovery history.
        </p>
        <fieldset disabled={slide.locked} className="space-y-3">
          {field("definition", "Core definition")}
          {field("takeaway", "Key takeaway")}
          <label className="block text-xs">
            Editable schematic
            <select
              aria-label="Teaching schematic"
              className="mt-1 w-full rounded border bg-elevated p-2"
              value={p.diagram || ""}
              onChange={(e) =>
                update({
                  diagram: e.target.value ? (e.target.value as Teaching["diagram"]) : undefined,
                })
              }
            >
              <option value="">Use attached figure</option>
              {DIAGRAMS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          {p.diagram && (
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                try {
                  await saveFile(
                    "teaching-template.svg",
                    new TextEncoder().encode(await teachingDiagramSvg(slide)),
                    "svg",
                  );
                } catch (e) {
                  toast.error(String(e));
                }
              }}
            >
              Download editable SVG template
            </Button>
          )}
          {field("diagramLabel", "Schematic heading")}
          {field("altText", "Figure alt text")}
          <details>
            <summary>Depth, advantages and pitfalls</summary>
            <div className="space-y-2">
              {field("mechanism", "Mechanism")}
              {field("advantage", "Advantages")}
              {field("limitation", "Limitations")}
              {field("pitfall", "Common pitfalls / misconceptions")}
              {field("equation", "Equation or model")}
              {field("assumptions", "Model assumptions and units")}
              {field("discussion", "Critical discussion")}
            </div>
          </details>
          <details>
            <summary>Quantitative evidence ({p.quantitative.length})</summary>
            <Button
              size="sm"
              disabled={p.quantitative.length >= 2}
              onClick={() => {
                const candidate = quantitativeCandidate(deck);
                if (!candidate) {
                  toast.message(
                    "No suitable numerical passage in saved sources. Import an experimental paper first.",
                  );
                  return;
                }
                update({ quantitative: [...p.quantitative, candidate] });
                toast.message(
                  "Verbatim numeric candidate added. Identify its metric and experimental conditions, attach its primary reference, and review it before export.",
                );
              }}
            >
              Suggest from saved source data
            </Button>
            {p.quantitative.map((q, i) => (
              <fieldset key={i} className="my-2 space-y-2 border p-2">
                <legend>Observation {i + 1}</legend>
                {(
                  [
                    ["metric", "Metric"],
                    ["value", "Numeric value or range"],
                    ["units", "Units"],
                    ["conditions", "Enzyme, substrate, support and assay conditions"],
                    ["sourceUrl", "Source URL"],
                    ["quote", "Exact saved-source quotation"],
                  ] as const
                ).map(([key, label]) => (
                  <label className="block text-xs" key={key}>
                    {label}
                    <input
                      aria-label={`${label} ${i + 1}`}
                      className="w-full rounded border bg-elevated p-2"
                      value={q[key]}
                      onChange={(e) =>
                        update({
                          quantitative: p.quantitative.map((v, j) =>
                            j === i ? { ...v, [key]: e.target.value } : v,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => update({ quantitative: p.quantitative.filter((_, j) => j !== i) })}
                >
                  Remove observation
                </Button>
              </fieldset>
            ))}
            <Button
              size="sm"
              disabled={p.quantitative.length >= 8}
              onClick={() =>
                update({
                  quantitative: [
                    ...p.quantitative,
                    {
                      metric: "",
                      value: "",
                      units: "",
                      conditions: "",
                      sourceUrl: "https://",
                      quote: "",
                    },
                  ],
                })
              }
            >
              Add sourced quantitative observation
            </Button>
          </details>
          <details>
            <summary>Figure labels, scale bar and legend</summary>
            {field("legend", "Figure legend")}
            {p.labels.map((label, i) => (
              <div key={i} className="grid grid-cols-3 gap-1">
                <input
                  aria-label={`Figure label ${i + 1}`}
                  value={label.text}
                  onChange={(e) =>
                    update({
                      labels: p.labels.map((v, j) =>
                        i === j ? { ...v, text: e.target.value } : v,
                      ),
                    })
                  }
                />
                {(["x", "y"] as const).map((k) => (
                  <input
                    key={k}
                    aria-label={`Label ${i + 1} ${k} percent`}
                    type="number"
                    min="0"
                    max="100"
                    value={label[k]}
                    onChange={(e) =>
                      update({
                        labels: p.labels.map((v, j) =>
                          i === j
                            ? { ...v, [k]: Math.max(0, Math.min(100, Number(e.target.value))) }
                            : v,
                        ),
                      })
                    }
                  />
                ))}
              </div>
            ))}
            <Button
              size="sm"
              disabled={p.labels.length >= 8}
              onClick={() => update({ labels: [...p.labels, { text: "Label", x: 50, y: 50 }] })}
            >
              Add figure label
            </Button>
            <label className="block text-xs">
              <input
                type="checkbox"
                checked={!!p.scaleBar}
                onChange={(e) =>
                  update({
                    scaleBar: e.target.checked
                      ? { pixels: 100, physicalLength: 10, unit: "µm", calibrationSource: "" }
                      : undefined,
                  })
                }
              />{" "}
              Calibrated scale bar
            </label>
            {p.scaleBar && (
              <>
                {(["pixels", "physicalLength"] as const).map((k) => (
                  <label key={k} className="block text-xs">
                    {k === "pixels" ? "Calibration pixels (original image)" : "Physical length"}
                    <input
                      type="number"
                      min="0.001"
                      value={p.scaleBar![k]}
                      onChange={(e) =>
                        update({
                          scaleBar: {
                            ...p.scaleBar!,
                            [k]: Math.max(0.001, Number(e.target.value)),
                          },
                        })
                      }
                    />
                  </label>
                ))}
                <select
                  aria-label="Scale unit"
                  value={p.scaleBar.unit}
                  onChange={(e) =>
                    update({
                      scaleBar: { ...p.scaleBar!, unit: e.target.value as "nm" | "µm" | "mm" },
                    })
                  }
                >
                  {["nm", "µm", "mm"].map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
                <input
                  aria-label="Scale calibration source"
                  placeholder="Calibration source and original pixel dimensions"
                  value={p.scaleBar.calibrationSource}
                  onChange={(e) =>
                    update({ scaleBar: { ...p.scaleBar!, calibrationSource: e.target.value } })
                  }
                />
              </>
            )}
          </details>
          <details>
            <summary>Comparison table / process steps</summary>
            {p.comparison.map((row, i) => (
              <div className="grid grid-cols-3 gap-1" key={i}>
                {(["criterion", "left", "right"] as const).map((k) => (
                  <input
                    key={k}
                    aria-label={`Comparison ${i + 1} ${k}`}
                    value={row[k]}
                    onChange={(e) =>
                      update({
                        comparison: p.comparison.map((r, j) =>
                          j === i ? { ...r, [k]: e.target.value } : r,
                        ),
                      })
                    }
                  />
                ))}
              </div>
            ))}
            <Button
              size="sm"
              disabled={p.comparison.length >= 5}
              onClick={() =>
                update({
                  comparison: [
                    ...p.comparison,
                    { criterion: "Criterion", left: "Option A", right: "Option B" },
                  ],
                })
              }
            >
              Add comparison row
            </Button>
            <label className="block text-xs">
              Numbered steps (one per line)
              <textarea
                aria-label="Process steps"
                value={p.steps.join("\n")}
                onChange={(e) => {
                  const steps = e.target.value.split("\n");
                  if (steps.length > 5) {
                    toast.message("Use at most five process steps per slide.");
                    return;
                  }
                  update({ steps });
                }}
              />
            </label>
          </details>
          <details>
            <summary>Reference evidence classification</summary>
            {slide.citations.map((c) => (
              <label className="block text-xs" key={c.id}>
                {c.title}
                <select
                  aria-label={`Evidence type ${c.id}`}
                  value={c.evidenceKind || ""}
                  onChange={(e) =>
                    patch(index, {
                      citations: slide.citations.map((r) =>
                        r.id === c.id
                          ? {
                              ...r,
                              evidenceKind: (e.target.value || undefined) as typeof c.evidenceKind,
                            }
                          : r,
                      ),
                    })
                  }
                >
                  <option value="">Unclassified — inspect source</option>
                  <option value="primary">Primary experimental data</option>
                  <option value="review">Recent review</option>
                  <option value="textbook">Textbook consensus</option>
                </select>
              </label>
            ))}
          </details>
          <Button
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const requestedDeck = deck.id,
                requestedSlide = slide.id,
                requestedContext = teachingResearchContext(deck, slide);
              try {
                const year = new Date().getFullYear();
                const result = await searchPubmed({
                  data: { query: `(${deck.topic}) AND (${year - 8}:${year}[dp]) NOT Review[pt]` },
                });
                if (!result.ok) throw Error("PubMed unavailable");
                const rows = result.citations.slice(0, 5);
                const live = useDeckStore.getState().deck(),
                  position = live?.slides.findIndex((s) => s.id === requestedSlide) ?? -1;
                if (
                  !live ||
                  live.id !== requestedDeck ||
                  position < 0 ||
                  live.slides[position].locked ||
                  teachingResearchContext(live, live.slides[position]) !== requestedContext
                )
                  throw Error(
                    "The research topic or slide changed while searching. Existing work is preserved; request fresh candidates.",
                  );
                patch(position, {
                  citations: mergeCitationCandidates(live.slides[position].citations, rows),
                });
                toast.message(
                  `${rows.length} recent PubMed candidates attached for verification. Journal impact and study quality still require assessment.`,
                );
              } catch (e) {
                toast.error(String(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Suggest 3–5 recent primary-paper candidates
          </Button>
        </fieldset>
      </div>
      <ul className="mt-2 space-y-1 text-xs" aria-label="Teaching readiness findings">
        {issues.map((f, i) => (
          <li key={i}>Review required: {f.message}</li>
        ))}
      </ul>
    </details>
  );
}
