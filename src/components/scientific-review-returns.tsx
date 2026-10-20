import { useState } from "react";
import type { Deck } from "@/lib/types";
import { validateScientificReviewReturns } from "@/lib/scientific-review-assessment";
import { saveFile } from "@/lib/desktop";
import { Button } from "./ui/button";
export function ScientificReviewReturns({ deck }: { deck: Deck }) {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    signature: string;
    report: Awaited<ReturnType<typeof validateScientificReviewReturns>>;
  } | null>(null);
  const signature = JSON.stringify([deck.topic, deck.slides, deck.sourceDocuments]);
  async function readFile(key: string, file?: File) {
    setResult(null);
    setError("");
    setFiles((old) => {
      const next = { ...old };
      delete next[key];
      return next;
    });
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError("Each review file must be smaller than 8 MB.");
      return;
    }
    try {
      const text = await file.text();
      setFiles((old) => ({ ...old, [key]: text }));
    } catch {
      setError("Review file could not be read. Your deck has not changed.");
    }
  }
  return (
    <details className="space-y-2 rounded border border-border p-3">
      <summary className="cursor-pointer text-sm font-medium">
        Assess returned reviewer forms
      </summary>
      <p className="text-xs text-muted">
        Load the original pack.json and two separately completed forms. This checks consistency and
        decisions; reviewer identity and expertise still require human verification. Your slides are
        not changed.
      </p>
      {[
        ["pack", "Original review pack"],
        ["a", "Reviewer A form"],
        ["b", "Reviewer B form"],
      ].map(([key, label]) => (
        <label key={key} className="block text-xs">
          {label}
          <input
            className="mt-1 block w-full min-h-11 text-xs"
            type="file"
            accept=".json,application/json"
            disabled={busy}
            onChange={(e) => void readFile(key, e.target.files?.[0])}
          />
        </label>
      ))}
      <Button
        size="sm"
        variant="secondary"
        disabled={busy || !files.pack || !files.a || !files.b}
        onClick={async () => {
          setBusy(true);
          setError("");
          setResult(null);
          try {
            setResult({
              signature,
              report: await validateScientificReviewReturns(deck, files.pack, [files.a, files.b]),
            });
          } catch (e) {
            setError(e instanceof Error ? e.message : "Review assessment failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Assessing returns…" : "Assess returned forms"}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
      {result &&
        (result.signature !== signature ? (
          <p role="status" className="text-xs">
            Deck or evidence changed. Reassess against the current revision.
          </p>
        ) : (
          <div className="space-y-2 text-xs" role="status">
            <p>
              {result.report.status === "two-reviewer-attestations-complete"
                ? "Two reviewer attestations complete — identity and independence unverified"
                : result.report.status === "corrections-or-adjudication-required"
                  ? "Corrections or adjudication required"
                  : "Review incomplete"}
            </p>
            <p>
              {result.report.errors.length} completeness issues ·{" "}
              {result.report.disagreements.length} disagreements ·{" "}
              {result.report.corrections.length} items requiring correction
            </p>
            {result.report.errors.slice(0, 20).map((message, i) => (
              <p key={i}>{message}</p>
            ))}
            <p>{result.report.limitations}</p>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                try {
                  await saveFile(
                    "scientific-review-assessment.json",
                    new TextEncoder().encode(JSON.stringify(result.report, null, 2)),
                    "json",
                  );
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Report could not be saved.");
                }
              }}
            >
              Download assessment
            </Button>
          </div>
        ))}
    </details>
  );
}
