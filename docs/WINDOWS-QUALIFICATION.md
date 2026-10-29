# JUW-MicroSlides V6.2.1 — Windows professional implementation

## Implemented in this change

- Strict integer counts 1–50, including substantive one-slide lectures. Automatic objectives, repeated conclusion bullets and suggested-reading padding removed. Legacy 51–400-slide archives remain readable and portable without silent truncation.
- Claim IDs, teaching purposes, source passages, source URLs/locators/access classifications, explicit lecturer review and review invalidation on changed statements/purposes. Existing citations alone never imply verified support.
- Exact and token-overlap duplicate screening before a generation or replacement can be committed. This catches wording overlap; it is not a calibrated semantic-entailment model.
- CSL-JSON/BibTeX import with full CSL metadata retention, structured book/report/article records and CSL-JSON bibliography export.
- Whole-deck integrity audit, draft watermarks, draft export and reviewed-export evidence gate. Abstract access and lecturer review have separate, visible limitations. Reviewed export also checks out-of-canvas text.
- Persistent version snapshots in the same transaction as working-state changes. Latest 100 snapshots, bounded to 20 MB; portable projects are independent. Recovery restores copies. Browser IndexedDB and desktop SQLite use the same authoring model.
- Checksummed, size-limited .juwslides ZIP projects with embedded primary/collected images and claim passages. Export fails explicitly on unavailable/unembedded media rather than claiming offline portability. JSON backups remain supported for external links/video collections.
- Slide locks, local-model replacement proposals with an explicit apply step, speaker-note expansion without count changes, keyboard shortcuts and saved interrupted-request inputs and local-model outline/completed-batch checkpoints. Retrieved abstract records are cached for offline reuse; unavailable evidence still causes an explicit incomplete result.
- Tauri 2 Windows NSIS target, offline WebView2 installer dependency, original transparent university branding, native dialogs, native project/PPTX save, HTTP(S)-scoped external source links, .juwslides association, SQLite WAL/FULL durability, single-instance authoring to avoid concurrent workspace writers, audience-window storage denial, separate audience/presenter views and monitor selection.
- Desktop builds contain bundled application code rather than the web-host bridge scripts and use a restricted CSP. No remote executable scripts or paid inference endpoints are needed by the desktop target. Ollama/models are separately configured and not bundled.

## Validation and distribution

`npm run typecheck`, `npm run lint`, `npm test`, `npm run test:research`, `npm run test:topics`, `npm run test:generation`, `npm run test:professional`, `npm run build:pages`, and `npm run qa:pages` cover the shared application. Count tests use explicitly synthetic source/model fixtures: they do not certify scientific quality or universal topic fulfilment.

The Windows workflow builds the actual executable/NSIS installer, installs the NSIS package and its WebView2 dependency, runs Rust transaction tests, then opens its native WebView2 UI via a test-only local debugging connection. It tests generation, forced-process termination/recovery, separate audience rendering and denied audience storage access. Debugging is enabled only in the CI process environment, not in shipped application configuration. The UI test runs at Medium integrity because WebView2 150+ ignores that environment setting for elevated hosts; the application binary is unchanged. The standard-user test has passed generation, forced-termination persistence and audience isolation.

Windows installers and native QA screenshots/results are workflow artefacts. Installers are unsigned testing builds; no signing certificate is included and no authenticated automatic updater is claimed. The visible version remains V6.2.1. Builds are identified by commit hashes. Same-version upgrade behaviour and signed distribution require a separate release qualification.

## Release gates still requiring work/evidence

This change is not a substantiated 10/10 rating. The following remain explicit release gates:

1. Claim-aware pedagogical synthesis from multiple evidence types rather than abstract excerpts alone; maintained, licence-aware full-text textbook/CDC/WHO ingestion adapters. Current authoritative sources can be supplied and reviewed by lecturers; they are not all automatic retrieval integrations.
2. A calibrated semantic duplicate/contradiction detector and independently labelled evaluation corpus. Lexical screening does not guarantee zero conceptual repetition.
3. Publication-status/retraction refresh, clinical-guideline applicability/currentness checks and formal source-quality ranking. Identifier/metadata matching is not source endorsement.
4. Immediate cancellation of an in-flight local-model call. Completed batches and the outline resume for an identical request/model; an interrupted batch reruns. Cancellation may currently wait for the bounded network timeout.
5. Actual Microsoft PowerPoint rendering/editability/font tests on supported Windows versions. Browser geometry and native-text XML checks do not prove PowerPoint pixel fidelity; current text is exported as editable lines rather than semantic paragraphs.
6. Real-device projector hotplug/mixed-DPI/sleep/resume, low-disk and accessibility qualification; broader crash fault-injection. Native CI smoke does not replace a physical classroom test.
7. A published >=200-topic benchmark, all accepted integer counts, P95 under five minutes on declared hardware, independent microbiology review and a lecturer usability study. These are targets, not results.
8. Signed installers, secure same-visible-version update delivery, configurable user backup directories/retention, mature cache controls, normalized relational evidence tables and broader project round-trip coverage.

