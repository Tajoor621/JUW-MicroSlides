import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { askCopilot, searchOpenAlex, searchPubmed } from "@/lib/ai";
import { formatCitation } from "@/lib/citations";
import { useDeckStore } from "@/lib/deck-store";
import { parseEvidencePaste } from "@/lib/elicit";
import { fallbackVisual, searchMedia, suggestMediaForText } from "@/lib/media-catalog";
import { searchOpenMedia } from "@/lib/media-search";
import type { Citation, Layout, MediaItem } from "@/lib/types";
import { LAYOUTS } from "@/lib/types";
import { SLIDE_THEMES, THEME_TOKENS } from "@/lib/slide-themes";
import { mediaKey, mediaDisplaySrc, uid } from "@/lib/utils";
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
  { id: "audit", label: "Audit" },
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
        <div className="flex min-w-0 flex-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
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
          {tab === "edit" && <EditTab />}
          {tab === "media" && <MediaTab />}
          {tab === "cite" && <CiteTab />}
          {tab === "evidence" && <EvidenceTab />}
          {tab === "audit" && <AuditTab />}
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
      <p className="text-xs text-muted">Every field is live — you can also click the slide canvas and type.</p>
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
          onChange={(e) => patchSlide(index, { theme: e.target.value as (typeof SLIDE_THEMES)[number] })}
          className="h-10 w-full rounded-sm border border-border bg-elevated px-2 text-sm"
        >
          {SLIDE_THEMES.map((t) => (
            <option key={t} value={t}>
              {THEME_TOKENS[t].label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-muted">{THEME_TOKENS[slide.theme ?? "classic"].blurb}</p>
      </Field>
      <Field label="Title">
        <Input value={slide.title} onChange={(e) => patchSlide(index, { title: e.target.value })} />
      </Field>
      <Field label="Subtitle">
        <Input value={slide.subtitle} onChange={(e) => patchSlide(index, { subtitle: e.target.value })} />
      </Field>
      <Field label={slide.layout === "two-column" ? "Columns (use | to split)" : "Bullets (one per line)"}>
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
        <Input value={deck.courseCode ?? ""} onChange={(e) => patchDeck({ courseCode: e.target.value })} />
      </Field>
      <Field label="Prepared by">
        <Input value={deck.preparedBy ?? ""} onChange={(e) => patchDeck({ preparedBy: e.target.value })} />
      </Field>
      <Field label="Department">
        <Input value={deck.department ?? ""} onChange={(e) => patchDeck({ department: e.target.value })} />
      </Field>
    </>
  );
}

function MediaTab() {
  const deck = useDeckStore((s) => s.deck());
  const slide = useDeckStore((s) => s.slide());
  const attach = useDeckStore((s) => s.attachMedia);
  const remove = useDeckStore((s) => s.removeMedia);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<MediaItem[]>([]);
  const [credit, setCredit] = useState({ url: "", creator: "", source: "", license: "CC BY 4.0" });

  const used = useMemo(() => {
    const keys = new Set<string>();
    for (const s of deck?.slides ?? []) {
      for (const m of s.media) {
        keys.add(m.id);
        keys.add(mediaKey(m.src));
      }
    }
    return keys;
  }, [deck]);

  const catalog = useMemo(() => {
    if (q.trim()) return searchMedia(q, 16, used);
    if (slide) return suggestMediaForText(`${slide.title} ${slide.bullets.join(" ")}`, 12, used);
    return searchMedia("", 12, used);
  }, [q, slide, used]);

  async function searchLive(silent = false) {
    const query = q.trim() || `${slide?.title ?? ""} ${deck?.topic ?? "microbiology"}`;
    setBusy(true);
    try {
      const res = await searchOpenMedia({ data: { query } });
      if (!res.ok) {
        if (!silent) toast.message(res.error);
        setLive([]);
        return;
      }
      setLive(res.items);
      if (!res.items.length && !silent) toast.message("No open-licence hits. Try a species, stain, or method name.");
    } catch {
      if (!silent) toast.message("Open archives are unreachable right now.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void searchLive(true);
    // Search once when the Media tab opens on a slide so unused archive hits appear immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide?.id]);

  function tryAttach(item: MediaItem) {
    const key = mediaKey(item.src);
    if (used.has(item.id) || used.has(key)) {
      toast.message("That file is already on another slide in this deck.");
      return;
    }
    attach(item);
  }

  if (!slide || !deck) return <Empty>Select a slide.</Empty>;

  const pool = (deck.mediaPool ?? []).filter((m) => !used.has(m.id) && !used.has(mediaKey(m.src)));
  const liveUnused = live.filter((m) => !used.has(m.id) && !used.has(mediaKey(m.src)));

  return (
    <>
      <p className="text-xs text-muted">
        Each slide keeps one unique figure — no repeats in this deck. Search Wikimedia Commons, Openverse, Wellcome,
        iNaturalist, NASA, Library of Congress, GBIF, Wikipedia, Cleveland Museum, The Met, Art Institute of Chicago,
        and Internet Archive. Unused generate hits stay in the pool so you can swap without losing them.
      </p>
      <Field label="Search open archives">
        <div className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void searchLive();
              }
            }}
            placeholder="Gram stain, enzyme, phage diagram…"
          />
          <Button size="sm" variant="accent" onClick={() => void searchLive()} disabled={busy}>
            {busy ? "…" : "Go"}
          </Button>
        </div>
      </Field>
      <Button
        size="sm"
        variant="secondary"
        className="w-full"
        onClick={() => {
          setQ(`${slide.title} ${slide.bullets[0] ?? deck.topic}`);
          void searchLive();
        }}
      >
        Search this slide’s topic
      </Button>

      {slide.media.length > 0 && (
        <div className="space-y-1">
          <Label>On this slide</Label>
          {slide.media.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded-sm border border-border bg-elevated p-2">
              <img
                src={mediaDisplaySrc(m.src)}
                alt=""
                className="size-12 rounded-xs object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = fallbackVisual(m.title).src;
                }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-fg">{m.title}</span>
                <span className="block text-xs text-muted">
                  {m.kind} · {m.source} · {m.license}
                </span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => remove(m.id)}>
                Swap
              </Button>
            </div>
          ))}
        </div>
      )}

      <MediaGrid title="Collected for this deck" items={pool} onPick={tryAttach} />
      <MediaGrid title="Live open sources" items={liveUnused} onPick={tryAttach} />
      <MediaGrid title="Studio catalog" items={catalog} onPick={tryAttach} />

      <div className="space-y-2 rounded-sm border border-border p-3">
        <Label>Your own media</Label>
        <Input
          value={credit.url}
          onChange={(e) => setCredit({ ...credit, url: e.target.value })}
          placeholder="Image URL"
        />
        <Input
          value={credit.creator}
          onChange={(e) => setCredit({ ...credit, creator: e.target.value })}
          placeholder="Creator / organisation"
        />
        <Input
          value={credit.source}
          onChange={(e) => setCredit({ ...credit, source: e.target.value })}
          placeholder="Source (Wikimedia, lab, paper…)"
        />
        <Input
          value={credit.license}
          onChange={(e) => setCredit({ ...credit, license: e.target.value })}
          placeholder="License"
        />
        <Button
          size="sm"
          variant="secondary"
          className="w-full"
          onClick={() => {
            if (!credit.url.trim()) {
              toast.message("Add an image URL first.");
              return;
            }
            tryAttach({
              id: uid("media"),
              kind: "photo",
              title: credit.creator || "Instructor media",
              src: credit.url.trim(),
              credit: credit.creator || "Instructor",
              source: credit.source || "Own media",
              license: credit.license || "All rights reserved",
              keywords: [],
            });
            setCredit({ url: "", creator: "", source: "", license: "CC BY 4.0" });
            toast.success("Media attached with credit.");
          }}
        >
          Save credit and attach
        </Button>
      </div>
    </>
  );
}

