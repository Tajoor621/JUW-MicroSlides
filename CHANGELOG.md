# V6.2.1 — deployment and reliability repair

- Removed stale generated Vercel build artifacts from source control; both targets rebuild from source.
- Added an independent static Pages build, subdirectory-aware assets, install manifest, offline app-shell cache, and gated deployment workflow.
- Migrated browser saves to IndexedDB while preserving legacy storage, removed silent library eviction, and added validated backup/restore, per-deck backups, explicit save failures, and undo/redo.
- Wired generation mode explicitly, labelled local fallback, added optional local Ollama settings, bounded/validated server inputs and AI output, and restricted image proxy destinations and redirect/response handling.
- Added inspector Help, mobile-safe dialog scrolling, connected labels, clearer capability descriptions, and slide-width-based title scaling.
- Replaced fragile CSV/BibTeX parsing and citation templates with maintained parsers/CSL formatting. Search results no longer attach automatically as evidence for unrelated claims.
- Added PowerPoint notes, complete reference appendices, additional figures, aspect-ratio preservation, substitute attribution, and safer text fitting.
- Added data/security checks and production desktop/mobile/offline browser checks; isolated platform test fixtures from real app branding.

See README for remaining limits, deployment setup, and validation commands.

## Topic quality and specialist review update — V6.2.1

- Replaced generic slide padding with topic-specific content, scope-aware introductions, concise headings, explicit coverage notices and optional abstract-derived evidence.
- Removed automatic scientific-image insertion on generation, new-slide creation and removal; preserved edited saved decks.
- Added a separate image/video collection, original/source/licence links, individual file downloads, pagination and public social-platform/portal search shortcuts.
- Added a specialist Review panel with exact-passage findings, correction suggestions, reference metadata checks, optional local AI and vision-model inspection, and downloadable reports.
- Kept the owner-mandated application version V6.2.1. Schema additions are backward-compatible.

## Research coverage and slide clarity update — V6.2.1 (2026-10-16)

- Expanded literature enrichment to up to three parallel Europe PMC queries, 100 records per query, DOI/PMID deduplication, relevance ranking, and explicit successful-query/coverage reporting.
- Applied source enrichment to short AI-created drafts as well as local knowledge drafts, so a model returning fewer slides still gets the requested research search.
- Made slide typography scale with its canvas while retaining editable text in the PowerPoint export, and added topic-matched vector ornaments to opening and research slides.
- Added a regression check where multiple searches retrieve enough cited abstracts to complete a supported 25-slide deck.

## Subject-wide requested-count generation — V6.2.1 (2026-10-16)

- Routed the toolbar Generate button through the shared generator instead of directly saving local templates.
- Added arbitrary-topic/synonym searches, cursor pagination and distinct, attributed passages from longer source abstracts.
- Added exact-count validation before saving; insufficient source/model responses preserve the active deck and display an error.
- Fixed the missing-reading-slide off-by-one case in broad subject overviews.
- Replaced the local AI 36-slide ceiling with outline planning and validated eight-slide batches (up to 400 requested slides).
- Preserved editor counts in PowerPoint by retaining full references/additional media links in notes, with no silently appended pages.
- Added cross-discipline 2/25/50-slide, pagination, model-batching and browser export-count regressions.

## Cached-build update delivery — V6.2.1 (2026-10-16)

- Fixed cache-first navigation and waiting-worker activation that could leave installed clients on an earlier generator build.
- Added network-first app navigation with offline fallback, automatic worker activation, uncached build metadata, and retention of one previous asset cache for open tabs.
- Added visible commit build IDs and an update control that waits for queued deck saves before reloading.
- Labelled saved decks whose current count is lower than their original request.
- Added browser regressions for replacing a deliberately stale worker/cache, matching update metadata, and reopening the upgraded app offline.

## V6.2.1 — preview and PowerPoint layout parity

- Replaced the independent PowerPoint template with capture of the same fixed 1280×720 slide composition used by editor, presenter and print views. Mobile scales the complete composition rather than reflowing slide content.
- Matched heading/body fonts, measured text line positions, colours, frame geometry, logos, topic artwork, theme motifs, image crops and captions. Exported text remains native editable text, with explicit browser line breaks. Artwork alone is rasterised with transparency at 2× resolution.
- Preserved exact slide count and source/media notes. Failed figures remain explicitly unavailable instead of being replaced with unrelated art. PNG and frame alpha are retained; files use ZIP compression.
- New decks choose a consistent palette from the topic/discipline instead of cycling unrelated subject themes. Subject labels identify the deck discipline, while manually selected palettes in existing decks are preserved.
- Added production-browser export comparisons covering all 10 palettes × 5 layouts at desktop and phone widths, including native text coordinates/sizes/colours and logo/attached-image bounds. Existing offline/storage/generation/media checks remain passing.
- The visible application version remains V6.2.1. Re-export older decks to regenerate their PowerPoint files. PowerPoint/other viewers may substitute fonts absent on the viewing device.
