import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { useDeckStore } from "@/lib/deck-store";
import { deckEvidenceSummary } from "@/lib/deck-evidence-summary";
import { reviewSourceUrl } from "@/lib/review-session";
import { saveFile } from "@/lib/desktop";
import { JUW } from "@/lib/brand";
import type { Deck } from "@/lib/types";
export function EvidenceOverview({ deck }: { deck: Deck }) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all");
  const summary = useMemo(() => deckEvidenceSummary(deck), [deck]);
  const t = summary.totals;
  const rows = summary.rows.filter(
    (r) =>
      `${r.index + 1} ${r.title}`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "all" ||
        (filter === "missing" && r.withoutPassages > 0) ||
        (filter === "review" && r.needsLecturerReview > 0) ||
        (filter === "critical" && r.critical > 0) ||
        (filter === "abstract" && r.abstractOnly > 0) ||
        (filter === "figures" && r.figures > 0)),
  );
  function inspect(index: number) {
    const store = useDeckStore.getState();
    if (store.deck()?.id !== deck.id) {
      toast.message("The active lecture changed. Reopen its evidence overview.");
      return;
    }
    store.select(index);
    store.setTab("evidence");
    if (!store.inspectorOpen) store.toggleInspector();
    setOpen(false);
  }
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Open evidence overview
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(1000px,calc(100vw-1.5rem))]">
          <DialogHeader>
            <DialogTitle>Lecture evidence overview</DialogTitle>
            <DialogDescription>
              {deck.topic} · live coverage of the current revision. Counts describe recorded
              evidence and lecturer review, not scientific certification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Teaching statements", t.statements],
                ["With recorded passages", t.withPassages],
                ["Lecturer checked", t.lecturerReviewed],
                ["Critical findings", t.critical],
              ].map(([label, value]) => (
                <div key={label} className="rounded border border-border bg-elevated p-3">
                  <p className="text-xs text-muted">{label}</p>
                  <p className="mt-1 font-serif text-2xl">{value}</p>
                </div>
              ))}
            </div>
            <section className="space-y-2 rounded border border-border p-3">
              <p className="text-sm">
                Lecturer review coverage: {t.lecturerReviewed}/{t.statements} statements
              </p>
              <progress
                className="h-2 w-full accent-accent"
                aria-label="Lecturer review coverage"
                value={t.lecturerReviewed}
                max={Math.max(1, t.statements)}
              />
              <p className="text-xs text-muted">
                {t.abstractOnly} abstract-only · {t.fullAccess} with full-text/textbook/guideline
                access · {t.withoutPassages} without a recorded passage · {t.figures} attached
                figures
              </p>
              <p className="text-xs text-muted">
                Article-status checks: {t.currentArticleChecks}/{t.identifiableReferences}{" "}
                identifiable references have a complete check within seven days and no recorded
                notice. {t.adverseNotices} adverse notices. This is not a source-quality rating.
              </p>
            </section>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs">
                Find a slide
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Title or slide number…"
                />
              </label>
              <label className="text-xs">
                Evidence filter
                <select
                  className="mt-1 min-h-11 w-full rounded border border-border bg-elevated p-2"
                  aria-label="Evidence filter"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  {[
                    ["all", "All slides"],
                    ["missing", "Missing passages"],
                    ["review", "Needs lecturer review"],
                    ["critical", "Critical findings"],
                    ["abstract", "Abstract-only evidence"],
                    ["figures", "Attached figures"],
                  ].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-xs text-muted">
              {rows.length} matching slides · Select a row to inspect claim evidence.
            </p>
            <ul className="max-h-80 space-y-2 overflow-auto" aria-label="Slide evidence coverage">
              {rows.map((r) => (
                <li key={r.slideId}>
                  <button
                    type="button"
                    className="block w-full rounded border border-border bg-elevated p-3 text-left hover:border-accent"
                    onClick={() => inspect(r.index)}
                  >
                    <p className="text-sm font-medium">
                      {String(r.index + 1).padStart(2, "0")} · {r.title}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {r.statements
                        ? `${r.withPassages}/${r.statements} passages · ${r.lecturerReviewed}/${r.statements} lecturer checked · ${r.abstractOnly} abstract-only`
                        : "No teaching bullet statements — inspect opening text, notes and figure captions separately"}
                    </p>
                    {r.critical > 0 && (
                      <p className="mt-1 text-xs text-danger">{r.critical} critical findings</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            {!rows.length && <p className="text-sm">No slides match this filter.</p>}
            <details className="rounded border border-border p-3">
              <summary className="cursor-pointer text-sm">
                Reference-to-slide map ({t.references})
              </summary>
              <ul className="mt-3 max-h-64 space-y-3 overflow-auto">
                {summary.references.map(({ citation: c, slides }, i) => {
                  const url = reviewSourceUrl(
                    c.url ||
                      (c.doi
                        ? `https://doi.org/${c.doi}`
                        : c.pmid
                          ? `https://pubmed.ncbi.nlm.nih.gov/${c.pmid}/`
                          : ""),
                  );
                  return (
                    <li key={i} className="break-words text-xs">
                      <p>
                        {c.title} · {c.year}
                      </p>
                      <p className="text-muted">Used on slides {slides.join(", ")}</p>
                      {url && (
                        <a
                          className="underline"
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open reference
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </details>
            <p className="text-xs text-muted">{summary.limitations}</p>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                try {
                  await saveFile(
                    "lecture-evidence-overview.json",
                    new TextEncoder().encode(
                      JSON.stringify(
                        {
                          version: JUW.version,
                          topic: deck.topic,
                          deckId: deck.id,
                          revisionId: deck.revisionId,
                          checkedAt: new Date().toISOString(),
                          ...summary,
                        },
                        null,
                        2,
                      ),
                    ),
                    "json",
                  );
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Evidence overview could not be saved.",
                  );
                }
              }}
            >
              Download evidence overview
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
