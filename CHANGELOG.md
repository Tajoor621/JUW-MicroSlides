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