function MediaGrid({
  title,
  items,
  onPick,
}: {
  title: string;
  items: MediaItem[];
  onPick: (item: MediaItem) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <div className="grid gap-2">
        {items.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onPick(m)}
            className="flex gap-2 rounded-sm border border-border bg-elevated p-2 text-left hover:border-accent"
          >
            <img
              src={mediaDisplaySrc(m.src)}
              alt=""
              className="size-14 rounded-xs object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = fallbackVisual(m.title).src;
              }}
            />
            <span className="min-w-0">
              <span className="block truncate text-sm text-fg">{m.title}</span>
              <span className="block text-xs text-muted">
                {m.kind} · {m.source} · {m.license}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
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
          {hits.citations.length === 0 && <p className="text-xs text-muted">No hits. Try a species or toxin name.</p>}
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
        {slide.citations.length === 0 && <p className="text-xs text-muted">None yet — audit will flag this slide.</p>}
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
    const parsed = parseEvidencePaste(paste);
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
      <p className="text-xs text-muted">Zero-cost evidence: OpenAlex search, or import Elicit CSV / JSON / BibTeX.</p>
      <Field label="OpenAlex">
        <div className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="bacterial chromosome organisation" />
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
          <label key={c.id} className="flex gap-2 rounded-sm border border-border bg-elevated p-2 text-xs">
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

function AuditTab() {
  const deck = useDeckStore((s) => s.deck());
  const select = useDeckStore((s) => s.select);
  if (!deck) return <Empty>No deck.</Empty>;
  const cited = deck.slides.filter((s) => s.citations.length > 0).length;
  const score = Math.round((cited / Math.max(1, deck.slides.length)) * 100);
  return (
    <>
      <div className="rounded-md border border-border bg-elevated p-4">
        <p className="text-xs uppercase tracking-wider text-muted">Citation coverage</p>
        <p className="mt-1 font-serif text-4xl tabular-nums text-fg">{score}%</p>
        <p className="text-xs text-muted">
          {cited}/{deck.slides.length} slides carry evidence
        </p>
      </div>
      <ul className="space-y-1">
        {deck.slides.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => select(i)}
              className="flex min-h-11 w-full items-center justify-between rounded-xs px-1 py-2 text-left text-xs hover:bg-elevated"
            >
              <span className="truncate text-fg">
                {i + 1}. {s.title}
              </span>
              <span className={s.citations.length ? "text-success" : "text-danger"}>
                {s.citations.length ? `${s.citations.length} cited` : "missing"}
              </span>
            </button>
          </li>
        ))}
      </ul>
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
            const json = JSON.parse(match[0]) as { title?: string; bullets?: string[]; notes?: string };
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
          <pre key={i} className="whitespace-pre-wrap rounded-sm bg-elevated p-2 font-sans text-xs text-muted">
            {entry}
          </pre>
        ))}
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}
