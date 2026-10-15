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
