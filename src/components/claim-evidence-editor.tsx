import { SurfaceEvidenceEditor } from "./surface-evidence-editor";
import { attestClaim, claimReviewIsCurrent } from "@/lib/surface-review";
import { useState, useEffect } from "react";
import { useDeckStore } from "@/lib/deck-store";
import { reconcileClaims } from "@/lib/deck-integrity";
import { Button } from "./ui/button";
import type { Claim } from "@/lib/types";
import { toast } from "sonner";
export function ClaimEvidenceEditor() {
  const deck = useDeckStore((s) => s.deck()),
    slide = useDeckStore((s) => s.slide()),
    index = useDeckStore((s) => s.selectedIndex),
    patch = useDeckStore((s) => s.patchSlide);
  const [selected, setSelected] = useState(0),
    [access, setAccess] = useState<Claim["evidence"][number]["access"]>("instructor"),
    [quote, setQuote] = useState(""),
    [url, setUrl] = useState(""),
    [locator, setLocator] = useState(""),
    [classification, setClassification] = useState<Claim["classification"]>("unclassified"),
    [attest, setAttest] = useState(false);
  const claims = slide ? reconcileClaims(slide).claims || [] : [];
  const claim = claims[Math.min(selected, claims.length - 1)];
  useEffect(() => {
    setQuote("");
    setUrl("");
    setLocator("");
    setAttest(false);
  }, [slide?.id, selected]);
  if (!deck || !slide) return null;
  return (
    <>
      <section className="space-y-2 rounded border border-border p-3">
        <h3 className="font-semibold">Claim evidence</h3>
        <p className="text-xs text-muted">
          Every factual point needs a supporting passage and locator. Lecturer review is recorded
          explicitly; it is not independent certification.
        </p>
        {claim ? (
          <>
            <label className="block text-xs">
              Statement
              <select
                aria-label="Evidence statement"
                className="mt-1 w-full rounded border bg-elevated p-2"
                value={Math.min(selected, claims.length - 1)}
                onChange={(e) => {
                  setSelected(Number(e.target.value));
                  setAttest(false);
                }}
              >
                {claims.map((c, i) => (
                  <option key={c.id} value={i}>
                    {i + 1}. {c.text.slice(0, 80)}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-sm">{claim.text}</p>
            <p className="text-xs">
              Status:{" "}
              {claim.status === "lecturer-reviewed" && !claimReviewIsCurrent(deck, claim)
                ? "stale — source or evidence changed; review again"
                : claim.status}{" "}
              · {claim.evidence.length} evidence link(s)
            </p>
            {claim.evidence.map((e, i) => (
              <blockquote key={i} className="border-l-2 pl-2 text-xs">
                <p>{e.quote}</p>
                <p>
                  {e.locator} · {e.access}
                </p>
                <a className="underline" href={e.sourceUrl} target="_blank" rel="noreferrer">
                  Original source
                </a>
              </blockquote>
            ))}
            <label className="block text-xs">
              Saved authoritative source (optional)
              <select
                aria-label="Saved claim source"
                className="mt-1 w-full rounded border bg-elevated p-2"
                value={deck.sourceDocuments?.find((d) => d.url === url)?.id || ""}
                onChange={(e) => {
                  const d = deck.sourceDocuments?.find((d) => d.id === e.target.value);
                  if (d) {
                    setUrl(d.url);
                    setLocator(d.locator);
                    setAccess(d.access);
                    setQuote("");
                    setAttest(false);
                  }
                }}
              >
                <option value="">Choose a saved source</option>
                {deck.sourceDocuments?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs">
              Evidence access
              <select
                aria-label="Evidence access"
                className="mt-1 w-full rounded border bg-elevated p-2"
                value={access}
                onChange={(e) => {
                  setAccess(e.target.value as typeof access);
                  setAttest(false);
                }}
              >
                {["abstract", "full-text", "textbook", "guideline", "instructor"].map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs">
              Source URL
              <input
                aria-label="Claim source URL"
                className="mt-1 w-full rounded border bg-elevated p-2"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setAttest(false);
                }}
                placeholder="https://doi.org/... or authoritative chapter"
              />
            </label>
            <label className="block text-xs">
              Exact supporting passage
              <textarea
                aria-label="Supporting passage"
                className="mt-1 w-full rounded border bg-elevated p-2"
                value={quote}
                onChange={(e) => {
                  setQuote(e.target.value);
                  setAttest(false);
                }}
              />
            </label>
            <label className="block text-xs">
              Page / section / paragraph
              <input
                aria-label="Evidence locator"
                className="mt-1 w-full rounded border bg-elevated p-2"
                value={locator}
                onChange={(e) => {
                  setLocator(e.target.value);
                  setAttest(false);
                }}
              />
            </label>
            <label className="block text-xs">
              Knowledge classification
              <select
                className="mt-1 w-full rounded border bg-elevated p-2"
                value={classification}
                onChange={(e) => {
                  setClassification(e.target.value as Claim["classification"]);
                  setAttest(false);
                }}
              >
                {["unclassified", "foundational", "study-result", "guideline"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="flex gap-2 text-xs">
              <input
                type="checkbox"
                checked={attest}
                onChange={(e) => setAttest(e.target.checked)}
              />
              I checked that this passage supports the exact statement, qualifiers and scientific
              context.
            </label>
            <Button
              size="sm"
              disabled={!attest || slide.locked}
              onClick={() => {
                try {
                  const parsed = new URL(url);
                  if (!/^https?:$/.test(parsed.protocol)) throw Error();
                  if (quote.trim().length < 20 || !locator.trim()) throw Error();
                  const savedSource = deck.sourceDocuments?.find((d) => d.url === parsed.href);
                  if (
                    savedSource &&
                    !savedSource.text
                      .replace(/\s+/g, " ")
                      .includes(quote.trim().replace(/\s+/g, " "))
                  )
                    throw Error("The quoted passage is not present in the saved source.");
                  patch(index, {
                    claims: claims.map((c) =>
                      c.id === claim.id
                        ? attestClaim(deck, {
                            ...c,
                            classification,
                            status: "lecturer-reviewed",
                            reviewedAt: Date.now(),
                            evidence: [
                              ...c.evidence,
                              {
                                sourceUrl: parsed.href,
                                quote: quote.trim(),
                                locator: locator.trim(),
                                access: savedSource?.access || access,
                                checkedAt: Date.now(),
                              },
                            ],
                          })
                        : c,
                    ),
                  });
                  setAttest(false);
                  toast.success("Lecturer review recorded for this statement.");
                } catch (e) {
                  toast.error(
                    e instanceof Error && e.message
                      ? e.message
                      : "Provide an HTTP(S) source, supporting passage (20+ characters), and locator.",
                  );
                }
              }}
            >
              Record reviewed evidence
            </Button>
            {claim.evidence.length > 0 && (
              <Button
                size="sm"
                variant="secondary"
                disabled={!attest || slide.locked}
                onClick={() => {
                  patch(index, {
                    claims: claims.map((c) =>
                      c.id === claim.id
                        ? attestClaim(deck, {
                            ...c,
                            status: "lecturer-reviewed",
                            reviewedAt: Date.now(),
                          })
                        : c,
                    ),
                  });
                  setAttest(false);
                }}
              >
                Confirm existing evidence
              </Button>
            )}
          </>
        ) : (
          <p className="text-xs">
            This opening slide contains structural metadata. Select a content slide to inspect its
            factual statements.
          </p>
        )}
      </section>
      <SurfaceEvidenceEditor />
    </>
  );
}
