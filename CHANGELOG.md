## Saved sample identity repair — V6.2.1 (2026-10-20)

- Native reviewer crash testing exposed sample regeneration during workspace hydration. Removed automatic replacement of persisted sample decks, preserving saved content, claim IDs and review-pack identity across restart.
- Fresh samples now receive deterministic claim IDs after their stable slide IDs are assigned. Existing saved IDs remain untouched.
- Added repeat-hydration regression checks; retained the strict native whole-library comparison that found the defect.

## Native reviewer recovery qualification — V6.2.1 (2026-10-20)

- Confirmed the preceding Windows installer, transaction and native UI workflow succeeded.
- Extended native Windows QA to check reviewer draft persistence across forced termination, explicit recovery, keyboard isolation, unchanged lectures and local checkpoint deletion. Remote renderer requests are blocked during the local review flow.
- Added commit/hardware/timing provenance and failure screenshots/results. Hosted fixture timing remains separate from representative classroom performance; independent scientific review and physical PowerPoint/classroom qualification remain pending.

## Guided review and safe editing — V6.2.1 (2026-10-20)

- Added a searchable lecture evidence overview with missing-passage, lecturer-review, abstract-only and critical-finding filters, a reference-to-slide map, direct evidence navigation and JSON export. Counts describe recorded evidence, not scientific accuracy.
- Added an offline scientific reviewer workspace: open an original review pack, enter item-by-item decisions, rationale, checked sources and redundancy findings, then validate and export a compatible reviewer form. Reviewer identity and independence remain self-attested; completion does not certify the lecture or unlock reviewed export.
- Added private local reviewer draft recovery with three checkpoints, explicit restore/delete controls, portable draft files and keyboard navigation. Original pack and item hashes are checked before review or draft resumption.
- Made inspected slide replacement transactional: stale or locked proposals and duplicate content are rejected; new claims require evidence review. Figures return to Media unless explicitly retained, and replacement preserves the exact slide count.
- Added lecturer-workflow contracts to both deployment pipelines and expanded production desktop/mobile/offline browser coverage. The application version remains V6.2.1.

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

## V6.2.1 — transparent university crest

- Removed the rectangular exterior from the university crest while retaining the original crest artwork, lettering and enclosed grey/white areas. All slide layouts, header branding, presenter/print and PowerPoint use the same transparent asset.
- Removed the header logo's white background. Existing decks receive this branding correction without changing their contents or themes; previously downloaded PowerPoint files must be exported again.
- Kept V6.2.1 unchanged and verified exterior alpha in browser and PowerPoint assets.

## V6.2.1 — Windows professional authoring foundation

- Enforced strict 1–50 generation/edit/export limits and preserved oversized archives; removed automatic objectives, repeated conclusions and reading padding; made one-slide lectures substantive.
- Added claim-level source passages/locators, review invalidation, duplicate screening, whole-deck integrity audit, explicit draft/reviewed export and overflow gates.
- Added atomic version snapshots, restore-as-copy recovery, checksummed portable projects, slide locks, local-model replacement proposals and persistent interrupted-request/research caching.
- Added Tauri Windows packaging, native file dialogs and project/PPTX saves, SQLite durability, a separate monitor-selectable audience window and a private presenter console. Added native CI build, transaction tests and real-WebView smoke tests.
- Kept the visible version V6.2.1. Documented the remaining scientific, source-ingestion, semantic, signing, PowerPoint and real-device qualification gates without claiming universal completion or a verified 10/10 score.

## V6.2.1 — reference interchange and batch recovery

- Preserved complete CSL-JSON/BibTeX source metadata, including structured book/report references, and added deck bibliography export as CSL-JSON.
- Persisted local-model outlines and completed batches; retries of an identical request/model resume completed work. Added an injected-interruption test and coverage for every accepted slide count.
- Added an explicit professional release backlog, lecturer journeys and measurable qualification criteria.

### V6.2.1 — scientific source and qualification extension (2026-10-20)

- Add bounded Europe PMC open full-text retrieval, source-body traceability, official-publisher source library and portable/offline source preservation.
- Check incoming Crossref/Europe PMC publication notices; preserve adverse status through partial outages; block reviewed export for adverse notices and mismatched identifiers.
- Record guidance version/jurisdiction and lecturer currency declarations; retain actual evidence access and source provenance in editable PowerPoint notes.
- Add optional full-deck embedding screening, explicit model limitations, a 200-topic live benchmark and separate actual PowerPoint/physical classroom qualification paths.
- Replace repeated whole-candidate duplicate scans with bounded incremental evidence screening. Keep exact count and final repetition gates. Application version remains V6.2.1.

- Retry transient literature requests within a bounded budget; surface service failures separately from insufficient evidence. Add regression coverage for preprint exclusion and retry completion.
- Preserve literal scientific comparison signs and decoded Unicode symbols in full-text claim passages; verify quotation containment against archived source text.
- Separate the corrected evidence-parser cache namespace from prior parsed bodies; keep the visible application version and saved projects intact.

## V6.2.1 — scientific review handoff and reproducible semantic evaluation (2026-10-20)

- Replaced misleading semantic repetition/contradiction labels with related-statement and changed-wording review candidates; reject nonfinite screening thresholds.
- Added six source-backed scientific hard cases, domain-separated development calibration, all raw cosine scores, confusion metrics, descriptive uncertainty, corpus hashes and installed-model digest checks. Missing models remain untested; no automatic production-threshold changes.
- Added content-hashed scientific review packs covering titles, notes, teaching claims and figures, two blank external reviewer forms, and strict completeness/staleness/disagreement/redundancy checks. Self-attestations never become scientific certification.
- Recorded a concrete introductory-slide pedagogy failure from an archived research deck. Independent human review and actual embedding-model qualification remain pending.

- Follow-up source audit: flagged one damaged archived full-text quotation among 119 records. Added a critical saved-source quotation-mismatch gate that lecturer confirmation cannot override, with comparator-preservation regression coverage.

## V6.2.1 — measured semantics, preserved study context and returned reviews (2026-10-20)

- Ran an actual pinned q8 MiniLM model on all 27 development pairs offline. Published model/runtime hashes and raw scores; the default threshold missed six of eight labelled repetitions. Model/threshold remains unqualified; no automatic threshold change or content deletion.
- Preserved paragraph/sentence adjacency and source paragraph context in speaker notes. Fixed abstract markup handling of scientific comparisons and Unicode; excluded oversized paragraphs rather than truncating. Preferred explanatory wording for one-slide source summaries and separated the passage cache from earlier extraction.
- Completed offline in-app return assessment for two reviewer forms, with content/source hashes, malformed/stale/incomplete/disagreement/redundancy checks and downloadable results. Shared validation with the CLI; self-attestations never certify science or unlock reviewed export.
