import { useState } from "react";
import { useDeckStore } from "@/lib/deck-store";
import { DISCIPLINES } from "@/lib/knowledge";
import { LEVELS, MAX_SLIDES } from "@/lib/types";
import { Button } from "./ui/button";
import { GenerateForm } from "./generate-form";
const names = ["Topic", "Discipline", "Level", "Slide count", "Generate"];
export function FirstDeckWizard() {
  const [step, setStep] = useState(0),
    draft = useDeckStore((s) => s.generateDraft),
    patch = useDeckStore((s) => s.patchGenerateDraft);
  const valid =
    step === 0
      ? !!draft.topic.trim()
      : step === 3
        ? Number.isInteger(draft.count) && draft.count >= 1 && draft.count <= MAX_SLIDES
        : true;
  const field = "mt-2 w-full rounded border border-border bg-elevated p-3";
  return (
    <section aria-label="First Deck wizard" className="space-y-4">
      <ol className="flex flex-wrap gap-2 text-xs" aria-label="Setup progress">
        {names.map((n, i) => (
          <li
            key={n}
            aria-current={step === i ? "step" : undefined}
            className={step === i ? "font-bold text-accent" : "text-muted"}
          >
            {i + 1}. {n}
          </li>
        ))}
      </ol>
      {step === 0 && (
        <label className="block text-sm">
          What will you teach?
          <input
            aria-label="Wizard topic"
            className={field}
            value={draft.topic}
            onChange={(e) => patch({ topic: e.target.value })}
            placeholder="For example: enzyme immobilisation"
          />
        </label>
      )}
      {step === 1 && (
        <label className="block text-sm">
          Teaching discipline
          <select
            aria-label="Wizard discipline"
            className={field}
            value={draft.discipline}
            onChange={(e) => patch({ discipline: e.target.value })}
          >
            {DISCIPLINES.map((d) => (
              <option key={d.name}>{d.name}</option>
            ))}
          </select>
        </label>
      )}
      {step === 2 && (
        <label className="block text-sm">
          Audience level
          <select
            aria-label="Wizard level"
            className={field}
            value={draft.level}
            onChange={(e) => patch({ level: e.target.value as typeof draft.level })}
          >
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
      )}
      {step === 3 && (
        <label className="block text-sm">
          Exact slide count, including the introduction
          <input
            aria-label="Wizard slide count"
            type="number"
            min="1"
            max={MAX_SLIDES}
            className={field}
            value={draft.count}
            onChange={(e) => patch({ count: Number(e.target.value) })}
          />
        </label>
      )}
      {step === 4 && (
        <>
          <p className="rounded border border-amber-600 p-3 text-sm">
            Generation creates editable draft slides. PPTX and PDF downloads are available without a
            review gate. Use saved sources and references to check claims before teaching;
            insufficient source material is reported during generation.
          </p>
          <GenerateForm lockDisciplineInitially />
        </>
      )}
      <div className="flex gap-2">
        <Button variant="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Back
        </Button>
        {step < 4 && (
          <Button disabled={!valid} onClick={() => setStep(step + 1)}>
            Continue to {names[step + 1]}
          </Button>
        )}
      </div>
    </section>
  );
}
