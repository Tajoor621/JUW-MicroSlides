import { GENERATION_MODES, MODE_NAMES, type LectureOptions } from "@/lib/lecture-schema";
import { modeMinimum } from "@/lib/lecture-modes";
import type { GenerateDraft } from "@/lib/types";
export function LectureGenerationOptions({
  draft,
  patch,
}: {
  draft: GenerateDraft;
  patch: (p: Partial<GenerateDraft>) => void;
}) {
  const mode = draft.generationMode || "standard";
  const select = "min-h-11 w-full rounded border border-border bg-elevated p-2 text-sm";
  function update(p: Partial<GenerateDraft>) {
    const next = { ...draft, ...p };
    patch({ ...p, count: Math.max(next.count, modeMinimum(next)) });
  }
  return (
    <section
      className="space-y-3 rounded border border-border p-3"
      aria-label="Lecture generation options"
    >
      {mode === "laboratory" && (
        <p className="text-xs text-muted">
          Teaching templates are not approved operating procedures. High-containment procedural
          requests are withheld; practical work requires a local institutional risk assessment.
        </p>
      )}
      <label className="block text-xs">
        Research approach
        <select
          aria-label="Research approach"
          className={select}
          value={draft.researchDepth || "thorough"}
          onChange={(e) => patch({ researchDepth: e.target.value as "standard" | "thorough" })}
        >
          <option value="thorough">Thorough — source-first online research</option>
          <option value="standard">Bundled / cached material, then research if needed</option>
        </select>
      </label>
      <p className="text-xs text-muted">
        Thorough research prioritises subject coverage and open full text over speed. All scientific
        drafts still require human judgement. Offline work uses supplied or bundled material.
      </p>
      <label className="block text-xs">
        Generation Mode
        <select
          className={select}
          aria-label="Generation Mode"
          value={mode}
          onChange={(e) =>
            update({ generationMode: e.target.value as LectureOptions["generationMode"] })
          }
        >
          {GENERATION_MODES.map((m) => (
            <option key={m} value={m}>
              {MODE_NAMES[m]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-h-11 items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={draft.includeObjectives !== false}
          onChange={(e) => update({ includeObjectives: e.target.checked })}
        />
        Include Learning Objectives
      </label>
      <label className="flex min-h-11 items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={!!draft.includeAssessment}
          onChange={(e) => update({ includeAssessment: e.target.checked })}
        />
        Include Assessment Questions
      </label>
      {mode === "clinical-cases" && (
        <label className="block text-xs">
          Number of Clinical Cases
          <input
            className={select}
            aria-label="Number of Clinical Cases"
            type="number"
            min={3}
            max={8}
            value={draft.clinicalCases || 3}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= 3 && n <= 8) update({ clinicalCases: n });
            }}
          />
        </label>
      )}
      {mode === "curriculum" && (
        <label className="block text-xs">
          Lecture topics — one per line (2–12)
          <textarea
            className={select}
            aria-label="Curriculum lecture topics"
            value={(draft.moduleTopics || []).join("\n")}
            onChange={(e) => patch({ moduleTopics: e.target.value.split("\n") })}
          />
          <span className="text-muted">
            The slide count applies to each lecture. All lectures are saved together after the
            complete module succeeds.
          </span>
        </label>
      )}
      <details>
        <summary className="cursor-pointer text-xs">Depth & visual emphasis</summary>
        <div className="mt-2 space-y-2">
          <label className="block text-xs">
            Focus depth
            <select
              className={select}
              value={draft.focusDepth || "standard"}
              onChange={(e) =>
                patch({ focusDepth: e.target.value as LectureOptions["focusDepth"] })
              }
            >
              <option value="overview">Overview</option>
              <option value="standard">Standard</option>
              <option value="exhaustive">Exhaustive</option>
            </select>
          </label>
          <label className="block text-xs">
            Preferred visual style emphasis
            <select
              className={select}
              value={draft.visualEmphasis || "auto"}
              onChange={(e) =>
                patch({ visualEmphasis: e.target.value as LectureOptions["visualEmphasis"] })
              }
            >
              <option value="auto">Match the research topic</option>
              <option value="morphology">Morphology & Stains</option>
              <option value="molecular">Molecular</option>
              <option value="clinical">Clinical</option>
              <option value="epidemiology">Epidemiology</option>
            </select>
          </label>
        </div>
      </details>
      {mode !== "standard" && (
        <p className="text-xs leading-relaxed text-muted">
          At least {modeMinimum(draft)} slides with these options. Each section uses source
          material; missing evidence stops generation and preserves your current deck. Protocol
          timing, biosafety and case management require instructor review.
        </p>
      )}
    </section>
  );
}
