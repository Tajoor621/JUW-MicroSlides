import { useState } from "react";
import { toast } from "sonner";
import { useDeckStore } from "@/lib/deck-store";
import {
  authoritativePublisher,
  fetchPublisherPage,
  guidanceNeedsReview,
  SOURCE_PORTALS,
  sourceDocumentSchema,
  type SourceDocument,
} from "@/lib/source-documents";
import { writeLocalRecord } from "@/lib/durable-storage";
import { Button } from "./ui/button";
export function SourceLibrary() {
  const deck = useDeckStore((s) => s.deck());
  const [url, setUrl] = useState(""),
    [title, setTitle] = useState(""),
    [passage, setPassage] = useState(""),
    [locator, setLocator] = useState("");
  const [license, setLicense] = useState(""),
    [date, setDate] = useState(""),
    [jurisdiction, setJurisdiction] = useState("");
  const [access, setAccess] = useState<SourceDocument["access"]>("textbook"),
    [busy, setBusy] = useState(false),
    [fetched, setFetched] = useState(false);
  const [current, setCurrent] = useState(false);
  if (!deck) return null;
  const input = "mt-1 block min-h-11 w-full rounded border border-border bg-elevated p-2 text-xs";
  async function save() {
    if (!deck) return;
    try {
      const publisher = authoritativePublisher(url);
      const doc = sourceDocumentSchema.parse({
        id: crypto.randomUUID(),
        title,
        url,
        publisher,
        text: passage,
        locator,
        license,
        publishedDate: date,
        jurisdiction,
        access,
        retrievedAt: Date.now(),
        acquisition: fetched ? "publisher-html" : "lecturer-import",
        ...(current && access === "guideline" ? { currencyConfirmedAt: Date.now() } : {}),
      });
      if (guidanceNeedsReview(doc))
        throw Error(
          "For guidance, record version/publication date and jurisdiction, and confirm current status on the publisher's site.",
        );
      const documents = [...(deck.sourceDocuments || []).filter((d) => d.url !== url), doc];
      if (documents.length > 30)
        throw Error("Maximum 30 documents per deck. Remove unused documents first.");
      await writeLocalRecord("teaching-source-library", JSON.stringify(documents));
      useDeckStore.getState().patchDeck({ sourceDocuments: documents });
      setPassage("");
      setTitle("");
      setUrl("");
      setFetched(false);
      setCurrent(false);
      toast.success(
        "Source saved for offline review and future research generation. Claims still require explicit review.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save source");
    }
  }
  return (
    <details className="space-y-3 rounded border border-border p-3">
      <summary className="cursor-pointer text-sm font-medium">Authoritative source library</summary>
      <p className="text-xs text-muted">
        Save permitted textbook, guideline or article passages with exact attribution. Publisher
        identity is checked by hostname; imported text is lecturer supplied. Guidance currency is a
        lecturer declaration, not automated clinical verification.
      </p>
      <div className="flex flex-wrap gap-3">
        {SOURCE_PORTALS.map((p) => (
          <a
            key={p.url}
            className="text-xs underline"
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {p.title}
          </a>
        ))}
      </div>
      <label className="block text-xs">
        Publisher source URL
        <input
          aria-label="Source document URL"
          className={input}
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setFetched(false);
            setCurrent(false);
          }}
        />
      </label>
      <Button
        size="sm"
        disabled={busy || !url}
        variant="secondary"
        onClick={async () => {
          setBusy(true);
          try {
            setPassage(await fetchPublisherPage(url));
            setFetched(true);
            toast.message("Inspect the extracted text and add its title, locator and reuse terms.");
          } catch (e) {
            toast.error(
              e instanceof Error
                ? e.message
                : "Publisher fetch blocked. Paste a permitted passage.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Reading publisher page…" : "Read open HTML page"}
      </Button>
      <label className="block text-xs">
        Source title
        <input
          aria-label="Source document title"
          className={input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="block text-xs">
        Source type
        <select
          aria-label="Source document type"
          className={input}
          value={access}
          onChange={(e) => setAccess(e.target.value as SourceDocument["access"])}
        >
          <option value="textbook">Textbook</option>
          <option value="guideline">Guideline</option>
          <option value="full-text">Research full text</option>
        </select>
      </label>
      <label className="block text-xs">
        Chapter, section or paragraph locator
        <input
          aria-label="Source locator"
          className={input}
          value={locator}
          onChange={(e) => setLocator(e.target.value)}
        />
      </label>
      <label className="block text-xs">
        Permitted source passage
        <textarea
          aria-label="Source document passage"
          className={input}
          rows={5}
          maxLength={120000}
          value={passage}
          onChange={(e) => {
            setPassage(e.target.value);
            setFetched(false);
          }}
        />
      </label>
      <label className="block text-xs">
        Licence / reuse terms
        <input
          aria-label="Source reuse terms"
          className={input}
          value={license}
          onChange={(e) => setLicense(e.target.value)}
        />
      </label>
      <label className="block text-xs">
        Publication date / version
        <input
          aria-label="Source publication version"
          className={input}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setCurrent(false);
          }}
        />
      </label>
      {access === "guideline" && (
        <>
          <label className="block text-xs">
            Applicable jurisdiction / population
            <input
              aria-label="Guideline jurisdiction"
              className={input}
              value={jurisdiction}
              onChange={(e) => {
                setJurisdiction(e.target.value);
                setCurrent(false);
              }}
            />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={current}
              onChange={(e) => setCurrent(e.target.checked)}
            />
            I checked the publisher's current version and applicable jurisdiction today.
          </label>
        </>
      )}
      <Button size="sm" disabled={busy} onClick={() => void save()}>
        Save attributed source
      </Button>
      <ul className="space-y-3">
        {deck.sourceDocuments?.map((d) => (
          <li key={d.id} className="space-y-2 border-t border-border pt-2 text-xs">
            <a className="underline" href={d.url} target="_blank" rel="noopener noreferrer">
              {d.title}
            </a>
            <p>
              {d.publisher} · {d.access} · {d.acquisition} ·{" "}
              {new Date(d.retrievedAt).toLocaleDateString()}
            </p>
            <p>
              {d.locator} · {d.license}
            </p>
            {guidanceNeedsReview(d) && (
              <p className="text-danger">Guidance currency requires renewed confirmation.</p>
            )}
            <details>
              <summary className="cursor-pointer">Read saved passage</summary>
              <p className="whitespace-pre-wrap">{d.text}</p>
            </details>
            <div className="flex flex-wrap gap-2">
              {d.access === "guideline" && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const docs = deck.sourceDocuments!.map((x) =>
                      x.id === d.id ? { ...x, currencyConfirmedAt: Date.now() } : x,
                    );
                    useDeckStore.getState().patchDeck({ sourceDocuments: docs });
                    toast.message(
                      "Publisher currency confirmed by lecturer; this does not certify claim accuracy.",
                    );
                  }}
                >
                  Confirm publisher version today
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  const docs = deck.sourceDocuments!.filter((x) => x.id !== d.id);
                  await writeLocalRecord("teaching-source-library", JSON.stringify(docs));
                  useDeckStore.getState().patchDeck({ sourceDocuments: docs });
                }}
              >
                Remove source
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
