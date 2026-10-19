import { ClaimEvidenceEditor } from "./claim-evidence-editor";
import { SpecialistReview } from "./specialist-review";
import { TopicMediaPanel } from "./topic-media-panel";
import { ContextHelp } from "./context-help";
import { useState, useId, cloneElement, isValidElement, type ReactNode } from "react";
import { toast } from "sonner";
import { askCopilot, searchOpenAlex, searchPubmed } from "@/lib/ai";
import { formatCitation } from "@/lib/citations";
import { useDeckStore } from "@/lib/deck-store";
import { parseEvidencePaste } from "@/lib/elicit";
import type { Citation, Layout } from "@/lib/types";
import { LAYOUTS } from "@/lib/types";
import { SLIDE_THEMES, THEME_TOKENS } from "@/lib/slide-themes";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";

const TABS = [
  { id: "edit", label: "Edit" },
  { id: "media", label: "Media" },
  { id: "cite", label: "PubMed" },
  { id: "evidence", label: "Evidence" },
  { id: "audit", label: "Review" },
  { id: "copilot", label: "Copilot" },
] as const;

export function InspectorPanel() {
  const tab = useDeckStore((s) => s.inspectorTab);
  const setTab = useDeckStore((s) => s.setTab);
  const inspectorOpen = useDeckStore((s) => s.inspectorOpen);
  const toggleInspector = useDeckStore((s) => s.toggleInspector);

  return (
    <aside
      className={`flex w-[min(100%,320px)] shrink-0 flex-col border-l border-border bg-surface max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 max-lg:shadow-panel ${inspectorOpen ? "max-lg:flex" : "max-lg:hidden"} lg:flex`}
    >
      <div className="flex items-center justify-between border-b border-border px-2">
        <div className="grid min-w-0 flex-1 grid-cols-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`h-11 shrink-0 px-2.5 text-xs uppercase tracking-wider ${tab === t.id ? "border-b-2 border-accent text-fg" : "text-muted"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="lg:hidden" onClick={toggleInspector}>
          Close
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-3">
          <ContextHelp tab={tab} />
          {tab === "edit" && <EditTab />}
          {tab === "media" && <TopicMediaPanel />}
          {tab === "cite" && <CiteTab />}
          {tab === "evidence" && (
            <>
              <ClaimEvidenceEditor />
              <EvidenceTab />
            </>
          )}
          {tab === "audit" && <SpecialistReview />}
          {tab === "copilot" && <CopilotTab />}
        </div>
      </ScrollArea>
    </aside>
  );
}

