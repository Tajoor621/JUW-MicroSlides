import { MEDIA_TAGS } from "@/lib/lecture-schema";
import { taggedMedia, mediaAttachmentProblem } from "@/lib/lecture-media";
import { ScientificDiagramTools } from "./scientific-diagram-tools";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useDeckStore } from "@/lib/deck-store";
import {
  searchMediaLibrary,
  publicMediaSearchLinks,
  downloadMediaFile,
  type ProviderResult,
} from "@/lib/media-library";
import { searchMedia } from "@/lib/media-catalog";
import { mediaKey, uid } from "@/lib/utils";
import type { MediaItem } from "@/lib/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
export function TopicMediaPanel() {
  const deck = useDeckStore((s) => s.deck());
  const slide = useDeckStore((s) => s.slide());
  const attach = useDeckStore((s) => s.attachMedia);
  const remove = useDeckStore((s) => s.removeMedia);
  const [query, setQuery] = useState(deck?.topic || "");
  const [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState<ProviderResult[]>([]);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [link, setLink] = useState("");
  const [downloading, setDownloading] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    setQuery(deck?.topic || "");
    setProviders([]);
    setPage(1);
    return () => request.current?.abort();
  }, [deck?.id, deck?.topic]);
  async function search(nextPage = 1) {
    if (!deck) return;
    request.current?.abort();
    const ctrl = new AbortController();
    request.current = ctrl;
    const deckId = deck.id;
    setBusy(true);
    try {
      const result = await searchMediaLibrary(query, nextPage, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setProviders(result.providers);
      setPage(nextPage);
      useDeckStore.setState((s) => ({
        library: s.library.map((d) =>
          d.id === deckId
            ? {
                ...d,
                mediaPool: [
                  ...new Map(
                    [...(d.mediaPool || []), ...result.items].map((m) => [
                      mediaKey(m.originalSrc || m.src),
                      m,
                    ]),
                  ).values(),
                ].slice(-200),
                updatedAt: Date.now(),
              }
            : d,
        ),
      }));
      if (!result.items.length)
        toast.message(
          "No direct files were returned. Use the public search links below or refine the topic.",
        );
    } catch (e) {
      if (!ctrl.signal.aborted)
        toast.error(e instanceof Error ? e.message : "Media search unavailable.");
    } finally {
      if (request.current === ctrl) setBusy(false);
    }
  }
  // Opening the Media tab is the user action that starts public-provider lookup.
  useEffect(() => {
    if (deck && !deck.mediaPool.length && navigator.onLine) void search(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck?.id]);
  const pool = deck?.mediaPool ?? [];
  const displayed = pool.filter((m) =>
    filter === "all" || filter === "video"
      ? filter === "all" || m.kind === "video"
      : filter === "images"
        ? m.kind !== "video"
        : m.provider === filter,
  );
  const catalog = deck
    ? searchMedia(deck.topic, 8, new Set()).filter((m) =>
        m.keywords.some((k) => deck.topic.toLowerCase().includes(k.toLowerCase())),
      )
    : [];
  async function download(m: MediaItem) {
    setDownloading(m.id);
    try {
      await downloadMediaFile(m);
    } catch (e) {
      toast.message(
        e instanceof Error ? e.message : "Download blocked by the host; open the source.",
      );
    } finally {
      setDownloading("");
    }
  }
  if (!deck || !slide) return <p>Select a deck and a slide.</p>;
  return (
    <div className="space-y-4">
      <ScientificDiagramTools />
      <div className="rounded border border-border bg-elevated p-3">
        <h3 className="font-serif text-base">Research media collection</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Search topic-related images and videos. Nothing is added to a slide automatically. Review
          the original caption and licence, then attach an image yourself.
        </p>
      </div>
      <label className="block text-xs">
        Research topic or figure description
        <Input
          aria-label="Research media query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void search();
          }}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="accent" disabled={busy} onClick={() => void search()}>
          {busy ? "Searching…" : "Find media"}
        </Button>
        {busy ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              request.current?.abort();
              setBusy(false);
            }}
          >
            Cancel
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => void search(page + 1)}>
            More results
          </Button>
        )}
      </div>
      {providers.length > 0 && (
        <ul className="space-y-1 text-xs text-muted">
          {providers.map((p) => (
            <li key={p.provider}>
              {p.provider}:{" "}
              {p.error ? `unavailable (${p.error})` : `${p.items.length} files returned`}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">
        Results are candidates, not verified scientific evidence. Up to 72 direct files are
        requested per page; availability varies. The last 200 collected files stay with this deck.
      </p>
      <label className="block text-xs">
        Show
        <select
          aria-label="Filter media"
          className="mt-1 block min-h-11 w-full rounded border border-border bg-elevated p-2"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All collected files ({pool.length})</option>
          <option value="images">Images</option>
          <option value="video">Videos</option>
        </select>
      </label>
      {slide.media.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-medium">Attached to this slide</h4>
          {slide.media.map((m) => (
            <div key={m.id} className="rounded border border-border p-2 text-xs">
              <p>{m.title}</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  useDeckStore.getState().patchSlide(useDeckStore.getState().selectedIndex, {
                    media: [m, ...slide.media.filter((x) => x.id !== m.id)],
                    teaching: slide.teaching
                      ? {
                          ...slide.teaching,
                          diagram: undefined,
                          altText: "",
                          labels: [],
                          scaleBar: undefined,
                          legend: "",
                        }
                      : undefined,
                  })
                }
              >
                Make primary preview
              </Button>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => remove(m.id)}>
                  Remove image
                </Button>
                <Button size="sm" variant="secondary" onClick={() => void download(m)}>
                  Download separately
                </Button>
              </div>
            </div>
          ))}
        </section>
      )}
      {displayed.length === 0 && (
        <p className="text-sm text-muted">
          Your collection is empty. Choose Find media to collect files without inserting them.
        </p>
      )}
      <div className="space-y-3">
        {displayed.map((m) => (
          <MediaCard
            key={m.id}
            item={m}
            attached={slide.media.some((x) => x.id === m.id)}
            downloading={downloading === m.id}
            onDownload={() => void download(m)}
            onAttach={() => {
              if (slide.layout === "title") {
                toast.message(
                  "Keep the introduction focused on its research title. Select a content slide to attach this figure.",
                );
                return;
              }
              if (slide.media.length >= 4) {
                toast.message("Remove a figure first; up to four can be attached to one slide.");
                return;
              }
              attach(m);
              toast.success("Figure attached only to the selected slide.");
            }}
          />
        ))}
      </div>
      <details className="rounded border border-border p-3">
        <summary className="cursor-pointer text-sm">
          Search social platforms and other portals
        </summary>
        <p className="my-2 text-xs text-muted">
          These links open public search pages. They are not scraped or imported automatically;
          platforms may require sign-in. A social post is not proof of the image’s scientific
          accuracy or reuse permission.
        </p>
        <div className="flex flex-wrap gap-2">
          {publicMediaSearchLinks(query || deck.topic).map((l) => (
            <a
              key={l.name}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded border border-border px-2 text-xs underline"
            >
              {l.name}
            </a>
          ))}
        </div>
      </details>
      <section className="space-y-2 rounded border border-border p-3">
        <h4 className="text-sm">Save a public post or media link</h4>
        <Input
          aria-label="Public media or post URL"
          placeholder="https://…"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            try {
              const u = new URL(link);
              if (!["https:", "http:"].includes(u.protocol) || u.username || u.password)
                throw Error();
              const entry = { id: uid("link"), title: u.hostname, url: u.href };
              if (/\.(png|jpe?g|gif|webp|svg|mp4|webm|ogv)(?:$|\?)/i.test(u.href)) {
                const item: MediaItem = {
                  id: uid("media"),
                  title: decodeURIComponent(u.pathname.split("/").pop() || u.hostname),
                  kind: /\.(mp4|webm|ogv)(?:$|\?)/i.test(u.href) ? "video" : "photo",
                  src: u.href,
                  originalSrc: u.href,
                  source: u.href,
                  credit: "Creator not supplied",
                  license: "Unknown — verify reuse terms",
                  provider: "User-provided link",
                  keywords: [],
                };
                useDeckStore.setState((s) => ({
                  library: s.library.map((d) =>
                    d.id === deck.id
                      ? {
                          ...d,
                          mediaPool: [item, ...d.mediaPool].slice(0, 200),
                          updatedAt: Date.now(),
                        }
                      : d,
                  ),
                }));
                setLink("");
                toast.message(
                  "Direct file added to the collection only. Inspect and download it before deciding whether to attach.",
                );
                return;
              }
              useDeckStore.setState((s) => ({
                library: s.library.map((d) =>
                  d.id === deck.id
                    ? {
                        ...d,
                        researchLinks: [...(d.researchLinks || []), entry],
                        updatedAt: Date.now(),
                      }
                    : d,
                ),
              }));
              setLink("");
              toast.message("Source link saved. Download its media at the original platform.");
            } catch {
              toast.error("Enter a valid public HTTP(S) URL without credentials.");
            }
          }}
        >
          Save source link
        </Button>
        {deck.researchLinks?.map((l) => (
          <a
            key={l.id}
            className="block break-all text-xs underline"
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {l.title}: {l.url}
          </a>
        ))}
      </section>
      {catalog.length > 0 && (
        <details className="rounded border border-border p-3">
          <summary className="cursor-pointer text-sm">Optional bundled illustrations</summary>
          <p className="my-2 text-xs text-muted">
            Schematic teaching aids, not experimental micrographs. Check that labels match the
            research topic.
          </p>
          {catalog.map((m) => (
            <MediaCard
              key={m.id}
              item={m}
              attached={false}
              downloading={downloading === m.id}
              onDownload={() => void download(m)}
              onAttach={() => {
                if (slide.layout !== "title") attach(m);
                else toast.message("Select a content slide first.");
              }}
            />
          ))}
        </details>
      )}
    </div>
  );
}
function MediaCard({
  item,
  attached,
  downloading,
  onDownload,
  onAttach,
}: {
  item: MediaItem;
  attached: boolean;
  downloading: boolean;
  onDownload: () => void;
  onAttach: () => void;
}) {
  const [failed, setFailed] = useState(false);
  function update(patch: Partial<MediaItem>) {
    useDeckStore.setState((state) => ({
      library: state.library.map((d) =>
        d.id !== state.activeId
          ? d
          : {
              ...d,
              updatedAt: Date.now(),
              mediaPool: d.mediaPool.some((m) => m.id === item.id)
                ? d.mediaPool.map((m) => (m.id === item.id ? { ...m, ...patch } : m))
                : [...d.mediaPool, { ...item, ...patch }],
              slides: d.slides.map((s) => ({
                ...s,
                media: s.media.map((m) => (m.id === item.id ? { ...m, ...patch } : m)),
              })),
            },
      ),
    }));
  }
  return (
    <article className="overflow-hidden rounded border border-border bg-elevated">
      <div className="bg-surface p-2">
        {failed ? (
          <p className="p-4 text-xs text-muted">
            Preview unavailable. Open the source to inspect this file.
          </p>
        ) : item.kind === "video" ? (
          <video
            className="max-h-48 w-full"
            src={item.src}
            controls
            preload="none"
            onError={() => setFailed(true)}
          />
        ) : (
          <img
            draggable
            onDragStart={(e) => e.dataTransfer.setData("application/juw-media", item.id)}
            loading="lazy"
            src={item.src}
            alt={item.title}
            className="max-h-48 w-full object-contain"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <div className="space-y-2 p-3">
        <h4 className="text-sm font-medium leading-snug">{item.title}</h4>
        <label className="block text-xs">
          Scientific media tag
          <select
            className="min-h-11 w-full rounded border bg-elevated p-2"
            value={taggedMedia(item).tags![0]}
            onChange={(e) =>
              update({ tags: [e.target.value as NonNullable<MediaItem["tags"]>[number]] })
            }
          >
            {MEDIA_TAGS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <details>
          <summary className="text-xs">Attribution & reuse terms</summary>
          {(["source", "credit", "license"] as const).map((key) => (
            <label key={key} className="block text-xs">
              {key}
              <input
                className="min-h-11 w-full rounded border bg-elevated p-2"
                value={item[key]}
                onChange={(e) => update({ [key]: e.target.value })}
                maxLength={2000}
              />
            </label>
          ))}
        </details>
        {mediaAttachmentProblem(item) && (
          <p className="text-xs text-muted">{mediaAttachmentProblem(item)}</p>
        )}

        <p className="text-xs text-muted">
          {item.provider || "Provided media"} · {item.credit} · {item.license}
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={/^https?:\/\//.test(item.source) ? item.source : item.originalSrc || item.src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline"
          >
            Original source
          </a>
          {item.licenseUrl && (
            <a
              href={item.licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline"
            >
              Licence
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" disabled={downloading} onClick={onDownload}>
            {downloading ? "Downloading…" : "Download file"}
          </Button>
          {item.kind !== "video" && (
            <Button
              size="sm"
              variant="accent"
              disabled={attached || !!mediaAttachmentProblem(item)}
              onClick={onAttach}
            >
              {attached ? "Attached" : "Attach to selected slide"}
            </Button>
          )}
        </div>
        {item.kind === "video" && (
          <p className="text-xs text-muted">
            Videos are available for separate download; slide rendering and PowerPoint embedding
            support images.
          </p>
        )}
      </div>
    </article>
  );
}
