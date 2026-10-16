import { enrichTopicEvidence } from "@/lib/topic-evidence";
import { useState } from "react";
import { toast } from "sonner";
import { JUW } from "@/lib/brand";
import { useDeckStore } from "@/lib/deck-store";
import { generateLocalDeck, dedicatedLecture } from "@/lib/generate-deck";
import { DISCIPLINES, suggestDiscipline } from "@/lib/knowledge";

import { generateAiDeck } from "@/lib/ai";

import { inferFocus } from "@/lib/topic-engine";
import { SLIDE_THEMES, THEME_TOKENS } from "@/lib/slide-themes";
import { LEVELS, MAX_SLIDES, type GenerateInput, type Level } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

const selectClass = "h-10 w-full rounded-sm border border-border bg-elevated px-2 text-sm text-fg";

const SLIDE_PRESETS = [6, 12, 18, 24, 36, 48, 72, 96, 120, 180, 240, 400];

const TOPIC_CHIPS = [
  "MRSA virulence",
  "Malaria",
  "qPCR 16S rRNA",
  "Biofilms",
  "Tuberculosis",
  "Candida albicans",
  "Influenza",
  "Enzyme Immobilization",
];

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export function GenerateForm({ compact = false }: { compact?: boolean }) {
  const generate = useDeckStore((s) => s.generate);
  const draft = useDeckStore((s) => s.generateDraft);
  const patchDraft = useDeckStore((s) => s.patchGenerateDraft);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [lockDiscipline, setLockDiscipline] = useState(false);
  const [lockCourse, setLockCourse] = useState(false);

  function disciplineFor(topic: string, locked: boolean, current: string) {
    if (locked) return current;
    return inferFocus(topic).discipline || suggestDiscipline(topic) || "General Microbiology";
  }

  function setTopic(topic: string) {
    if (!lockDiscipline && topic.trim().length > 2) {
      patchDraft({ discipline: disciplineFor(topic, false, draft.discipline) });
    }
    patchDraft({ topic });
  }

  async function onGenerate(topicOverride?: string) {
    const live = useDeckStore.getState();
    const draftNow = live.generateDraft;
    const topic = (topicOverride ?? draftNow.topic).trim();
    if (!topic) {
      toast.message("Type a lecture topic first — any microbiology subject, not only enzymes.");
      return;
    }
    const discipline = disciplineFor(topic, lockDiscipline, draftNow.discipline);
    const landing = live.deck();
    const dedicated = dedicatedLecture(topic, discipline);
    const input: GenerateInput = {
      topic,
      discipline,
      count: Math.min(MAX_SLIDES, Math.max(1, Math.round(draftNow.count) || 12)),
      level: draftNow.level,
      notes: draftNow.notes,
      mode: draftNow.mode,
      course: lockCourse ? draftNow.course || dedicated.course : dedicated.course,
      courseCode: lockCourse ? draftNow.courseCode || dedicated.courseCode : dedicated.courseCode,
      preparedBy: draftNow.preparedBy || landing?.preparedBy || JUW.preparedBy,
      department: landing?.department || JUW.department,
    };
    patchDraft({
      topic,
      discipline,
      count: input.count,
      course: input.course,
      courseCode: input.courseCode,
    });
    setBusy(true);
    setProgress("Building the topic outline…");
    try {
      let local = generateLocalDeck(input);
      if (input.mode === "ai") {
        setProgress("Drafting and checking the research deck…");
        const result = await withTimeout(generateAiDeck({ data: input }), 60000);
        if (result.ok) local = result.deck;
        else {
          local = result.deck ?? local;
          toast.message(result.error);
        }
      }
      if (local.slides.length < input.count && navigator.onLine) {
        setProgress(
          `Searching research to extend this ${local.slides.length}-slide draft toward ${input.count}…`,
        );
        try {
          local = await enrichTopicEvidence(local, input);
        } catch {
          toast.message(
            "Live research sources were unavailable. The deck keeps the supported topic-specific slide count.",
          );
        }
      }
      if (local.slides.length < input.count) {
        const coverage = `Generated ${local.slides.length} of ${input.count} requested slides. More topic-specific evidence is needed to complete this deck without unrelated filler.`;
        local.contentWarnings = [...(local.contentWarnings ?? []), coverage];
      }
      if (local.slides[0]) {
        local.slides[0] = {
          ...local.slides[0],
          layout: "title",
          theme: "classic",
          title: topic,
          subtitle: local.slides[0].subtitle,
          bullets: [],
          leftBullets: [],
          rightBullets: [],
          media: [],
        };
      }
      local.generationSource ??= "knowledge";
      generate(input, local);
      toast.success(
        `Created ${local.slides.length} slides. Review claims, references, and figure relevance before teaching.`,
      );
      if (local.contentWarnings?.length)
        toast.message(local.contentWarnings[0], { duration: 12000 });
    } catch {
      try {
        generate(input, generateLocalDeck(input));
        toast.message("Built a topic-specific draft. No images were inserted automatically.");
      } catch {
        toast.message("Could not build that deck. Try a shorter topic.");
      }
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <form
      className={cn("grid gap-3", compact && "gap-2")}
      onSubmit={(e) => {
        e.preventDefault();
        void onGenerate();
      }}
    >
      <div className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "")}>
        <div className={cn("grid content-start gap-1.5", compact && "sm:col-span-2")}>
          <Label htmlFor={compact ? "gen-topic" : "topic"}>Topic</Label>
          <Input
            id={compact ? "gen-topic" : "topic"}
            value={draft.topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. MRSA virulence, malaria, PCR"
            autoComplete="off"
          />
          <div className="flex flex-wrap gap-1">
            {TOPIC_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => void onGenerate(chip)}
                disabled={busy}
                className={cn(
                  "h-7 rounded-sm border px-2 text-[11px]",
                  draft.topic === chip
                    ? "border-accent bg-accent/15 text-fg"
                    : "border-border text-muted hover:border-accent",
                )}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
        <div className="grid content-start gap-1.5">
          <Label htmlFor={compact ? "gen-disc" : "disc"}>Discipline</Label>
          <select
            id={compact ? "gen-disc" : "disc"}
            value={draft.discipline}
            onChange={(e) => {
              setLockDiscipline(true);
              patchDraft({ discipline: e.target.value });
            }}
            className={selectClass}
          >
            {DISCIPLINES.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid content-start gap-1.5">
          <Label htmlFor={compact ? "gen-count" : "count"}>Slides (1–{MAX_SLIDES})</Label>
          <Input
            id={compact ? "gen-count" : "count"}
            type="number"
            min={1}
            max={MAX_SLIDES}
            value={draft.count}
            onChange={(e) => patchDraft({ count: Number(e.target.value) })}
          />
          <input
            type="range"
            min={1}
            max={MAX_SLIDES}
            value={Math.min(MAX_SLIDES, Math.max(1, draft.count || 1))}
            onChange={(e) => patchDraft({ count: Number(e.target.value) })}
            className="w-full accent-[var(--accent)]"
            aria-label="Slide count"
          />
        </div>
        <div className="grid content-start gap-1.5">
          <Label htmlFor={compact ? "gen-level" : "level"}>Level</Label>
          <select
            id={compact ? "gen-level" : "level"}
            value={draft.level}
            onChange={(e) => patchDraft({ level: e.target.value as Level })}
            className={selectClass}
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        {compact ? (
          <div className="flex items-end sm:col-span-2">
            <Button type="submit" disabled={busy} variant="accent" className="w-full">
              {busy ? "Searching & writing…" : "Generate deck"}
            </Button>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SLIDE_PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => patchDraft({ count: n })}
            className={cn(
              "h-8 rounded-sm border px-2 text-xs tabular-nums",
              draft.count === n
                ? "border-accent bg-accent/15 text-fg"
                : "border-border text-muted hover:border-accent",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="grid content-start gap-1.5">
        {busy && (
          <p role="status" aria-live="polite" className="text-xs text-accent">
            {progress}
          </p>
        )}
        <p className="text-xs text-muted">
          Knowledge mode combines bundled topic material with multi-query literature search when
          more slides are requested. Coverage varies; review every scientific claim. On Pages,
          search images in Media and references in PubMed or Evidence while online. Media stays in
          the Media collection until you attach it. Configure Ollama in Settings for local AI.
        </p>
        <div className="flex flex-wrap gap-1">
          {SLIDE_THEMES.map((id) => (
            <span
              key={id}
              className="inline-flex h-6 items-center gap-1.5 rounded-sm border border-border px-1.5 text-[10px] uppercase tracking-wide text-muted"
            >
              <i
                className="inline-block size-2.5 rounded-full"
                style={{ background: THEME_TOKENS[id].frame }}
              />
              {THEME_TOKENS[id].label}
            </span>
          ))}
        </div>
      </div>
      <div className={cn("grid gap-3", compact ? "sm:grid-cols-3" : "gap-3")}>
        <div className="grid content-start gap-1.5">
          <Label htmlFor={compact ? "gen-course" : "course"}>Course</Label>
          <Input
            id={compact ? "gen-course" : "course"}
            value={draft.course}
            onChange={(e) => {
              setLockCourse(true);
              patchDraft({ course: e.target.value });
            }}
            placeholder={JUW.course}
          />
        </div>
        <div className="grid content-start gap-1.5">
          <Label htmlFor={compact ? "gen-code" : "code"}>Course code</Label>
          <Input
            id={compact ? "gen-code" : "code"}
            value={draft.courseCode}
            onChange={(e) => {
              setLockCourse(true);
              patchDraft({ courseCode: e.target.value });
            }}
            placeholder={JUW.courseCode}
          />
        </div>
        <div className="grid content-start gap-1.5">
          <Label htmlFor={compact ? "gen-prep" : "prep"}>Prepared by</Label>
          <Input
            id={compact ? "gen-prep" : "prep"}
            value={draft.preparedBy}
            onChange={(e) => patchDraft({ preparedBy: e.target.value })}
            placeholder={JUW.preparedBy}
          />
        </div>
      </div>
      <div className="grid content-start gap-1.5">
        <Label htmlFor={compact ? "gen-notes" : "notes"}>Optional abstract or lecture notes</Label>
        <Textarea
          id={compact ? "gen-notes" : "notes"}
          value={draft.notes}
          onChange={(e) => patchDraft({ notes: e.target.value })}
          placeholder="Paste a paper abstract or your notes. The generator will structure the lecture arc."
          className={compact ? "min-h-16" : ""}
        />
      </div>
      <fieldset className="flex flex-wrap gap-4 text-sm text-muted">
        <legend className="sr-only">Generation mode</legend>
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="radio"
            name="gen-mode"
            checked={draft.mode === "manual"}
            onChange={() => patchDraft({ mode: "manual" })}
          />
          Knowledge base — no key
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="radio"
            name="gen-mode"
            checked={draft.mode === "ai"}
            onChange={() => patchDraft({ mode: "ai" })}
          />
          AI lecture writer
        </label>
      </fieldset>
      {!compact ? (
        <Button type="submit" disabled={busy} variant="accent">
          {busy ? "Writing slides…" : "Generate deck"}
        </Button>
      ) : null}
    </form>
  );
}
