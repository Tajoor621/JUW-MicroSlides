import { useEffect, useState } from "react";
import { JUW } from "@/lib/brand";
import { formatCitation } from "@/lib/citations";
import { fallbackVisual } from "@/lib/media-catalog";
import { themeOf, themeVars, type SlideTheme } from "@/lib/slide-themes";
import type { CitationStyle, Deck, DeckMetaPatch, MediaItem, Slide } from "@/lib/types";
import { cn, mediaDisplaySrc } from "@/lib/utils";

export function SlideView({
  slide,
  deck,
  index,
  total,
  citationStyle,
  className,
  present = false,
  editable = false,
  onPatch,
  onPatchDeck,
}: {
  slide: Slide;
  deck?: Deck | null;
  index: number;
  total: number;
  citationStyle: CitationStyle;
  className?: string;
  present?: boolean;
  editable?: boolean;
  onPatch?: (patch: Partial<Slide>) => void;
  onPatchDeck?: (patch: DeckMetaPatch) => void;
}) {
  const media = slide.layout === "title" ? undefined : slide.media[0];
  const canEdit = editable && !present;
  const course = deck?.course || JUW.course;
  const courseCode = deck?.courseCode || JUW.courseCode;
  const preparedBy = deck?.preparedBy || JUW.preparedBy;
  const department = deck?.department || JUW.department;
  const isTitle = slide.layout === "title";
  const tokens = themeOf(isTitle ? "classic" : slide.theme);

  return (
    <article
      className={cn(
        "slide-stage relative flex h-full w-full flex-col overflow-hidden rounded-sm",
        className,
      )}
      data-slide-stage
      style={themeVars(isTitle ? "classic" : slide.theme)}
    >
      <div
        className="flex h-full min-h-0 flex-col border-[3px] p-1.5 sm:p-2"
        style={{ borderColor: tokens.frame, background: tokens.band }}
      >
        <div
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-[3px]"
          style={{ borderColor: tokens.frame, background: tokens.slide, color: tokens.ink }}
        >
          {!isTitle ? (
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-2"
              style={{ background: tokens.accent }}
            />
          ) : null}
          {!isTitle ? <ThemeMotif theme={tokens.id} /> : null}
          <div className="slide-brand-row relative z-[1] flex shrink-0 items-start justify-between gap-3 px-3 pt-3 sm:px-4 sm:pt-3.5">
            <img
              src={JUW.crest}
              alt="Jinnah University for Women"
              className="h-16 w-16 object-contain sm:h-20 sm:w-20"
            />
            {isTitle ? (
              <img
                src={JUW.microscope}
                alt="Department of Microbiology, JUW"
                className="h-[6.25rem] w-auto max-w-[12.5rem] bg-transparent object-contain sm:h-[7.25rem]"
              />
            ) : (
              <span
                className="max-w-[9rem] rounded-sm border px-2 py-1 text-right text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] sm:max-w-none sm:text-[11px]"
                style={{ borderColor: tokens.accent, background: tokens.band, color: tokens.navy }}
              >
                {tokens.label}
              </span>
            )}
          </div>

          {isTitle ? (
            <div className="slide-title-body relative z-[1] flex min-h-0 flex-1 flex-col px-5 pb-4 sm:px-10">
              <div className="flex flex-1 flex-col items-center justify-center">
                <EditableText
                  value={slide.title}
                  onChange={(title) => onPatch?.({ title })}
                  disabled={!canEdit}
                  placeholder="Lecture title"
                  multiline
                  className={cn(
                    "slide-title-text w-full text-center font-serif font-bold uppercase leading-tight text-ink",
                    slide.title.length > 55 && "slide-title-long",
                  )}
                />
              </div>
              <div className="slide-course-meta ml-auto max-w-[70%] text-right">
                <div className="mb-2.5 ml-auto h-1 w-9 bg-accent" />
                <EditableText
                  value={course}
                  onChange={(value) => onPatchDeck?.({ course: value })}
                  disabled={!canEdit}
                  placeholder="Course name"
                  className="text-[10px] font-medium uppercase leading-snug tracking-wide text-ink sm:text-xs"
                />
                <EditableText
                  value={courseCode}
                  onChange={(value) => onPatchDeck?.({ courseCode: value })}
                  disabled={!canEdit}
                  placeholder="Course code"
                  className="text-[10px] font-medium uppercase leading-snug tracking-wide text-ink sm:text-xs"
                />
                <div className="mt-1.5 text-[10px] font-medium uppercase leading-snug tracking-wide text-ink sm:text-xs">
                  {canEdit ? (
                    <label className="block">
                      <span className="text-ink-muted">Prepared by: </span>
                      <input
                        value={preparedBy}
                        onChange={(e) => onPatchDeck?.({ preparedBy: e.target.value })}
                        className="w-[min(100%,12rem)] bg-transparent text-right uppercase outline-none hover:bg-navy/5 focus:bg-navy/5 focus:ring-2 focus:ring-accent/30"
                      />
                    </label>
                  ) : (
                    <p>Prepared by: {preparedBy}</p>
                  )}
                </div>
                <EditableText
                  value={department}
                  onChange={(value) => onPatchDeck?.({ department: value })}
                  disabled={!canEdit}
                  placeholder="Department"
                  className="text-[10px] font-medium uppercase leading-snug tracking-wide text-ink sm:text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="relative z-[1] flex min-h-0 flex-1 flex-col px-5 pb-3 sm:px-8 sm:pb-4">
              <EditableText
                value={slide.title}
                onChange={(title) => onPatch?.({ title })}
                disabled={!canEdit}
                placeholder="Slide title"
                className="font-serif text-lg font-semibold leading-snug text-navy sm:text-2xl"
              />
              {(canEdit || slide.subtitle) && (
                <EditableText
                  value={slide.subtitle}
                  onChange={(subtitle) => onPatch?.({ subtitle })}
                  disabled={!canEdit}
                  placeholder={canEdit ? "Optional subtitle" : ""}
                  className="mt-0.5 text-sm text-ink-muted"
                />
              )}

              <div
                className={cn(
                  "mt-3 min-h-0 flex-1",
                  slide.layout === "two-column" && "grid gap-4 sm:grid-cols-2",
                )}
              >
                {slide.layout === "two-column" ? (
                  <>
                    <BulletList
                      items={slide.leftBullets}
                      present={present}
                      editable={canEdit}
                      onChange={(leftBullets) => onPatch?.({ leftBullets })}
                    />
                    <BulletList
                      items={slide.rightBullets}
                      present={present}
                      editable={canEdit}
                      onChange={(rightBullets) => onPatch?.({ rightBullets })}
                    />
                    {media ? (
                      <SlideMedia
                        media={media}
                        className="overflow-hidden rounded-sm border border-navy/10 bg-navy/5 sm:col-span-2"
                        imgClass="max-h-32 w-full object-cover"
                        caption={`${media.title} · ${media.credit} · ${media.license}`}
                      />
                    ) : null}
                  </>
                ) : (
                  <div className={cn("flex h-full gap-5", media && "flex-col sm:flex-row")}>
                    {slide.layout !== "full-image" && (
                      <div className="min-w-0 flex-1">
                        <BulletList
                          items={slide.bullets}
                          present={present}
                          editable={canEdit}
                          onChange={(bullets) => onPatch?.({ bullets })}
                        />
                      </div>
                    )}
                    {media ? (
                      <SlideMedia
                        media={media}
                        className={cn(
                          "overflow-hidden rounded-sm border border-navy/10 bg-navy/5",
                          slide.layout === "full-image" ? "flex-1" : "sm:w-[42%]",
                        )}
                        imgClass="h-full max-h-52 w-full object-cover sm:max-h-full"
                        caption={`${media.title} · ${media.credit} · ${media.license}`}
                      />
                    ) : null}
                    {slide.layout === "full-image" && (slide.bullets.length > 0 || canEdit) ? (
                      <BulletList
                        items={slide.bullets}
                        present={present}
                        editable={canEdit}
                        onChange={(bullets) => onPatch?.({ bullets })}
                      />
                    ) : null}
                    {slide.layout === "blank" && canEdit && !slide.bullets.length ? (
                      <BulletList
                        items={[]}
                        present={present}
                        editable
                        onChange={(bullets) => onPatch?.({ bullets })}
                      />
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}

          {slide.citations.length > 0 && slide.layout !== "title" && (
            <footer className="relative z-[1] border-t border-navy/10 px-5 py-1.5 text-[10px] leading-snug text-ink-muted sm:px-8">
              {slide.citations
                .slice(0, 2)
                .map((c) => formatCitation(c, citationStyle))
                .join("  ·  ")}
            </footer>
          )}

          {slide.layout !== "title" && (
            <span className="pointer-events-none absolute bottom-1.5 left-3 z-[1] font-mono text-[9px] tabular-nums text-ink-muted">
              {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function ThemeMotif({ theme }: { theme: SlideTheme }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full text-accent opacity-50"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMaxYMin slice"
      aria-hidden
    >
      {theme === "gram" ? (
        <>
          <ellipse
            cx="1380"
            cy="160"
            rx="78"
            ry="18"
            transform="rotate(-28 1380 160)"
            fill="currentColor"
          />
          <ellipse
            cx="1488"
            cy="210"
            rx="54"
            ry="16"
            transform="rotate(18 1488 210)"
            fill="currentColor"
          />
          <ellipse cx="1320" cy="260" rx="22" ry="22" fill="currentColor" />
          <ellipse cx="1360" cy="268" rx="22" ry="22" fill="currentColor" />
          <ellipse
            cx="1500"
            cy="320"
            rx="70"
            ry="16"
            transform="rotate(-12 1500 320)"
            fill="currentColor"
          />
          <ellipse cx="1410" cy="390" rx="20" ry="20" fill="currentColor" />
          <ellipse cx="1452" cy="398" rx="20" ry="20" fill="currentColor" />
          <ellipse
            cx="1348"
            cy="470"
            rx="62"
            ry="15"
            transform="rotate(32 1348 470)"
            fill="currentColor"
          />
        </>
      ) : null}
      {theme === "culture" ? (
        <>
          <circle cx="1480" cy="220" r="150" fill="none" stroke="currentColor" strokeWidth="10" />
          <circle cx="1480" cy="220" r="108" fill="none" stroke="currentColor" strokeWidth="6" />
          <circle cx="1480" cy="220" r="64" fill="none" stroke="currentColor" strokeWidth="4" />
          <circle cx="1436" cy="188" r="14" fill="currentColor" />
          <circle cx="1518" cy="236" r="10" fill="currentColor" />
          <circle cx="1460" cy="268" r="8" fill="currentColor" />
          <circle cx="1528" cy="168" r="7" fill="currentColor" />
        </>
      ) : null}
      {theme === "fluorescence" ? (
        <>
          <circle cx="1480" cy="180" r="120" fill="currentColor" opacity="0.25" />
          <circle cx="1360" cy="300" r="18" fill="currentColor" />
          <circle cx="1500" cy="260" r="10" fill="currentColor" />
          <circle cx="1420" cy="140" r="8" fill="currentColor" />
          <circle cx="1540" cy="340" r="14" fill="currentColor" />
          <circle cx="1300" cy="200" r="6" fill="currentColor" />
          <circle cx="1470" cy="420" r="9" fill="currentColor" />
        </>
      ) : null}
      {theme === "molecular" ? (
        <>
          <rect x="1420" y="120" width="140" height="16" fill="currentColor" />
          <rect x="1440" y="160" width="100" height="12" fill="currentColor" />
          <rect x="1410" y="196" width="160" height="14" fill="currentColor" />
          <rect x="1460" y="236" width="70" height="12" fill="currentColor" />
          <rect x="1430" y="276" width="120" height="14" fill="currentColor" />
          <rect x="1475" y="316" width="50" height="12" fill="currentColor" />
          <rect x="1420" y="356" width="140" height="14" fill="currentColor" />
          <path
            d="M1320 480 c40-40 80 40 120 0 s80 40 120 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
          />
          <path
            d="M1320 520 c40 40 80-40 120 0 s80-40 120 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
          />
        </>
      ) : null}
      {theme === "clinical" ? (
        <>
          <rect x="1468" y="130" width="28" height="110" fill="currentColor" />
          <rect x="1426" y="172" width="112" height="28" fill="currentColor" />
          <circle cx="1360" cy="320" r="16" fill="currentColor" opacity="0.7" />
          <circle cx="1520" cy="360" r="10" fill="currentColor" opacity="0.7" />
          <circle cx="1440" cy="410" r="7" fill="currentColor" opacity="0.7" />
        </>
      ) : null}
      {theme === "mycology" ? (
        <>
          <path
            d="M1480 120 C1460 200 1500 240 1470 320 C1440 390 1500 430 1480 520"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
          />
          <path
            d="M1470 220 C1410 240 1390 280 1360 330"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
          />
          <path
            d="M1484 280 C1540 300 1560 340 1580 390"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
          />
          <path
            d="M1476 360 C1420 390 1410 430 1380 470"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
          />
          <circle cx="1360" cy="330" r="8" fill="currentColor" />
          <circle cx="1580" cy="390" r="8" fill="currentColor" />
          <circle cx="1380" cy="470" r="7" fill="currentColor" />
          <circle cx="1480" cy="520" r="10" fill="currentColor" />
        </>
      ) : null}
      {theme === "outbreak" ? (
        <>
          <circle cx="1380" cy="180" r="10" fill="currentColor" />
          <circle cx="1500" cy="150" r="8" fill="currentColor" />
          <circle cx="1540" cy="260" r="12" fill="currentColor" />
          <circle cx="1420" cy="300" r="9" fill="currentColor" />
          <circle cx="1480" cy="400" r="11" fill="currentColor" />
          <circle cx="1340" cy="360" r="7" fill="currentColor" />
          <circle cx="1560" cy="360" r="7" fill="currentColor" />
          <path
            d="M1380 180 L1500 150 L1540 260 L1420 300 L1380 180 M1420 300 L1480 400 L1340 360 L1420 300 M1540 260 L1560 360 L1480 400"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
          />
        </>
      ) : null}
      {theme === "parasitology" ? (
        <>
          <ellipse
            cx="1460"
            cy="180"
            rx="70"
            ry="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
          />
          <ellipse cx="1460" cy="180" rx="22" ry="10" fill="currentColor" />
          <circle cx="1520" cy="300" r="16" fill="currentColor" />
          <circle cx="1388" cy="340" r="10" fill="currentColor" />
          <path
            d="M1320 430 C1400 400 1500 460 1580 420"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
          />
        </>
      ) : null}
      {theme === "phycology" ? (
        <>
          <ellipse cx="1480" cy="200" rx="36" ry="70" fill="currentColor" opacity="0.35" />
          <ellipse cx="1380" cy="280" rx="22" ry="48" fill="currentColor" opacity="0.45" />
          <ellipse cx="1560" cy="300" rx="18" ry="40" fill="currentColor" opacity="0.4" />
          <circle cx="1480" cy="200" r="8" fill="currentColor" />
          <circle cx="1380" cy="280" r="5" fill="currentColor" />
          <path d="M1440 380 H1560" stroke="currentColor" strokeWidth="4" />
          <path d="M1460 400 H1540" stroke="currentColor" strokeWidth="3" />
          <path d="M1480 420 H1520" stroke="currentColor" strokeWidth="3" />
        </>
      ) : null}
    </svg>
  );
}

function SlideMedia({
  media,
  className,
  imgClass,
  caption,
}: {
  media: MediaItem;
  className?: string;
  imgClass?: string;
  caption?: string;
}) {
  const remote = mediaDisplaySrc(media.src);
  const local = remote.startsWith("data:") || remote.startsWith("/") || remote.startsWith("blob:");
  const [src, setSrc] = useState(() => (local ? remote : fallbackVisual(media.title).src));
  useEffect(() => {
    const display = mediaDisplaySrc(media.src);
    if (display.startsWith("data:") || display.startsWith("/") || display.startsWith("blob:")) {
      setSrc(display);
      return;
    }
    const placeholder = fallbackVisual(media.title).src;
    setSrc(placeholder);
    const probe = new Image();
    probe.referrerPolicy = "no-referrer";
    probe.onload = () => setSrc(display);
    probe.src = display;
    return () => {
      probe.onload = null;
      probe.onerror = null;
    };
  }, [media.id, media.src, media.title]);
  return (
    <figure className={className}>
      <img
        src={src}
        alt={media.title}
        className={imgClass}
        referrerPolicy="no-referrer"
        onError={() => {
          if (src.startsWith("data:")) return;
          setSrc(fallbackVisual(media.title).src);
        }}
      />
      {caption ? (
        <figcaption className="truncate px-1.5 py-0.5 text-[8px] text-ink-muted sm:text-[10px]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function EditableText({
  value,
  onChange,
  className,
  placeholder,
  multiline = false,
  disabled = false,
}: {
  value: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  disabled?: boolean;
}) {
  if (disabled) {
    if (!value && !placeholder) return null;
    return <p className={className}>{value}</p>;
  }
  const shared = cn(
    "w-full bg-transparent outline-none placeholder:text-ink-muted/45",
    "rounded-xs transition hover:bg-navy/5 focus:bg-navy/5 focus:ring-2 focus:ring-accent/30",
    className,
  );
  if (multiline) {
    return (
      <textarea
        value={value}
        rows={value.length > 55 ? 3 : 2}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={cn(shared, "resize-none text-center")}
        aria-label={placeholder || "Edit text"}
      />
    );
  }
  return (
    <input
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={shared}
      aria-label={placeholder || "Edit text"}
    />
  );
}

function BulletList({
  items,
  present,
  editable,
  onChange,
}: {
  items: string[];
  present?: boolean;
  editable?: boolean;
  onChange?: (items: string[]) => void;
}) {
  const rows = editable ? [...items, ""] : items;
  if (!rows.length) return null;

  return (
    <ul
      className={cn(
        "space-y-1.5 text-ink",
        present ? "text-lg sm:text-xl" : "text-sm sm:text-base",
      )}
    >
      {rows.map((item, i) => {
        const isAdd = editable && i === items.length;
        return (
          <li key={i} className="flex gap-2.5 leading-relaxed">
            <span
              className={cn(
                "mt-2 size-1.5 shrink-0 rounded-full",
                isAdd ? "bg-accent/40" : "bg-accent",
              )}
            />
            {editable ? (
              <input
                value={item}
                placeholder={isAdd ? "Add a teaching point…" : ""}
                onChange={(e) => {
                  const next = items.slice();
                  if (isAdd) next.push(e.target.value);
                  else next[i] = e.target.value;
                  onChange?.(next);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const next = items.slice();
                    if (isAdd) {
                      if (item.trim()) next.push(item);
                      next.push("");
                    } else {
                      next.splice(i + 1, 0, "");
                    }
                    onChange?.(
                      next.filter((x, idx) => x.trim().length > 0 || idx !== next.length - 1),
                    );
                  }
                  if (e.key === "Backspace" && item === "" && !isAdd) {
                    e.preventDefault();
                    onChange?.(items.filter((_, idx) => idx !== i));
                  }
                }}
                onBlur={() => {
                  if (!isAdd) onChange?.(items.map((x) => x.trim()).filter(Boolean));
                }}
                className="min-h-8 w-full bg-transparent outline-none placeholder:text-ink-muted/40 hover:bg-navy/5 focus:bg-navy/5 focus:ring-2 focus:ring-accent/30"
              />
            ) : (
              <span>{item}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
