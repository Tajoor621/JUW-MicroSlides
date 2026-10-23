import { useState, useEffect } from "react";
import { useDeckStore } from "@/lib/deck-store";
import { searchPubmed } from "@/lib/ai";
import { mergeCitationCandidates } from "@/lib/teaching";
import type { Citation } from "@/lib/types";
import { Button } from "./ui/button";
import { toast } from "sonner";
const portals = [
  [
    "EUCAST breakpoint tables",
    "https://www.eucast.org/bacteria/clinical-breakpoints-and-interpretation/clinical-breakpoint-tables/",
  ],
  ["CLSI M100", "https://clsi.org/shop/standards/m100/"],
  ["IDSA practice guidelines", "https://www.idsociety.org/practice-guideline/practice-guidelines/"],
  ["CDC infection control", "https://www.cdc.gov/infection-control/hcp/index.html"],
  ["WHO guidelines", "https://www.who.int/publications/who-guidelines"],
  ["CDC laboratory biosafety", "https://www.cdc.gov/labs/bmbl/"],
];
export function GuidelineCards() {
  const deck = useDeckStore((s) => s.deck()),
    slide = useDeckStore((s) => s.slide());
  const [busy, setBusy] = useState(false),
    [papers, setPapers] = useState<Citation[]>([]);
  useEffect(() => {
    setPapers([]);
  }, [deck?.id, deck?.topic, slide?.id]);
  if (!deck || !slide) return null;
  async function search() {
    if (!deck || !slide) return;
    const id = deck.id,
      slideId = slide.id,
      topic = deck.topic;
    setBusy(true);
    try {
      const year = new Date().getFullYear();
      const r = await searchPubmed({
        data: {
          query: `(${topic}) AND (guideline[Publication Type] OR practice guideline[Publication Type]) AND ${year - 5}:${year}[dp]`,
        },
      });
      const live = useDeckStore.getState().deck();
      if (
        live?.id !== id ||
        live.topic !== topic ||
        useDeckStore.getState().slide()?.id !== slideId
      )
        return;
      if (!r.ok) throw Error(r.error);
      setPapers(r.citations);
      useDeckStore.getState().patchDeck({ lastLiteratureCheck: Date.now() });
      if (!r.citations.length)
        toast.message(
          "No indexed guideline candidates returned. Check the official portals below.",
        );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Guideline search unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="rounded border border-border p-3">
      <summary className="cursor-pointer text-sm">Guideline & currency suggestions</summary>
      <div className="mt-2 space-y-3">
        <p className="text-xs text-muted">
          Last literature search:{" "}
          {deck.lastLiteratureCheck
            ? new Date(deck.lastLiteratureCheck).toLocaleString()
            : "Not recorded"}
          . A search timestamp does not establish guideline currency, local applicability or claim
          support.
        </p>
        <Button size="sm" disabled={busy} onClick={() => void search()}>
          {busy ? "Searching…" : "Suggest recent guidelines"}
        </Button>
        {papers.map((c) => (
          <article className="space-y-2 rounded border p-2 text-xs" key={c.id}>
            <p>
              {c.title} · {c.year}
            </p>
            <Button
              size="sm"
              onClick={() => {
                const state = useDeckStore.getState();
                const current = state.slide();
                if (!current) return;
                state.patchSlide(state.selectedIndex, {
                  citations: mergeCitationCandidates(current.citations, [c]),
                  evidenceFlags: [
                    ...new Set([
                      ...(current.evidenceFlags || []),
                      "guideline-linked" as const,
                      "needs-verification" as const,
                    ]),
                  ],
                });
              }}
            >
              Attach candidate for review
            </Button>
          </article>
        ))}
        {portals.map(([label, url]) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block min-h-11 rounded border p-2 text-xs underline"
          >
            {label}
          </a>
        ))}
        <p className="text-xs text-muted">
          Inspect the edition, organism, method, dosing assumptions, footnotes and local policy. No
          breakpoint or recommendation is copied automatically. CLSI access may require an
          institutional licence.
        </p>
      </div>
    </details>
  );
}
