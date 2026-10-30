import { useMemo } from "react";
import { slideGrounding } from "@/lib/generation-grounding";
import { useDeckStore } from "@/lib/deck-store";
const labels: Record<string, string> = {
  "exact-passage": "Exact passage wording",
  "reference-only": "Reference linked; passage not matched",
  "source-needed": "Source passage needed",
  label: "Heading or label; meaning not verified",
  pedagogical: "Question or learning instruction",
  "visual-unverified": "Visual meaning not verified",
};
/** Read-only provenance, not a review workflow or an export gate. Recomputed after edits. */
export function SourceProvenance() {
  const deck = useDeckStore((s) => s.deck());
  const slide = useDeckStore((s) => s.slide());
  const fields = useMemo(() => (deck && slide ? slideGrounding(deck, slide) : []), [deck, slide]);
  if (!deck || !slide) return null;
  return (
    <details className="rounded border border-border p-2 text-xs" aria-label="Source provenance">
      <summary className="min-h-11 cursor-pointer font-medium">Source provenance</summary>
      <p className="mb-2 text-muted">
        Exact wording links are not scientific approval. Reference-only wording, headings and
        visuals remain unverified. This information never blocks downloads.
      </p>
      <ul className="space-y-2">
        {fields.map((f) => (
          <li key={f.field} className="break-words border-t border-border pt-2">
            <strong>{f.field}</strong>
            <p>{labels[f.status]}</p>
            {f.sourceUrl && (
              <a className="underline" href={f.sourceUrl} target="_blank" rel="noreferrer">
                Source passage
              </a>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