When the app is already running, a second launch focuses it and asks the lecturer to use the system Open dialog for another project. Startup file associations load the selected project; forwarding a second shell-open project automatically remains a UX qualification item.

## Compatibility

Backups retain the legacy maximum of 400 for reading historical work; new generation, additions, replacement editing and PowerPoint exports enforce the 50-slide ceiling. Export an explicit reduced working copy when using an older oversized deck. No automatic migration deletes slides.

Source excerpts retain their limited scientific meaning. Foundational knowledge is not assigned a verified status automatically. A lecturer's attestation records responsibility and source linkage; it is not independent peer review.

## Scientific and renderer qualification extension

See [SCIENTIFIC-QUALIFICATION.md](SCIENTIFIC-QUALIFICATION.md) for the 200-topic live-source benchmark, publication-notice handling, semantic screening limitations, actual licensed PowerPoint runner and physical classroom checklist. These add reproducible qualification paths; they do not mark the remaining hardware/independent-review gates as passed.

## Verified build and native reviewer extension — 2026-10-20

Build `b0f25383e76ffd41745589ca19c47e76b11fed69` passed [Windows workflow 39401881074](https://github.com/Tajoor621/JUW-MicroSlides/actions/runs/39401881074): NSIS installation with WebView2, Rust transaction tests and the standard-user native UI test all succeeded. Its matching Pages build/deployment also passed. This records hosted Windows evidence, not a physical lecturer device.

The extended native test exercises the reviewer workspace with a distinctly labelled synthetic pack: local pack integrity, keyboard navigation, incomplete-form checks, SQLite draft writes, forced termination, explicit restoration, unchanged lecture library and local checkpoint deletion. It blocks remote HTTP(S) renderer requests during the review flow and verifies that none are needed; this is not an OS airplane-mode test and does not intercept Rust networking. It records the source commit, OS build, CPU/RAM, single-fixture timings and screenshots, with explicit limitations. Failed runs write diagnostics rather than a success report. The Windows-native-QA workflow artefact is the authoritative result for each new build.

The human review handoff is available in the app. No qualified human reviewers, licensed interactive PowerPoint lab runner or physical classroom hardware are available in this execution environment. Those gates remain pending; neither synthetic review forms nor hosted Windows results may close them.

The first extended run (`9534266`, Windows workflow 39403630262) failed its strict whole-library comparison after recovering the reviewer draft. The persisted bundled sample was being regenerated during hydration, changing claim IDs on every restart. The fix preserves all saved samples and creates stable IDs only for newly generated samples. The assertion remains unchanged; a failing run is not recorded as a pass.

The following run (`dc0c317`, Windows workflow 39404986344) passed draft recovery and the whole-library comparison, then exposed a harness classification error: Tauri's virtual `http://ipc.localhost/state_put` endpoint was counted as remote. The harness now explicitly allows the native app and IPC transports, with regression cases rejecting remote lookalikes and credentialed URLs. External requests remain blocked; the saved-library assertion remains strict.

## Follow-up implementation — 21 October 2026

The in-flight local-model cancellation gap is now implemented with an abort signal propagated through the static/desktop service and Ollama HTTP requests. Completed valid batches are preserved for retry and cancellation never falls back to research generation. TypeScript, scientific, lecturer, release-gate and Windows CI checks remain separate from physical-device qualification.

Reviewed export also requires current complete bibliographic checks and explicit decisions for headings, notes and attached figures. Earlier archived projects retain their content; their uncovered fields require review. See Scientific qualification for the new full topic/count matrix and external semantic acceptance commands. These additions do not close the licensed PowerPoint, physical classroom, signing or independent reviewer gates.
