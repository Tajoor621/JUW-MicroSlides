import { embedMediaSources } from "@/lib/offline-media";
import { useState } from "react";
import { toast } from "sonner";
import { useDeckStore } from "@/lib/deck-store";
import {
  surfaceItems,
  surfaceSnapshot,
  surfaceReviewProblem,
  type SurfaceReview,
} from "@/lib/surface-review";
import { Button } from "./ui/button";

export function SurfaceEvidenceEditor() {
  const deck = useDeckStore((s) => s.deck()),
    slide = useDeckStore((s) => s.slide());
  if (!deck || !slide) return null;
  // A new context remounts the form so an old checkbox cannot attest edited content.
  return <SurfaceForm key={slide.id + surfaceSnapshot(deck, slide, "form")} />;
}
function SurfaceForm() {
  const deck = useDeckStore((s) => s.deck())!,
    slide = useDeckStore((s) => s.slide())!,
    index = useDeckStore((s) => s.selectedIndex),
    patch = useDeckStore((s) => s.patchSlide);
  const items = surfaceItems(slide);
  const [field, setField] = useState(items[0]?.field || ""),
    [verdict, setVerdict] = useState<SurfaceReview["verdict"]>("supported"),
    [rationale, setRationale] = useState(""),
    [sourceUrl, setSourceUrl] = useState(""),
    [quote, setQuote] = useState(""),
    [locator, setLocator] = useState(""),
    [attest, setAttest] = useState(false),
    [capturing, setCapturing] = useState(false);
  const item = items.find((i) => i.field === field);
  if (!item) return null;
  const previous = slide.surfaceReviews?.find((r) => r.field === field);
  const problem = surfaceReviewProblem(deck, slide, field, previous);
  const inputClass = "mt-1 min-h-11 w-full rounded border border-border bg-elevated p-2";
  return (
    <section className="space-y-3 rounded border border-border p-3">
      <h3 className="font-semibold">Headings, notes and figures</h3>
      <p className="text-xs text-muted">
        Review scientific statements outside the bullets, including captions and the actual figure.
        Nonfactual labels need an explicit explanation. This records lecturer review, not
        independent certification.
      </p>
      <label className="block text-xs">
        Field to review
        <select
          aria-label="Additional evidence field"
          className={inputClass}
          value={field}
          onChange={(e) => {
            setField(e.target.value);
            setVerdict("supported");
            setRationale("");
            setSourceUrl("");
            setQuote("");
            setLocator("");
            setAttest(false);
          }}
        >
          {items.map((i) => (
            <option key={i.field} value={i.field}>
              {i.field}: {i.text.slice(0, 70)}
            </option>
          ))}
        </select>
      </label>
      <p className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs">{item.text}</p>
      <p role="status" className="text-xs">
        {problem || "Current lecturer decision recorded."}
      </p>
      {item.media && (
        <fieldset className="space-y-2" disabled={slide.locked || capturing}>
          <legend className="text-xs font-semibold">Figure attribution and reuse terms</legend>
          {!slide.media[Number(field.split(".")[1])].src.startsWith("data:image/") && (
            <Button
              size="sm"
              disabled={capturing}
              onClick={async () => {
                const mediaIndex = Number(field.split(".")[1]),
                  media = slide.media[mediaIndex];
                setCapturing(true);
                try {
                  const embedded = await embedMediaSources([media.src]);
                  const captured = embedded.results.get(media.src);
                  if (!captured)
                    throw Error(
                      "Cannot capture this image. Import a local PNG, JPEG, GIF or WebP, or reopen an embedded portable project before reviewing it.",
                    );
                  const live = useDeckStore.getState();
                  if (
                    live.slide()?.id !== slide.id ||
                    JSON.stringify(live.slide()?.media[mediaIndex]) !== JSON.stringify(media)
                  )
                    throw Error("The selected figure changed; capture it again.");
                  patch(index, {
                    media: slide.media.map((m, i) =>
                      i === mediaIndex
                        ? { ...m, src: captured, originalSrc: m.originalSrc || m.src }
                        : m,
                    ),
                  });
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Image capture failed.");
                } finally {
                  setCapturing(false);
                }
              }}
            >
              {capturing ? "Saving image…" : "Save figure snapshot for review"}
            </Button>
          )}

          {(["source", "credit", "license"] as const).map((property) => (
            <label key={property} className="block text-xs">
              {property === "source"
                ? "Figure original source"
                : property === "credit"
                  ? "Figure creator"
                  : "Figure reuse terms"}
              <input
                aria-label={`Figure ${property === "license" ? "licence" : property}`}
                className={inputClass}
                defaultValue={slide.media[Number(field.split(".")[1])][property]}
                onBlur={(event) => {
                  const value = event.target.value.trim(),
                    mediaIndex = Number(field.split(".")[1]);
                  if (value === slide.media[mediaIndex][property]) return;
                  patch(index, {
                    media: slide.media.map((m, i) =>
                      i === mediaIndex ? { ...m, [property]: value } : m,
                    ),
                  });
                }}
              />
            </label>
          ))}
        </fieldset>
      )}
      <label className="block text-xs">
        Decision
        <select
          aria-label="Additional evidence decision"
          className={inputClass}
          value={verdict}
          onChange={(e) => {
            setVerdict(e.target.value as typeof verdict);
            setAttest(false);
          }}
        >
          <option value="supported">Factual content — source support checked</option>
          {!item.media && (
            <option value="not-factual">Nonfactual label or administrative text</option>
          )}
        </select>
      </label>
      <label className="block text-xs">
        Review rationale (at least 20 characters)
        <textarea
          aria-label="Additional review rationale"
          className={inputClass}
          value={rationale}
          onChange={(e) => {
            setRationale(e.target.value);
            setAttest(false);
          }}
        />
      </label>
      {(verdict === "supported" || item.media) && (
        <>
          <label className="block text-xs">
            Original HTTPS source
            <input
              aria-label="Additional source URL"
              className={inputClass}
              value={sourceUrl}
              onChange={(e) => {
                setSourceUrl(e.target.value);
                setAttest(false);
              }}
            />
          </label>
          <label className="block text-xs">
            Exact supporting passage
            <textarea
              aria-label="Additional supporting passage"
              className={inputClass}
              value={quote}
              onChange={(e) => {
                setQuote(e.target.value);
                setAttest(false);
              }}
            />
          </label>
          <label className="block text-xs">
            Page, section or figure locator
            <input
              aria-label="Additional source locator"
              className={inputClass}
              value={locator}
              onChange={(e) => {
                setLocator(e.target.value);
                setAttest(false);
              }}
            />
          </label>
        </>
      )}
      <label className="flex min-h-11 items-center gap-2 text-xs">
        <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} />I
        checked the complete field, scientific context and, for figures, visible labels, relevance
        and reuse terms.
      </label>
      <Button
        size="sm"
        disabled={!attest || slide.locked}
        onClick={() => {
          const record: SurfaceReview = {
            field,
            snapshot: surfaceSnapshot(deck, slide, field),
            verdict,
            rationale: rationale.trim(),
            reviewedAt: Date.now(),
            ...(verdict === "supported"
              ? { sourceUrl: sourceUrl.trim(), quote: quote.trim(), locator: locator.trim() }
              : {}),
          };
          const issue = surfaceReviewProblem(deck, slide, field, record);
          if (issue) {
            toast.error(issue);
            return;
          }
          patch(index, {
            surfaceReviews: [
              ...(slide.surfaceReviews || []).filter((r) => r.field !== field),
              record,
            ],
          });
          setAttest(false);
          toast.success("Lecturer decision recorded for this field.");
        }}
      >
        Record field review
      </Button>
    </section>
  );
}
