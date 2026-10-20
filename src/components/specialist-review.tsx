import { downloadScientificReviewPack } from "@/lib/scientific-review-pack";
import { SourceLibrary } from "./source-library";
import { semanticReview } from "@/lib/semantic-review";
import { citationIdentifier, statusIsFresh } from "@/lib/publication-status";
import { integrityAudit } from "@/lib/deck-integrity";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useDeckStore } from "@/lib/deck-store";
import { reviewDeck, checkReferenceMetadata, type ReferenceCheck } from "@/lib/research-review";
import { reviewLocalSlide } from "@/lib/local-ai";
import { Button } from "./ui/button";
export function SpecialistReview() {
  const deck = useDeckStore((s) => s.deck());
  const slide = useDeckStore((s) => s.slide());
  const selected = useDeckStore((s) => s.selectedIndex);
  const select = useDeckStore((s) => s.select);
  const [semantic, setSemantic] = useState<{
    signature: string;
    report: Awaited<ReturnType<typeof semanticReview>>;
  } | null>(null);
  const [vision, setVision] = useState(false);
  const [scope, setScope] = useState("deck");
  const [busy, setBusy] = useState("");
  const [refs, setRefs] = useState<{
    deckId: string;
    checkedAt: string;
    signature: string;
    items: ReferenceCheck[];
  } | null>(null);
  const [ai, setAi] = useState<{
    signature: string;
    issues: { severity: string; quote: string; problem: string; suggestion: string }[];
    limitations: string;
  } | null>(null);
  const all = useMemo(
    () =>
      deck
        ? [
            ...reviewDeck(deck),
            ...integrityAudit(deck).map((i, n) => ({
              id: `integrity-${n}`,
              source: undefined,
              slideId: i.slideId,
              index: i.index,
              severity: i.severity === "critical" ? ("high" as const) : ("medium" as const),
              category: i.category,
              quote: i.quote,
              problem: i.message,
              suggestion:
                "Inspect the supporting source in Claim evidence, then record an explicit lecturer review or replace the statement.",
            })),
          ]
        : [],
    [deck],
  );
  const issues = scope === "slide" ? all.filter((i) => i.index === selected) : all;
  const signature = JSON.stringify([deck?.topic, slide]);
  const deckSignature = JSON.stringify(
    deck?.slides.map((s) => [s.title, s.bullets, s.leftBullets, s.rightBullets]),
  );
  const referenceSignature = (d: typeof deck) =>
    JSON.stringify(
      d?.slides.flatMap((s) => s.citations).map(({ publicationCheck: _check, ...r }) => r),
    );
  if (!deck || !slide) return <p>Select a deck to review.</p>;
  const high = all.filter((i) => i.severity === "high").length;
  const media = deck.slides.reduce((n, s) => n + s.media.length, 0);
  async function verify() {
    if (!deck) return;
    setBusy("references");
    try {
      const before = referenceSignature(deck);
      const items = await checkReferenceMetadata(deck.slides.flatMap((s) => s.citations));
      const live = useDeckStore.getState().deck();
      if (!live || live.id !== deck.id || referenceSignature(live) !== before)
        throw Error(
          "References changed during checking. Run the check again for the current revision.",
        );
      const byIdentifier = new Map(
        items.filter((r) => r.publication).map((r) => [r.publication!.identifier, r.publication!]),
      );
      const selectedBefore = useDeckStore.getState().selectedIndex;
      useDeckStore.getState().replaceActive({
        ...live,
        slides: live.slides.map((s) => ({
          ...s,
          citations: s.citations.map((c) => ({
            ...c,
            publicationCheck: byIdentifier.get(citationIdentifier(c)) || c.publicationCheck,
          })),
        })),
        updatedAt: Date.now(),
      });
      useDeckStore.getState().select(selectedBefore);
      setRefs({
        deckId: deck.id,
        signature: before,
        checkedAt: new Date().toLocaleString(),
        items,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reference check failed");
    } finally {
      setBusy("");
    }
  }
  async function specialist() {
    if (!deck || !slide) return;
    setBusy("ai");
    try {
      const report = await reviewLocalSlide(deck.topic, slide, vision);
      setAi({ signature, ...report });
    } catch (e) {
      toast.message(
        e instanceof Error
          ? e.message
          : "Local specialist model unavailable. Built-in checks remain available.",
      );
    } finally {
      setBusy("");
    }
  }
  function download() {
    const report = {
      topic: deck!.topic,
      version: "V6.2.1",
      reviewedAt: new Date().toISOString(),
      scope: "Entire deck",
      limitations:
        "Built-in rules are screening checks, not scientific certification. Image pixels are not inspected. Reference metadata matching does not establish claim support.",
      issues: all,
      referenceChecks:
        refs?.deckId === deck!.id && refs.signature === referenceSignature(deck) ? refs.items : [],
      semanticReview: semantic?.signature === deckSignature ? semantic.report : undefined,
      aiReview: ai?.signature === signature ? ai : undefined,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "microbiology-review.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="space-y-4">
      <section className="rounded border border-border bg-elevated p-3">
        <h3 className="font-serif text-base">Microbiology specialist review</h3>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          A structured screening of research content and attached media. Findings identify exact
          passages and suggested corrections. Rules and metadata cannot certify scientific accuracy
          or interpret image pixels.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <span>{deck.slides.length} slides screened</span>
          <span>{media} attached figures</span>
          <span className="text-danger">{high} high-priority flags</span>
          <span>{all.length} total review items</span>
        </div>
      </section>
      <section className="space-y-2 rounded border border-border p-3">
        <h4 className="text-sm font-medium">Independent scientific review</h4>
        <p className="text-xs text-muted">
          Download all slide text, private notes, claim evidence and figure links with two blank
          external reviewer forms. Share deliberately. Qualified reviewers must check sources,
          scientific context and repetition independently. Preparing this pack does not certify the
          deck.
        </p>
        <Button
          size="sm"
          variant="secondary"
          disabled={Boolean(busy)}
          onClick={async () => {
            setBusy("review-pack");
            try {
              await downloadScientificReviewPack(deck);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Review pack could not be saved");
            } finally {
              setBusy("");
            }
          }}
        >
          {busy === "review-pack" ? "Preparing review pack…" : "Download independent review pack"}
        </Button>
      </section>
      <SourceLibrary />
      <section className="space-y-2 rounded border border-border p-3">
        <h4 className="text-sm font-medium">Semantic overlap screening</h4>
        <p className="text-xs text-muted">
          Uses your installed embedding model for the entire deck. Scores are model-dependent review
          candidates, not proof of repetition or scientific truth. Changed numbers and negation are
          flagged separately.
        </p>
        <Button
          size="sm"
          variant="secondary"
          disabled={Boolean(busy)}
          onClick={async () => {
            setBusy("semantic");
            try {
              setSemantic({ signature: deckSignature, report: await semanticReview(deck) });
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Semantic check unavailable");
            } finally {
              setBusy("");
            }
          }}
        >
          {busy === "semantic" ? "Screening entire deck…" : "Screen semantic overlap"}
        </Button>
        {semantic &&
          (semantic.signature !== deckSignature ? (
            <p className="text-xs">Content changed; rerun semantic screening.</p>
          ) : (
            <div className="space-y-2 text-xs">
              <p>
                {semantic.report.statements} statements · {semantic.report.model} ·{" "}
                {semantic.report.elapsedMs} ms · threshold {semantic.report.threshold}
              </p>
              <p>{semantic.report.limitations}</p>
              <p>
                {semantic.report.findings.length} candidate pairs (showing up to 100; full results
                in downloaded report)
              </p>
              {semantic.report.findings.slice(0, 100).map((f, i) => (
                <div key={i} className="rounded border border-border p-2">
                  <button className="underline" onClick={() => select(f.second)}>
                    Slides {f.first + 1} / {f.second + 1} · {f.kind} · {f.similarity.toFixed(3)}
                  </button>
                  <blockquote>{f.a}</blockquote>
                  <blockquote>{f.b}</blockquote>
                </div>
              ))}
            </div>
          ))}
      </section>
      {deck.contentWarnings?.map((w, i) => (
        <p key={i} className="rounded border border-border p-2 text-xs text-muted">
          {w}
        </p>
      ))}
      <label className="block text-xs">
        Review scope
        <select
          aria-label="Review scope"
          className="mt-1 block min-h-11 w-full rounded border border-border bg-elevated p-2"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="deck">Entire deck</option>
          <option value="slide">Selected slide</option>
        </select>
      </label>
      <p className="text-xs text-muted">
        Checks update when you edit. Built-in checks cover topic alignment, duplicated text,
        generator prompts, selected common misconceptions, evidence gaps and figure metadata.
      </p>
      {issues.length === 0 ? (
        <p className="rounded border border-border p-3 text-sm">
          No built-in flags were found in this scope. This is not a scientific approval.
        </p>
      ) : (
        <ol className="space-y-3">
          {issues.map((i) => (
            <li key={i.id} className="space-y-2 rounded border border-border p-3 text-xs">
              <button className="text-left font-medium underline" onClick={() => select(i.index)}>
                Slide {i.index + 1} · {i.category}
              </button>
              <p className={i.severity === "high" ? "text-danger" : "text-muted"}>
                {i.severity.toUpperCase()} · {i.problem}
              </p>
              <blockquote className="border-l-2 border-accent pl-2 text-muted">
                {i.quote}
              </blockquote>
              <p>
                <strong>Suggested correction:</strong> {i.suggestion}
              </p>
              {i.source && (
                <a
                  className="block underline"
                  href={i.source}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Check authoritative source
                </a>
              )}
            </li>
          ))}
        </ol>
      )}
      <section className="space-y-2 rounded border border-border p-3">
        <h4 className="text-sm font-medium">Cross-check reference metadata</h4>
        <p className="text-xs text-muted">
          Checks up to 30 unique DOI/PMID records against Crossref or Europe PMC. It does not
          establish claim support, study quality or absence of retraction.
        </p>
        <Button
          size="sm"
          variant="secondary"
          disabled={Boolean(busy)}
          onClick={() => void verify()}
        >
          {busy === "references" ? "Checking…" : "Check references online"}
        </Button>
        {refs?.deckId === deck.id && refs.signature === referenceSignature(deck) && (
          <div className="space-y-2">
            <p className="text-xs text-muted">
              Checked {refs.checkedAt}. Maximum 200 unique references per run; references beyond
              this remain unchecked. Rerun after changing references.
            </p>
            {refs.items.length === 0 ? (
              <p className="text-xs">
                No attached bibliographic records to check. Add the original references in PubMed or
                Evidence.
              </p>
            ) : (
              refs.items.map((r) => (
                <div key={r.id} className="rounded border border-border p-2 text-xs">
                  <p className="font-medium">
                    {r.status.toUpperCase()} · {r.title}
                  </p>
                  <p className="mt-1 text-muted">{r.message}</p>
                  {r.publication && (
                    <div className="mt-2 space-y-1">
                      <p>
                        Publication status: {r.publication.status} ·{" "}
                        {r.publication.complete
                          ? "all configured providers answered"
                          : "partial / unknown"}
                      </p>
                      <p>
                        {r.publication.providers.join(", ") || "No provider response"} · checked{" "}
                        {new Date(r.publication.checkedAt).toLocaleString()}
                        {!statusIsFresh(r.publication) ? " · STALE" : ""}
                        {r.cached ? " · CACHED" : ""}
                      </p>
                      <p>
                        No notice found means only that the queried providers returned no notice. It
                        does not establish study quality or current clinical applicability.
                      </p>
                      {r.publication.notices.map((n, i) => (
                        <a
                          key={i}
                          className="block underline"
                          href={n.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {n.type}: open notice
                        </a>
                      ))}
                    </div>
                  )}
                  {r.url && (
                    <a className="underline" href={r.url} target="_blank" rel="noopener noreferrer">
                      Open record
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </section>
      <section className="space-y-2 rounded border border-border p-3">
        <h4 className="text-sm font-medium">Optional local AI specialist</h4>
        <p className="text-xs text-muted">
          Uses your configured Ollama model to review the selected slide and attached media.
          Text-only mode checks metadata. Image inspection requires a vision-capable model and
          readable image files. Suggestions are unverified; edits are never applied automatically.
        </p>
        <label className="flex min-h-11 items-center gap-2 text-xs">
          <input type="checkbox" checked={vision} onChange={(e) => setVision(e.target.checked)} />
          Inspect attached image pixels (vision model required)
        </label>
        <Button
          size="sm"
          variant="secondary"
          disabled={Boolean(busy)}
          onClick={() => void specialist()}
        >
          {busy === "ai" ? "Reviewing selected slide…" : "AI review selected slide"}
        </Button>
        {ai &&
          (ai.signature !== signature ? (
            <p className="text-xs text-muted">
              The slide changed since the AI review. Run the review again for this revision.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted">{ai.limitations}</p>
              {ai.issues.map((i, n) => (
                <div key={n} className="rounded border border-border p-2 text-xs">
                  <strong>
                    {i.severity.toUpperCase()}: {i.problem}
                  </strong>
                  <blockquote className="my-2 text-muted">{i.quote}</blockquote>
                  <p>Suggested correction: {i.suggestion}</p>
                </div>
              ))}
            </div>
          ))}
      </section>
      <Button size="sm" variant="accent" onClick={download}>
        Download review report
      </Button>
    </div>
  );
}