function EditTab() {
  const deck = useDeckStore((s) => s.deck());
  const slide = useDeckStore((s) => s.slide());
  const index = useDeckStore((s) => s.selectedIndex);
  const patchSlide = useDeckStore((s) => s.patchSlide);
  const patchDeck = useDeckStore((s) => s.patchDeck);
  const setLayout = useDeckStore((s) => s.setLayout);
  if (!slide || !deck) return <Empty>Select a slide.</Empty>;

  return (
    <>
      <p className="text-xs text-muted">
        Every field is live — you can also click the slide canvas and type.
      </p>
      <Field label="Layout">
        <select
          value={slide.layout}
          onChange={(e) => setLayout(e.target.value as Layout)}
          className="h-10 w-full rounded-sm border border-border bg-elevated px-2 text-sm"
        >
          {LAYOUTS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Theme">
        <select
          value={slide.theme ?? "classic"}
          onChange={(e) =>
            patchSlide(index, { theme: e.target.value as (typeof SLIDE_THEMES)[number] })
          }
          className="h-10 w-full rounded-sm border border-border bg-elevated px-2 text-sm"
        >
          {SLIDE_THEMES.map((t) => (
            <option key={t} value={t}>
              {THEME_TOKENS[t].label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-muted">
          {THEME_TOKENS[slide.theme ?? "classic"].blurb}
        </p>
      </Field>
      <Field label="Title">
        <Input value={slide.title} onChange={(e) => patchSlide(index, { title: e.target.value })} />
      </Field>
      <Field label="Subtitle">
        <Input
          value={slide.subtitle}
          onChange={(e) => patchSlide(index, { subtitle: e.target.value })}
        />
      </Field>
      <Field
        label={
          slide.layout === "two-column" ? "Columns (use | to split)" : "Bullets (one per line)"
        }
      >
        <Textarea
          value={
            slide.layout === "two-column"
              ? `${slide.leftBullets.join("\n")}\n|\n${slide.rightBullets.join("\n")}`
              : slide.bullets.join("\n")
          }
          onChange={(e) => {
            const raw = e.target.value;
            if (slide.layout === "two-column") {
              const [left, ...rest] = raw.split(/\n\|\n|\n\|/);
              patchSlide(index, {
                leftBullets: (left || "")
                  .split("\n")
                  .map((x) => x.trim())
                  .filter(Boolean),
                rightBullets: rest
                  .join("\n")
                  .split("\n")
                  .map((x) => x.trim())
                  .filter(Boolean),
              });
            } else {
              patchSlide(index, { bullets: raw.split("\n").filter((x) => x.trim().length > 0) });
            }
          }}
          className="min-h-40"
        />
      </Field>
      <Field label="Speaker notes">
        <Textarea
          value={slide.notes}
          onChange={(e) => patchSlide(index, { notes: e.target.value })}
          placeholder="What will you explain when presenting this slide?"
        />
      </Field>
      <Field label="Course (title slide)">
        <Input value={deck.course ?? ""} onChange={(e) => patchDeck({ course: e.target.value })} />
      </Field>
      <Field label="Course code">
        <Input
          value={deck.courseCode ?? ""}
          onChange={(e) => patchDeck({ courseCode: e.target.value })}
        />
      </Field>
      <Field label="Prepared by">
        <Input
          value={deck.preparedBy ?? ""}
          onChange={(e) => patchDeck({ preparedBy: e.target.value })}
        />
      </Field>
      <Field label="Department">
        <Input
          value={deck.department ?? ""}
          onChange={(e) => patchDeck({ department: e.target.value })}
        />
      </Field>
    </>
  );
}

function CiteTab() {
  const slide = useDeckStore((s) => s.slide());
  const attach = useDeckStore((s) => s.attachCitation);
  const remove = useDeckStore((s) => s.removeCitation);
  const style = useDeckStore((s) => s.citationStyle);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [hits, setHits] = useState<Awaited<ReturnType<typeof searchPubmed>> | null>(null);

  async function run() {
    setBusy(true);
    try {
      const res = await searchPubmed({ data: { query: q || slide?.title || "microbiology" } });
      setHits(res);
      if (!res.ok) toast.message(res.error);
    } catch {
      toast.message("PubMed is unreachable right now.");
    } finally {
      setBusy(false);
    }
  }

  if (!slide) return <Empty>Select a slide.</Empty>;
  return (
    <>
      <Field label="Search PubMed">
        <div className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={slide.title} />
          <Button size="sm" variant="secondary" onClick={run} disabled={busy}>
            {busy ? "…" : "Go"}
          </Button>
        </div>
      </Field>
      {hits && hits.ok && (
        <div className="space-y-2">
          {hits.citations.length === 0 && (
            <p className="text-xs text-muted">No hits. Try a species or toxin name.</p>
          )}
          {hits.citations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => attach(c)}
              className="w-full rounded-sm border border-border bg-elevated p-2 text-left text-xs leading-snug hover:border-accent"
            >
              {formatCitation(c, style)}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-2">
        <Label>Attached</Label>
        {slide.citations.length === 0 && (
          <p className="text-xs text-muted">None yet — audit will flag this slide.</p>
        )}
        {slide.citations.map((c) => (
          <div key={c.id} className="rounded-sm border border-border p-2 text-xs">
            <p className="text-fg">{formatCitation(c, style)}</p>
            <Button variant="ghost" size="sm" className="mt-1" onClick={() => remove(c.id)}>
              Detach
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}

function EvidenceTab() {
  const slide = useDeckStore((s) => s.slide());
  const attach = useDeckStore((s) => s.attachCitation);
  const style = useDeckStore((s) => s.citationStyle);
  const [q, setQ] = useState("");
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [hits, setHits] = useState<Citation[]>([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  async function search() {
    setBusy(true);
    try {
      const res = await searchOpenAlex({ data: { query: q || slide?.title || "microbiology" } });
      if (!res.ok) {
        toast.message(res.error);
        return;
      }
      setHits(res.citations);
      setPicked({});
      if (!res.citations.length) toast.message("No OpenAlex hits. Try a more specific query.");
    } catch {
      toast.message("OpenAlex is unreachable right now.");
    } finally {
      setBusy(false);
    }
  }

  function importPaste() {
    let parsed: Citation[];
    try {
      parsed = parseEvidencePaste(paste);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid reference export.");
      return;
    }
    if (!parsed.length) {
      toast.message("Could not parse that paste. Use Elicit CSV, JSON, or BibTeX.");
      return;
    }
    setHits(parsed);
    setPicked(Object.fromEntries(parsed.map((c) => [c.id, true])));
    toast.success(`Imported ${parsed.length} records.`);
  }

  function attachSelected() {
    const chosen = hits.filter((c) => picked[c.id]);
    if (!chosen.length) {
      toast.message("Select at least one record.");
      return;
    }
    chosen.forEach(attach);
    toast.success(`Attached ${chosen.length} to this slide.`);
  }

  if (!slide) return <Empty>Select a slide.</Empty>;
  return (
    <>
      <p className="text-xs text-muted">
        Zero-cost evidence: OpenAlex search, or import Elicit CSV / JSON / BibTeX.
      </p>
      <Field label="OpenAlex">
        <div className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="bacterial chromosome organisation"
          />
          <Button size="sm" variant="secondary" onClick={search} disabled={busy}>
            {busy ? "…" : "Search"}
          </Button>
        </div>
      </Field>
      <Field label="Import Elicit">
        <Textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder="Paste Elicit CSV, JSON or BibTeX here."
          className="min-h-24"
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={importPaste}>
          Import Elicit
        </Button>
        <Button size="sm" variant="accent" onClick={attachSelected}>
          Attach selected
        </Button>
      </div>
      <div className="space-y-2">
        {hits.map((c) => (
          <label
            key={c.id}
            className="flex gap-2 rounded-sm border border-border bg-elevated p-2 text-xs"
          >
            <input
              type="checkbox"
              className="mt-0.5"
              checked={Boolean(picked[c.id])}
              onChange={(e) => setPicked((p) => ({ ...p, [c.id]: e.target.checked }))}
            />
            <span className="min-w-0 leading-snug text-fg">{formatCitation(c, style)}</span>
          </label>
        ))}
      </div>
      {slide.citations.length > 0 && (
        <div className="space-y-1">
          <Label>Attached evidence</Label>
          {slide.citations.map((c) => (
            <p key={c.id} className="text-xs leading-snug text-muted">
              {formatCitation(c, style)}
            </p>
          ))}
        </div>
      )}
    </>
  );
}

function CopilotTab() {
  const slide = useDeckStore((s) => s.slide());
  const index = useDeckStore((s) => s.selectedIndex);
  const patch = useDeckStore((s) => s.patchSlide);
  const [q, setQ] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function run(refine: boolean) {
    if (!slide) return;
    setBusy(true);
    try {
      const res = await askCopilot({
        data: {
          question: q || "How should I teach this slide?",
          slideTitle: slide.title,
          slideBody: slide.bullets.join("\n"),
          refine,
        },
      });
      if (!res.ok) {
        toast.message(res.error);
        setLog((l) => [`${res.error}`, ...l]);
        return;
      }
      setLog((l) => [res.text, ...l]);
      if (refine) {
        const match = res.text.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const json = JSON.parse(match[0]) as {
              title?: string;
              bullets?: string[];
              notes?: string;
            };
            patch(index, {
              title: json.title || slide.title,
              bullets: json.bullets || slide.bullets,
              notes: json.notes || slide.notes,
            });
            toast.success("Slide refined.");
          } catch {
            /* keep log only */
          }
        }
      }
      setQ("");
    } catch {
      toast.message("Copilot is offline.");
    } finally {
      setBusy(false);
    }
  }

  if (!slide) return <Empty>Select a slide.</Empty>;
  return (
    <>
      <Field label="In-deck copilot">
        <Textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask a question or describe how to refine this slide."
        />
      </Field>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(false)}>
          Ask
        </Button>
        <Button size="sm" variant="accent" disabled={busy} onClick={() => run(true)}>
          Refine slide
        </Button>
      </div>
      <div className="space-y-2">
        {log.map((entry, i) => (
          <pre
            key={i}
            className="whitespace-pre-wrap rounded-sm bg-elevated p-2 font-sans text-xs text-muted"
          >
            {entry}
          </pre>
        ))}
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {isValidElement<{ id?: string }>(children) ? cloneElement(children, { id }) : children}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}
