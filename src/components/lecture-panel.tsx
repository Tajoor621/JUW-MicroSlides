import { useState } from "react";
import { useDeckStore } from "@/lib/deck-store";
import {
  EVIDENCE_FLAGS,
  EVIDENCE_FLAG_LABELS,
  MEDIA_TAGS,
  SECTION_TYPES,
  lectureSlideSchema,
} from "@/lib/lecture-schema";
import type { Slide } from "@/lib/types";
import { toast } from "sonner";
import { Button } from "./ui/button";
const input = "min-h-11 w-full rounded border border-border bg-elevated p-2 text-xs";
function Text({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: (s: string) => void;
}) {
  return (
    <label className="block space-y-1 text-xs">
      {label}
      <textarea
        className={input}
        aria-label={label}
        value={value}
        onChange={(e) => change(e.target.value)}
        maxLength={3000}
      />
    </label>
  );
}
function Lines({
  label,
  values,
  change,
  max = 8,
}: {
  label: string;
  values: string[];
  change: (s: string[]) => void;
  max?: number;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs">{label}</legend>
      {values.map((v, i) => (
        <div key={i} className="space-y-1">
          <Text
            label={`${label} ${i + 1}`}
            value={v}
            change={(s) => change(values.map((x, j) => (i === j ? s : x)))}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => change(values.filter((_, j) => j !== i))}
          >
            Remove {i + 1}
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="secondary"
        disabled={values.length >= max}
        onClick={() => change([...values, ""])}
      >
        Add {label.toLowerCase()}
      </Button>
    </fieldset>
  );
}
function DataInput({
  label,
  initial,
  apply,
}: {
  label: string;
  initial: string;
  apply: (s: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="space-y-2">
      <Text label={label} value={value} change={setValue} />
      <Button size="sm" onClick={() => apply(value)}>
        Apply {label.toLowerCase()}
      </Button>
    </div>
  );
}
const protocol = () => ({
  materials: [] as string[],
  steps: [] as { action: string; timing: string; sourceUrl: string }[],
  interpretation: "",
  qc: "",
  biosafety: "",
  troubleshooting: "",
});
const caseRecord = () => ({
  caseNumber: 1,
  vignette: "",
  differential: "",
  workup: "",
  results: "",
  diagnosis: "",
  management: "",
  questions: [] as string[],
  phase: "presentation" as "presentation" | "resolution",
});
export function LecturePanel() {
  const slide = useDeckStore((s) => s.slide()),
    index = useDeckStore((s) => s.selectedIndex),
    patch = useDeckStore((s) => s.patchSlide);
  if (!slide) return null;
  function save(p: Partial<Slide>) {
    const checked = lectureSlideSchema.safeParse({ ...slide, ...p });
    if (!checked.success) {
      toast.error(
        "This field exceeds the supported size or structure. The previous value is preserved.",
      );
      return;
    }
    patch(index, p);
  }
  const table = slide.scientificTable,
    p = slide.protocol || protocol(),
    c = slide.caseData || caseRecord();
  return (
    <details
      className="rounded border border-border p-3"
      open={!["title", "content", "two-column", "full-image", "blank"].includes(slide.layout)}
    >
      <summary className="cursor-pointer text-sm font-semibold">
        Teaching structure & pedagogy
      </summary>
      <div className="mt-3 space-y-3">
        <label className="block text-xs">
          Difficulty
          <select
            className={input}
            value={slide.difficulty || "core"}
            onChange={(e) => save({ difficulty: e.target.value as Slide["difficulty"] })}
          >
            {["core", "intermediate", "advanced"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs">
          Section type
          <select
            className={input}
            value={slide.sectionType || "other"}
            onChange={(e) => save({ sectionType: e.target.value as Slide["sectionType"] })}
          >
            {SECTION_TYPES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <Lines
          label="Learning objective"
          values={slide.learningObjectives || []}
          change={(values) => save({ learningObjectives: values })}
          max={6}
        />
        <Text
          label="Key takeaway"
          value={slide.keyTakeaway || ""}
          change={(keyTakeaway) => save({ keyTakeaway })}
        />
        <Text
          label="Clinical pearl"
          value={slide.clinicalPearl || ""}
          change={(clinicalPearl) => save({ clinicalPearl })}
        />
        <Lines
          label="Common misconception"
          values={slide.commonMisconceptions || []}
          change={(commonMisconceptions) => save({ commonMisconceptions })}
        />
        <fieldset>
          <legend className="text-xs">Evidence flags</legend>
          {EVIDENCE_FLAGS.map((flag) => (
            <label key={flag} className="flex min-h-11 items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={slide.evidenceFlags?.includes(flag) || false}
                onChange={(e) =>
                  save({
                    evidenceFlags: e.target.checked
                      ? [...(slide.evidenceFlags || []), flag]
                      : (slide.evidenceFlags || []).filter((f) => f !== flag),
                  })
                }
              />
              {EVIDENCE_FLAG_LABELS[flag]}
            </label>
          ))}
        </fieldset>
        <details>
          <summary className="text-xs">Scientific table</summary>
          {!table ? (
            <Button
              size="sm"
              onClick={() =>
                save({
                  scientificTable: {
                    caption: slide.title,
                    headers: ["Characteristic", "Result"],
                    rows: [["", ""]],
                  },
                })
              }
            >
              Create editable table
            </Button>
          ) : (
            <div className="space-y-2">
              <Text
                label="Table caption"
                value={table.caption}
                change={(caption) => save({ scientificTable: { ...table, caption } })}
              />
              {table.headers.map((h, j) => (
                <label key={j} className="block text-xs">
                  Column {j + 1}
                  <input
                    className={input}
                    value={h}
                    onChange={(e) =>
                      save({
                        scientificTable: {
                          ...table,
                          headers: table.headers.map((x, k) => (k === j ? e.target.value : x)),
                        },
                      })
                    }
                    maxLength={3000}
                  />
                </label>
              ))}
              {table.rows.map((r, i) => (
                <fieldset key={i}>
                  <legend className="text-xs">Row {i + 1}</legend>
                  {r.map((cell, j) => (
                    <input
                      key={j}
                      className={input}
                      aria-label={`Row ${i + 1}, ${table.headers[j]}`}
                      value={cell}
                      onChange={(e) =>
                        save({
                          scientificTable: {
                            ...table,
                            rows: table.rows.map((row, k) =>
                              k === i ? row.map((x, col) => (col === j ? e.target.value : x)) : row,
                            ),
                          },
                        })
                      }
                      maxLength={3000}
                    />
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      save({
                        scientificTable: { ...table, rows: table.rows.filter((_, j) => j !== i) },
                      })
                    }
                  >
                    Remove row {i + 1}
                  </Button>
                </fieldset>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={table.rows.length >= 8}
                  onClick={() =>
                    save({
                      scientificTable: {
                        ...table,
                        rows: [...table.rows, table.headers.map(() => "")],
                      },
                    })
                  }
                >
                  Add row
                </Button>
                <Button
                  size="sm"
                  disabled={table.headers.length >= 6}
                  onClick={() =>
                    save({
                      scientificTable: {
                        ...table,
                        headers: [...table.headers, ""],
                        rows: table.rows.map((r) => [...r, ""]),
                      },
                    })
                  }
                >
                  Add column
                </Button>
                <Button
                  size="sm"
                  disabled={table.headers.length <= 2}
                  onClick={() =>
                    save({
                      scientificTable: {
                        ...table,
                        headers: table.headers.slice(0, -1),
                        rows: table.rows.map((r) => r.slice(0, -1)),
                      },
                    })
                  }
                >
                  Remove last column
                </Button>
              </div>
            </div>
          )}
        </details>
        {slide.layout === "lab-protocol" && (
          <section className="space-y-3">
            <Lines
              label="Material"
              values={p.materials}
              change={(materials) => save({ protocol: { ...p, materials } })}
            />
            {p.steps.map((step, i) => (
              <fieldset key={i} className="space-y-2 rounded border p-2">
                <legend className="text-xs">Step {i + 1}</legend>
                {(["action", "timing", "sourceUrl"] as const).map((key) => (
                  <Text
                    key={key}
                    label={`Step ${i + 1} ${key}`}
                    value={step[key]}
                    change={(value) =>
                      save({
                        protocol: {
                          ...p,
                          steps: p.steps.map((s, j) => (j === i ? { ...s, [key]: value } : s)),
                        },
                      })
                    }
                  />
                ))}
                <label className="flex min-h-11 items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={slide.revealSteps?.includes(i) || false}
                    onChange={(e) =>
                      save({
                        revealSteps: e.target.checked
                          ? [...(slide.revealSteps || []), i]
                          : (slide.revealSteps || []).filter((n) => n !== i),
                      })
                    }
                  />
                  Reveal this step progressively
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    save({
                      protocol: { ...p, steps: p.steps.filter((_, j) => i !== j) },
                      revealSteps: [],
                    })
                  }
                >
                  Remove step {i + 1}
                </Button>
              </fieldset>
            ))}
            <Button
              size="sm"
              disabled={p.steps.length >= 12}
              onClick={() =>
                save({
                  protocol: {
                    ...p,
                    steps: [...p.steps, { action: "", timing: "", sourceUrl: "" }],
                  },
                })
              }
            >
              Add protocol step
            </Button>
            {(["interpretation", "qc", "biosafety", "troubleshooting"] as const).map((key) => (
              <Text
                key={key}
                label={key}
                value={p[key]}
                change={(value) => save({ protocol: { ...p, [key]: value } })}
              />
            ))}
          </section>
        )}
        {slide.layout === "process-flow" && (
          <fieldset>
            <legend className="text-xs">Build process steps progressively</legend>
            {slide.teaching?.steps.map((step, i) => (
              <label className="flex min-h-11 items-center gap-2 text-xs" key={i}>
                <input
                  type="checkbox"
                  checked={slide.revealSteps?.includes(i) || false}
                  onChange={(e) =>
                    save({
                      revealSteps: e.target.checked
                        ? [...(slide.revealSteps || []), i]
                        : (slide.revealSteps || []).filter((n) => n !== i),
                    })
                  }
                />
                {i + 1}. {step}
              </label>
            ))}
          </fieldset>
        )}
        {slide.layout === "clinical-case" && (
          <section className="space-y-3">
            <label className="block text-xs">
              Case phase
              <select
                className={input}
                value={c.phase}
                onChange={(e) =>
                  save({
                    caseData: { ...c, phase: e.target.value as "presentation" | "resolution" },
                  })
                }
              >
                <option value="presentation">Presentation / differential / work-up</option>
                <option value="resolution">Results / diagnosis / management</option>
              </select>
            </label>
            <label className="block text-xs">
              Case number
              <input
                className={input}
                type="number"
                min={1}
                max={8}
                value={c.caseNumber}
                onChange={(e) => {
                  const caseNumber = Number(e.target.value);
                  if (caseNumber >= 1 && caseNumber <= 8) save({ caseData: { ...c, caseNumber } });
                }}
              />
            </label>
            {(
              ["vignette", "differential", "workup", "results", "diagnosis", "management"] as const
            ).map((key) => (
              <Text
                key={key}
                label={key}
                value={c[key]}
                change={(value) => save({ caseData: { ...c, [key]: value } })}
              />
            ))}
            <Lines
              label="Teaching question"
              values={c.questions}
              change={(questions) => save({ caseData: { ...c, questions } })}
              max={6}
            />
          </section>
        )}
        {slide.layout === "assessment" && (
          <section className="space-y-3">
            {slide.assessment?.map((q, i) => (
              <details key={i}>
                <summary className="text-xs">Question {i + 1}</summary>
                <label className="block text-xs">
                  Question type
                  <select
                    className={input}
                    value={q.kind}
                    onChange={(e) =>
                      save({
                        assessment: slide.assessment!.map((v, j) =>
                          i === j ? { ...v, kind: e.target.value as typeof q.kind } : v,
                        ),
                      })
                    }
                  >
                    <option value="mcq">MCQ</option>
                    <option value="short-answer">Short answer</option>
                    <option value="image">Image interpretation</option>
                  </select>
                </label>
                <Text
                  label="Question"
                  value={q.question}
                  change={(question) =>
                    save({
                      assessment: slide.assessment!.map((v, j) =>
                        i === j ? { ...v, question } : v,
                      ),
                    })
                  }
                />
                <Lines
                  label="Option"
                  values={q.options}
                  change={(options) =>
                    save({
                      assessment: slide.assessment!.map((v, j) =>
                        i === j ? { ...v, options } : v,
                      ),
                    })
                  }
                  max={6}
                />
                {(["answer", "rationale"] as const).map((key) => (
                  <Text
                    key={key}
                    label={key === "answer" ? "Instructor answer" : "Answer rationale"}
                    value={q[key]}
                    change={(value) =>
                      save({
                        assessment: slide.assessment!.map((v, j) =>
                          i === j ? { ...v, [key]: value } : v,
                        ),
                      })
                    }
                  />
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => save({ assessment: slide.assessment!.filter((_, j) => i !== j) })}
                >
                  Remove question {i + 1}
                </Button>
              </details>
            ))}
            <Button
              size="sm"
              disabled={(slide.assessment?.length || 0) >= 8}
              onClick={() =>
                save({
                  assessment: [
                    ...(slide.assessment || []),
                    { kind: "short-answer", question: "", options: [], answer: "", rationale: "" },
                  ],
                })
              }
            >
              Add question
            </Button>
          </section>
        )}
        {slide.layout === "growth-curve" && (
          <section className="space-y-2">
            {(["xLabel", "yLabel", "sourceUrl"] as const).map((key) => (
              <Text
                key={key}
                label={key}
                value={slide.chart?.[key] || ""}
                change={(value) =>
                  save({
                    chart: {
                      title: slide.title,
                      xLabel: "",
                      yLabel: "",
                      sourceUrl: "",
                      points: [],
                      ...slide.chart,
                      [key]: value,
                    },
                  })
                }
              />
            ))}
            <DataInput
              key={slide.id + "chart"}
              label="Chart data"
              initial={slide.chart?.points.map((p) => `${p.x},${p.y}`).join("\n") || ""}
              apply={(s) => {
                const points = s
                  .split("\n")
                  .filter((x) => x.trim())
                  .map((line) => {
                    const [x, y] = line.split(",").map(Number);
                    return { x, y };
                  });
                if (!points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))) {
                  toast.error("Enter numeric x,y pairs, one per line.");
                  return;
                }
                save({
                  chart: {
                    title: slide.title,
                    xLabel: "",
                    yLabel: "",
                    sourceUrl: "",
                    ...slide.chart,
                    points,
                  },
                });
              }}
            />
          </section>
        )}
        {slide.layout === "taxonomy-tree" && (
          <DataInput
            key={slide.id + "taxonomy"}
            label="Taxonomy nodes"
            initial={slide.taxonomy?.map((n) => `${n.parent} | ${n.label}`).join("\n") || ""}
            apply={(s) => {
              const taxonomy = s
                .split("\n")
                .filter((x) => x.trim())
                .map((line) => {
                  const [parent, ...label] = line.split("|");
                  return { parent: Number(parent), label: label.join("|").trim() };
                });
              if (
                !taxonomy.every(
                  (n, i) => Number.isInteger(n.parent) && n.parent >= -1 && n.parent < i,
                )
              ) {
                toast.error(
                  "Use parent index | label; -1 is a root, and parents must precede children.",
                );
                return;
              }
              save({ taxonomy });
            }}
          />
        )}
        <label className="block text-xs">
          Slide media tags
          <select
            multiple
            className={input}
            value={slide.mediaTags || []}
            onChange={(e) =>
              save({
                mediaTags: Array.from(
                  e.target.selectedOptions,
                  (o) => o.value,
                ) as Slide["mediaTags"],
              })
            }
          >
            {MEDIA_TAGS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>
    </details>
  );
}
