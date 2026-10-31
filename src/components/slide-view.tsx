import { sourcePresentation } from "@/lib/scientific-presentation";
import { OPENSTAX_ATTRIBUTION } from "@/lib/textbook-concepts";
import { ScientificText } from "./scientific-text";
import { LectureSlideContent } from "./lecture-slide-content";
import { slideEvidenceBasis } from "@/lib/evidence-basis";
import { EvidenceBadge } from "./evidence-badge";
import { teachingReferences } from "@/lib/teaching-bibliography";
import { TeachingContent } from "./teaching-content";
import { teachingOf, methodSlide } from "@/lib/teaching";
import { useDeckStore } from "@/lib/deck-store";
import { useEffect, useRef, useState } from "react";
import { DRAFT_STAMP, EXPERT_STAMP, JUW } from "@/lib/brand";
import { formatCitation } from "@/lib/citations";
import { themeOf, themeVars, type SlideTheme } from "@/lib/slide-themes";
import type { CitationStyle, Deck, DeckMetaPatch, MediaItem, Slide } from "@/lib/types";
import { cn, mediaDisplaySrc } from "@/lib/utils";
import { topicArtworkSvg } from "@/lib/topic-artwork";

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
  revealCount = 999,
  reviewRequired,
  evidenceBasis,
  exportCapture = false,
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
  revealCount?: number;
  reviewRequired?: boolean;
  evidenceBasis?: Record<string, string[]>;
  exportCapture?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    if (!host.current || exportCapture) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / 1280));
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [exportCapture]);
  const basis = evidenceBasis || slideEvidenceBasis(slide);
  const draft = reviewRequired ?? true;
  const media = slide.layout === "title" ? undefined : slide.media[0];
  const canEdit = editable && !present;
  const course = deck?.course ?? JUW.course;
  const courseCode = deck?.courseCode ?? JUW.courseCode;
  const preparedBy = deck?.preparedBy ?? JUW.preparedBy;
  const department = deck?.department ?? JUW.department;
  const isTitle = slide.layout === "title";
  const artwork = topicArtworkSvg(
    deck?.topic ?? slide.title,
    slide.layout === "title" ? "" : slide.title,
  );
  const visualTheme = slide.theme;
  const baseTokens = themeOf(visualTheme);
  const tokens =
    deck?.exportMode === "dark"
      ? {
          ...baseTokens,
          slide: "#0B1520",
          ink: "#F1F5F9",
          navy: "#FFFFFF",
          band: "#17344C",
          muted: "#C5D6E8",
          dark: true,
        }
      : deck?.exportMode === "high-contrast"
        ? {
            ...baseTokens,
            slide: "#FFFFFF",
            ink: "#000000",
            navy: "#000000",
            band: "#FFFFFF",
            muted: "#222222",
            accent: "#000000",
            frame: "#000000",
            dark: false,
          }
        : baseTokens;
  const teaching = teachingOf(slide);
  const teachingLayout = !!slide.teaching;

  return (
    <div
      ref={host}
      className={cn("slide-viewport relative w-full overflow-hidden", className)}
      onDragOver={(e) => {
        if (editable) e.preventDefault();
      }}
      onDrop={(e) => {
        if (!editable) return;
        e.preventDefault();
        const id = e.dataTransfer.getData("application/juw-media");
        const item = deck?.mediaPool.find((m) => m.id === id);
        if (item) useDeckStore.getState().attachMedia(item);
      }}
      style={{ aspectRatio: "16 / 9" }}
    >
      <article
        className={cn(
          "slide-stage relative flex h-full w-full flex-col overflow-hidden rounded-sm",
        )}
        data-slide-stage
        data-slide-theme={visualTheme}
        data-typography={deck?.exportTypography || "original"}
        style={{
          ...themeVars(visualTheme),
          ...{
            "--color-slide": tokens.slide,
            "--color-ink": tokens.ink,
            "--color-navy": tokens.navy,
            "--color-ink-muted": tokens.muted,
            "--color-frame-band": tokens.band,
          },
          width: 1280,
          height: 720,
          position: "absolute",
          transform: `scale(${exportCapture ? 1 : scale})`,
          transformOrigin: "top left",
        }}
      >
        <div
          className="flex h-full min-h-0 flex-col border-[3px] p-1.5 @min-[640px]:p-2"
          style={{ borderColor: tokens.frame, background: tokens.band }}
        >
          <div
            className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-[3px]"
            style={{ borderColor: tokens.frame, background: tokens.slide, color: tokens.ink }}
          >
            <div
              aria-hidden="true"
              className={cn(
                "topic-artwork pointer-events-none absolute z-0 text-accent",
                isTitle
                  ? "right-[3%] top-[23%] w-[20%] opacity-30"
                  : "left-[16%] top-[2%] w-[7%] opacity-[0.16]",
              )}
              dangerouslySetInnerHTML={{ __html: artwork }}
            />
            {!isTitle ? (
              <div
                className="pointer-events-none absolute inset-y-0 left-0 w-2"
                style={{ background: tokens.accent }}
              />
            ) : null}
            {!isTitle ? <ThemeMotif theme={tokens.id} /> : null}
            <div className="slide-brand-row relative z-[1] flex shrink-0 items-start justify-between gap-3 px-3 pt-3 @min-[640px]:px-4 @min-[640px]:pt-3.5">
              <img
                src={JUW.crest}
                alt="Jinnah University for Women"
                className="h-16 w-16 object-contain @min-[640px]:h-20 @min-[640px]:w-20"
              />
              {isTitle ? (
                <img
                  src={JUW.microscope}
                  srcSet={`${JUW.microscope} 1254w`}
                  sizes="116px"
                  width={1254}
                  height={1254}
                  alt="Department of Microbiology, JUW"
                  className="h-[6.25rem] w-auto max-w-[12.5rem] bg-transparent object-contain @min-[640px]:h-[7.25rem]"
                />
              ) : (
                <span
                  className="max-w-[9rem] rounded-sm border px-2 py-1 text-right text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] @min-[640px]:max-w-none @min-[640px]:text-[11px]"
                  style={{
                    borderColor: tokens.accent,
                    background: tokens.band,
                    color: tokens.navy,
                  }}
                >
                  {deck?.discipline || "Microbiology"}
                </span>
              )}
            </div>

            {isTitle ? (
              <div className="slide-title-body relative z-[1] flex min-h-0 flex-1 flex-col px-5 pb-4 @min-[640px]:px-10">
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
                  {slide.subtitle && (
                    <p className="slide-scope text-center text-ink-muted">{slide.subtitle}</p>
                  )}
                </div>
                {!!slide.learningObjectives?.length && (
                  <p className="mb-3 text-center text-base text-ink">
                    <strong>Learning outcome: </strong>
                    {slide.learningObjectives[0]}
                  </p>
                )}
                <div className="slide-course-meta ml-auto max-w-[70%] text-right">
                  <div className="mb-2.5 ml-auto h-1 w-9 bg-accent" />
                  <EditableText
                    value={course}
                    onChange={(value) => onPatchDeck?.({ course: value })}
                    disabled={!canEdit}
                    placeholder="Course name"
                    className="text-[10px] font-medium uppercase leading-snug tracking-wide text-ink @min-[640px]:text-xs"
                  />
                  {courseCode ? (
                    <EditableText
                      value={courseCode}
                      onChange={(value) => onPatchDeck?.({ courseCode: value })}
                      disabled={!canEdit}
                      placeholder="Course code"
                      className="text-[10px] font-medium uppercase leading-snug tracking-wide text-ink @min-[640px]:text-xs"
                    />
                  ) : null}
                  <div className="mt-1.5 text-[10px] font-medium uppercase leading-snug tracking-wide text-ink @min-[640px]:text-xs">
                    <EditableText
                      value={`Prepared by: ${preparedBy}`}
                      onChange={(value) =>
                        onPatchDeck?.({ preparedBy: value.replace(/^Prepared by:\s*/i, "") })
                      }
                      disabled={!canEdit}
                      placeholder="Prepared by"
                    />
                  </div>
                  <EditableText
                    value={department}
                    onChange={(value) => onPatchDeck?.({ department: value })}
                    disabled={!canEdit}
                    placeholder="Department"
                    className="text-[10px] font-medium uppercase leading-snug tracking-wide text-ink @min-[640px]:text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="relative z-[1] flex min-h-0 flex-1 flex-col px-5 pb-3 @min-[640px]:px-8 @min-[640px]:pb-4">
                <EditableText
                  value={slide.title}
                  onChange={(title) => onPatch?.({ title })}
                  disabled={!canEdit}
                  placeholder="Slide title"
                  className="slide-content-heading font-serif font-semibold leading-snug text-navy"
                />
                {slide.difficulty && (
                  <p className="text-xs uppercase tracking-wide text-ink-muted">
                    {slide.difficulty} · {slide.sectionType || "other"}
                  </p>
                )}
                {slide.subtitle && (
                  <EditableText
                    value={slide.subtitle}
                    onChange={(subtitle) => onPatch?.({ subtitle })}
                    disabled={!canEdit}
                    placeholder={canEdit ? "Optional subtitle" : ""}
                    className="mt-0.5 text-sm text-ink-muted"
                  />
                )}

                <p
                  className="mt-1 text-sm text-ink-muted"
                  aria-label="Source type and retrieval date"
                >
                  {sourcePresentation(slide)}
                </p>
                <div
                  className={cn(
                    "mt-3 min-h-0 flex-1",
                    !teachingLayout &&
                      slide.layout === "two-column" &&
                      "grid gap-4 @min-[640px]:grid-cols-2",
                  )}
                >
                  {slide.layout === "bibliography" ? (
                    <ol
                      className="grid grid-cols-2 gap-x-8 gap-y-3 text-base leading-snug"
                      aria-label="Complete bibliography"
                    >
                      {(deck ? teachingReferences(deck, citationStyle) : []).map((text, i) => (
                        <li key={i}>
                          {i + 1}. {text}
                        </li>
                      ))}
                    </ol>
                  ) : [
                      "pathogen-card",
                      "lab-protocol",
                      "clinical-case",
                      "differential-table",
                      "comparison-matrix",
                      "learning-objectives",
                      "assessment",
                      "key-takeaway",
                      "common-misconceptions",
                      "growth-curve",
                      "taxonomy-tree",
                    ].includes(slide.layout) ? (
                    <LectureSlideContent slide={slide} reveal={present ? revealCount : 999} />
                  ) : teachingLayout ? (
                    <TeachingContent
                      basis={basis}
                      slide={slide}
                      color={tokens.accent}
                      reveal={present ? revealCount : 999}
                    />
                  ) : slide.layout === "two-column" ? (
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
                          className="overflow-hidden rounded-sm border border-navy/10 bg-navy/5 @min-[640px]:col-span-2"
                          imgClass="max-h-32 w-full object-cover"
                          caption={`${media.title} · ${media.credit} · ${media.license}`}
                        />
                      ) : null}
                    </>
                  ) : (
                    <div
                      className={cn("flex h-full gap-5", media && "flex-col @min-[640px]:flex-row")}
                    >
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
                            slide.layout === "full-image" ? "flex-1" : "@min-[640px]:w-[42%]",
                          )}
                          imgClass="h-full max-h-52 w-full object-cover @min-[640px]:max-h-full"
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

            {!["title", "bibliography", "learning-objectives", "assessment"].includes(
              slide.layout,
            ) && (
              <div className="relative z-[1] shrink-0 space-y-1 px-8 pb-1 text-xs">
                {(methodSlide(slide) || teaching.pitfall) && (
                  <p className="border-l-4 border-amber-600 pl-2">
                    <strong>Common pitfalls / misconceptions:</strong>{" "}
                    {teaching.pitfall ||
                      "Review required — record a method-specific misconception."}
                    <EvidenceBadge basis={basis} field="teaching.pitfall" />
                  </p>
                )}
                <p>
                  <strong>Key takeaway:</strong>{" "}
                  {slide.keyTakeaway || teaching.takeaway || "Review required"}
                  <EvidenceBadge basis={basis} field="teaching.takeaway" />
                </p>
              </div>
            )}
            {slide.clinicalPearl &&
              ![
                "pathogen-card",
                "lab-protocol",
                "clinical-case",
                "differential-table",
                "comparison-matrix",
                "learning-objectives",
                "assessment",
                "key-takeaway",
                "common-misconceptions",
                "growth-curve",
                "taxonomy-tree",
              ].includes(slide.layout) && (
                <aside className="mx-8 rounded border-2 border-navy p-2 text-base text-ink">
                  <strong>Clinical pearl:</strong> {slide.clinicalPearl}
                </aside>
              )}
            {slide.citations.length === 0 && slide.layout !== "title" && (
              <span className="text-xs text-amber-700">Source needed</span>
            )}
            {slide.citations.length > 0 && slide.layout !== "title" && (
              <footer className="relative z-[1] shrink-0 border-t border-navy/10 px-5 py-1.5 text-[10px] leading-snug text-ink-muted @min-[640px]:px-8">
                {slide.citations
                  .slice(0, 2)
                  .map((c) => formatCitation(c, citationStyle))
                  .join("  ·  ")}
              </footer>
            )}

            {slide.layout !== "assessment" && !!slide.assessment?.length && (
              <p className="relative z-[1] shrink-0 px-8 pb-1 text-sm text-ink">
                <strong>Self-check: </strong>
                {slide.assessment[0].question.replace(/^Self-check:\s*/, "")}
              </p>
            )}
            {!draft && deck?.teachingVerification && (
              <p className="relative z-[1] px-8 text-right text-[9px] text-ink-muted">
                Last verified by {deck.teachingVerification.instructor} on{" "}
                {new Date(deck.teachingVerification.at).toISOString().slice(0, 10)} · Lecturer
                self-attestation
              </p>
            )}
            {draft && (
              <p
                className="relative z-[1] shrink-0 border-t border-amber-600 px-8 text-xs font-semibold text-ink"
                role="status"
              >
                {DRAFT_STAMP} · {EXPERT_STAMP}
              </p>
            )}
            {deck?.slides.some((s) =>
              s.citations.some((c) => c.publisher?.includes("OpenStax")),
            ) && (
              <p className="relative z-[1] shrink-0 px-8 text-[9px] text-ink-muted">
                {OPENSTAX_ATTRIBUTION}
              </p>
            )}
            <div className="relative z-[1] shrink-0 px-8 text-right text-[9px] text-ink-muted">
              {deck?.courseCode} ·{" "}
              {deck?.updatedAt && deck.updatedAt > 86400000
                ? new Date(deck.updatedAt).toISOString().slice(0, 10)
                : "Undated draft"}{" "}
              · {JUW.name} {JUW.version} · For educational use only
            </div>
            {slide.layout !== "title" && (
              <span className="pointer-events-none absolute bottom-1.5 left-3 z-[1] font-mono text-[9px] tabular-nums text-ink-muted">
                {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </span>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

function ThemeMotif({ theme }: { theme: SlideTheme }) {
  return (
    <svg
      className="pointer-events-none absolute right-6 top-10 h-14 w-24 text-accent opacity-20"
      viewBox="1280 80 320 480"
      preserveAspectRatio="xMidYMid meet"
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
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [media.src]);
  return (
    <figure className={className}>
      {failed ? (
        <p className="p-3 text-xs text-ink-muted">
          Original image unavailable. It has not been replaced by a different figure.
        </p>
      ) : (
        <img
          src={mediaDisplaySrc(media.src)}
          alt={media.title}
          className={imgClass}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      )}
      {caption && (
        <figcaption className="px-1.5 py-0.5 text-[8px] text-ink-muted @min-[640px]:text-[10px]">
          {caption}
        </figcaption>
      )}
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
    return (
      <p className={className}>
        <ScientificText text={value} />
      </p>
    );
  }
  return (
    <p
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={placeholder || "Edit text"}
      aria-multiline={multiline}
      onBlur={(e) => onChange?.(e.currentTarget.innerText)}
      className={cn(
        "w-full bg-transparent outline-none rounded-xs hover:bg-navy/5 focus:ring-2 focus:ring-accent/30",
        className,
      )}
    >
      <ScientificText text={value} />
    </p>
  );
}

function BulletList({
  items,
  editable,
  onChange,
}: {
  items: string[];
  present?: boolean;
  editable?: boolean;
  onChange?: (items: string[]) => void;
}) {
  const rows = items;
  if (!rows.length) return null;

  return (
    <ul className={cn("slide-bullets space-y-1.5 text-ink", "text-base")}>
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
              <span
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-label={`Teaching point ${i + 1}`}
                onBlur={(e) => {
                  const next = items.slice();
                  next[i] = e.currentTarget.innerText;
                  onChange?.(next);
                }}
                className="w-full bg-transparent outline-none hover:bg-navy/5 focus:ring-2 focus:ring-accent/30"
              >
                <ScientificText text={item} />
              </span>
            ) : (
              <span>
                <ScientificText text={item} />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
