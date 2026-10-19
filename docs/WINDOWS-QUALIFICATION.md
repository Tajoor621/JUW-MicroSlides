# JUW-MicroSlides V6.2.1 — Windows professional implementation

## Implemented in this change

- Strict integer counts 1–50, including substantive one-slide lectures. Automatic objectives, repeated conclusion bullets and suggested-reading padding removed. Legacy 51–400-slide archives remain readable and portable without silent truncation.
- Claim IDs, teaching purposes, source passages, source URLs/locators/access classifications, explicit lecturer review and review invalidation on changed statements/purposes. Existing citations alone never imply verified support.
- Exact and token-overlap duplicate screening before a generation or replacement can be committed. This catches wording overlap; it is not a calibrated semantic-entailment model.
- Whole-deck integrity audit, draft watermarks, draft export and reviewed-export evidence gate. Abstract access and lecturer review have separate, visible limitations. Reviewed export also checks out-of-canvas text.
- Persistent version snapshots in the same transaction as working-state changes. Latest 100 snapshots, bounded to 20 MB; portable projects are independent. Recovery restores copies. Browser IndexedDB and desktop SQLite use the same authoring model.
- Checksummed, size-limited .juwslides ZIP projects with embedded primary/collected images and claim passages. Export fails explicitly on unavailable/unembedded media rather than claiming offline portability. JSON backups remain supported for external links/video collections.
- Slide locks, local-model replacement proposals with an explicit apply step, speaker-note expansion without count changes, keyboard shortcuts and saved interrupted-request inputs. Retrieved abstract records are cached for offline reuse; unavailable evidence still causes an explicit incomplete result.
- Tauri 2 Windows NSIS target, offline WebView2 installer dependency, original transparent university branding, native dialogs, native project/PPTX save, .juwslides association, SQLite WAL/FULL durability, audience-window storage denial, separate audience/presenter views and monitor selection.
- Desktop builds contain bundled application code rather than the web-host bridge scripts and use a restricted CSP. No remote executable scripts or paid inference endpoints are needed by the desktop target. Ollama/models are separately configured and not bundled.

## Validation and distribution

`npm run typecheck`, `npm run lint`, `npm test`, `npm run test:research`, `npm run test:topics`, `npm run test:generation`, `npm run test:professional`, `npm run build:pages`, and `npm run qa:pages` cover the shared application. Count tests use explicitly synthetic source/model fixtures: they do not certify scientific quality or universal topic fulfilment.

The Windows workflow builds the actual executable/NSIS installer, runs Rust transaction tests, then opens its native WebView2 UI via a test-only local debugging connection. It tests generation, forced-process termination/recovery, separate audience rendering and denied audience storage access. Debugging is enabled only in the CI process environment, not in shipped application configuration.

Windows installers and native QA screenshots/results are workflow artifacts. Installers are unsigned testing builds; no signing certificate is included and no authenticated automatic updater is claimed. The visible version remains V6.2.1. Builds are identified by commit hashes. Same-version upgrade behaviour and signed distribution require a separate release qualification.

## Release gates still requiring work/evidence

This change is not a substantiated 10/10 rating. The following remain explicit release gates:

1. Claim-aware pedagogical synthesis from multiple evidence types rather than abstract excerpts alone; maintained, licence-aware full-text textbook/CDC/WHO ingestion adapters. Current authoritative sources can be supplied and reviewed by lecturers; they are not all automatic retrieval integrations.
2. A calibrated semantic duplicate/contradiction detector and independently labelled evaluation corpus. Lexical screening does not guarantee zero conceptual repetition.
3. Publication-status/retraction refresh, clinical-guideline applicability/currentness checks and formal source-quality ranking. Identifier/metadata matching is not source endorsement.
4. Fully resumable local-model batch execution. Interrupted requests and retrieved research are retained; retrying may rerun a local-model call. Cancellation of an in-flight model call may wait for its bounded timeout.
5. Actual Microsoft PowerPoint rendering/editability/font tests on supported Windows versions. Browser geometry and native-text XML checks do not prove PowerPoint pixel fidelity; current text is exported as editable lines rather than semantic paragraphs.
6. Real-device projector hotplug/mixed-DPI/sleep/resume, low-disk and accessibility qualification; broader crash fault-injection. Native CI smoke does not replace a physical classroom test.
7. A published >=200-topic benchmark, all accepted integer counts, P95 under five minutes on declared hardware, independent microbiology review and a lecturer usability study. These are targets, not results.
8. Signed installers, secure same-visible-version update delivery, configurable user backup directories/retention, mature cache controls, normalized relational evidence tables and broader project round-trip coverage.

## Compatibility

Backups retain the legacy maximum of 400 for reading historical work; new generation, additions, replacement editing and PowerPoint exports enforce the 50-slide ceiling. Export an explicit reduced working copy when using an older oversized deck. No automatic migration deletes slides.

Source excerpts retain their limited scientific meaning. Foundational knowledge is not assigned a verified status automatically. A lecturer's attestation records responsibility and source linkage; it is not independent peer review.
