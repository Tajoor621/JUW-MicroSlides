import { LectureGenerationOptions } from "./lecture-generation-options";
import {
  generateModeDeck,
  applyStandardPedagogy,
  modeMinimum,
  generateCourseModule,
} from "@/lib/lecture-modes";
import { writeLocalRecord } from "@/lib/durable-storage";
import { useRef } from "react";
let generationRunning = false;
import { assertCompleteDeck, requestedCount } from "@/lib/deck-completion";
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

const SLIDE_PRESETS = [1, 6, 12, 18, 24, 36, 48, 50];

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

export function GenerateForm({
  compact = false,
  lockDisciplineInitially = false,
}: {
  compact?: boolean;
  lockDisciplineInitially?: boolean;
}) {
  const generate = useDeckStore((s) => s.generate);
  const draft = useDeckStore((s) => s.generateDraft);
  const failure = useDeckStore((s) => s.generationFailure);
  const currentTopic = useDeckStore((s) => s.deck()?.topic);
  const patchDraft = useDeckStore((s) => s.patchGenerateDraft);
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const [lockDiscipline, setLockDiscipline] = useState(lockDisciplineInitially);
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
    let count: number;
    try {
      count = requestedCount(draftNow.count);
    } catch (error) {
      toast.error((error as Error).message);
      return;
    }
    const input: GenerateInput = {
      topic,
      discipline,
      count,
      level: draftNow.level,
      notes: draftNow.notes,
      mode: draftNow.mode,
      course: lockCourse ? draftNow.course || dedicated.course : dedicated.course,
      courseCode: lockCourse ? draftNow.courseCode || dedicated.courseCode : dedicated.courseCode,
      preparedBy: draftNow.preparedBy || landing?.preparedBy || JUW.preparedBy,
      department: landing?.department || JUW.department,
      generationMode: draftNow.generationMode || "standard",
      moduleTopics: draftNow.generationMode === "curriculum" ? draftNow.moduleTopics : undefined,
      includeObjectives: draftNow.includeObjectives !== false,
      includeAssessment: !!draftNow.includeAssessment,
      clinicalCases: draftNow.clinicalCases || 3,
      focusDepth: draftNow.focusDepth || "standard",
      visualEmphasis: draftNow.visualEmphasis || "auto",
    };
    patchDraft({
      topic,
      discipline,
      count: input.count,
      course: input.course,
      courseCode: input.courseCode,
    });
    if (generationRunning) {
      toast.message("A generation is already running. Wait or cancel it before starting another.");
      return;
    }
    generationRunning = true;
    controller.current = new AbortController();
    setBusy(true);
    live.setGenerationFailure(null);
    setProgress("Building the topic outline…");
    try {
      await writeLocalRecord(
        "generation-job",
        JSON.stringify({ input, startedAt: Date.now(), phase: "Drafting" }),
      );
      if (
        (input.count > 1 || input.includeAssessment || input.generationMode !== "standard") &&
        input.count < modeMinimum(input)
      )
        throw Error(`Choose at least ${modeMinimum(input)} slides for these generation options.`);
      const reserved =
        input.count > 2
          ? (input.includeObjectives === false ? 0 : 1) + (input.includeAssessment ? 2 : 0)
          : 0;
      const sourceInput = { ...input, count: input.count - reserved };
      let local;
      let series: import("@/lib/types").Deck[] | undefined;
      if (input.generationMode === "curriculum") {
        series = await generateCourseModule(
          input,
          controller.current.signal,
          setProgress,
          input.mode === "ai"
            ? async (data) => {
                const r = await generateAiDeck({ data, signal: controller.current!.signal });
                if (!r.ok) throw Error(r.error);
                return r.deck;
              }
            : undefined,
        );
        local = series[0];
      } else if (input.generationMode !== "standard")
        local = await generateModeDeck(
          input,
          controller.current.signal,
          setProgress,
          input.mode === "ai"
            ? async (data) => {
                const r = await generateAiDeck({ data, signal: controller.current!.signal });
                if (!r.ok) throw Error(r.error);
                return r.deck;
              }
            : undefined,
        );
      else {
        local = generateLocalDeck(sourceInput);
        if (input.mode === "ai") {
          setProgress("Drafting and checking the research deck…");
          const result = await generateAiDeck({
            data: sourceInput,
            signal: controller.current.signal,
          });
          controller.current.signal.throwIfAborted();
          if (result.ok) local = result.deck;
          else {
            local = result.deck ?? local;
            toast.message(result.error);
          }
        }
        if (
          input.includeAssessment &&
          local.slides.filter((s) => s.claims?.some((c) => c.evidence.length)).length < 3
        )
          local = {
            ...local,
            slides: local.slides[0]?.layout === "title" ? [local.slides[0]] : [],
            sourceDocuments: local.sourceDocuments,
          };
        if (
          local.slides.length < sourceInput.count ||
          local.slides.some((s) => s.title === "Evidence required")
        ) {
          setProgress(
            `Searching research to extend this ${local.slides.length}-slide draft toward ${input.count}…`,
          );
          local = await enrichTopicEvidence(
            local,
            sourceInput,
            controller.current.signal,
            setProgress,
          );
        }
        local = applyStandardPedagogy(local, input);
      }
      if (!series && input.count > 1 && local.slides[0]) {
        local.slides[0] = {
          ...local.slides[0],
          layout: "title",
          title: topic,
          subtitle: local.slides[0].subtitle,
          bullets: [],
          leftBullets: [],
          rightBullets: [],
          media: [],
        };
      }
      if (controller.current.signal.aborted)
        throw new Error(
          "Generation cancelled. Your previous deck is preserved; the request is saved for retry.",
        );
      local.generationSource ??= "knowledge";
      assertCompleteDeck(local, input.count);
      if (series) {
        const complete = series;
        useDeckStore.setState((state) => ({
          library: [...complete, ...state.library],
          activeId: complete[0].id,
          selectedIndex: 0,
          generateOpen: false,
          generatorOpen: false,
        }));
      } else generate(input, local);
      await writeLocalRecord("generation-job", null);
      await writeLocalRecord("local-ai-checkpoint", null);
      toast.success(
        `Created ${local.slides.length} slides. Review claims, references, and figure relevance before teaching.`,
      );
    } catch (error) {
      const message = controller.current?.signal.aborted
        ? "Generation cancelled. Your previous deck and completed checkpoints are preserved."
        : error instanceof Error
          ? error.message
          : "The requested deck could not be completed. Add source material and retry.";
      useDeckStore.getState().setGenerationFailure({ topic, count, message });
      toast.error(`Could not create “${topic}”. See the generation details.`, { duration: 5000 });
      queueMicrotask(() => form.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
    } finally {
      generationRunning = false;
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <form
      ref={form}
      className={cn("grid gap-3", compact && "gap-2")}
      onSubmit={(e) => {
        e.preventDefault();
        void onGenerate();
      }}
    >
      <fieldset disabled={busy} className="contents">
        {failure && (
          <section
            role="alert"
            className="space-y-2 rounded border border-accent bg-surface p-3 text-sm"
          >
            <p className="font-semibold">
              Generation stopped: {failure.topic} · {failure.count} requested slides
            </p>
            <p>{failure.message}</p>
            <p className="text-xs text-muted">
              Still displaying “{currentTopic}”. Its content has not been replaced or renamed. Edit
              the request or add source notes below, then choose Generate deck to retry.
            </p>
          </section>
        )}
        <LectureGenerationOptions draft={draft} patch={patchDraft} />
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
                  onClick={() => setTopic(chip)}
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
            <p className="text-[11px] text-muted">Total slides, including the opening slide.</p>
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
        <p className="text-xs text-muted">
          Topic suggestions fill the form. Choose Generate deck to create a new lecture; the current
          deck stays saved.
        </p>
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
            Enter any microbiology topic and the exact number of slides. The generator builds the
            complete deck using topic material and paginated research passages; AI mode can use a
            configured local model. Review every scientific claim. On Pages, search images in Media
            and references in PubMed or Evidence while online. Media stays in the Media collection
            until you attach it. Configure Ollama in Settings for local AI.
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
          <Label htmlFor={compact ? "gen-notes" : "notes"}>
            Optional abstract or lecture notes
          </Label>
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
      </fieldset>
      {busy && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            controller.current?.abort();
            setProgress("Cancelling generation…");
          }}
        >
          Cancel generation
        </Button>
      )}
    </form>
  );
}
