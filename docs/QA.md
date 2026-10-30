# Release checks — JUW-MicroSlides V6.2.1

Canonical application: https://tajoor621.github.io/JUW-MicroSlides/

Use commit IDs to identify revisions. Do not increase the locked application version. The existing `.github/workflows/pages.yml` runs code, browser, offline and export checks before publication; `windows.yml` tests the native installer/UI. Do not add a second deployment pipeline.

## Repeatable code checks

Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:teaching`, `npm run test:release`, `npm run test:version-lock`, and `npm run build:pages`. The `scripts/teaching-fixture.mjs` fixture supplies an explicitly synthetic deck with complete verification metadata; it is software test data, not approved scientific teaching content. `scripts/fixtures/export-draft.json` is an unreviewed typography/download fixture.

Run `npm run qa:pages`, `npm run qa:lecture`, `npm run qa:topic-recovery`, and `npm run qa:reviewed-export` against the production output. Set `JUW_CHROMIUM` to an installed Chrome executable. CI already provides one.

## Browser/device acceptance checklist

- Back up the library before testing updates. Record the visible build ID and browser/device version.
- Generate an exact requested count in 1–50. Try a new topic; never accept the saved example as the new result.
- Import the draft fixture. Confirm species italics, ordinary text, unchanged numeric values, pending review status and unit/DOI notes. A syntactically valid DOI is not a verified source.
- Export draft PPTX with review notes pending. After preparation, tap **Download PowerPoint**. Confirm a nonempty `.pptx`, exact slide count, editable text/diagrams, citations and draft labels in PowerPoint. Repeat on Samsung Internet and iOS Safari; browser emulation does not qualify physical devices.
- After a rendering revision, recheck readable text, image quality and exact counts. Preserve historical records and permit draft downloads without a review gate.
- Confirm the prepared link remains usable after a delay. Edit the deck and confirm the stale-file note; export again for current content.
- Export remains ungated regardless of historical review metadata. Every exported page/slide must retain “Unverified AI-assisted draft”.
- On first online visit wait for installation, then go offline and reload. Check university artwork (including query-string URLs), all four bundled font faces, stored slides, PDF/PPTX, and project backups. Search and external media may require connectivity.
- Upgrade a version-1 IndexedDB containing state, recovery records, revision history and unknown keys. Confirm version 2 adds schema history while retaining all original values. Keep an older tab open to exercise the blocked-update message, close it and retry.
- On a phone, focus fields with the keyboard open, rotate the phone, scroll to export/recovery actions, and check touch targets and safe-area padding. These styles must not change slide export geometry.
- Request an ordinary lab teaching method: it remains available. A flagged high-containment procedural request must stop before retrieval/model calls and preserve the active deck. Non-operational lectures remain available. This heuristic does not replace biosafety review.
- Update through **Check for updates → Load latest build** and confirm the saved library survives.

Do not claim scientific certification, accurate taxonomy for every organism, universal browser compatibility, or physical-device qualification from passing software tests.

## Writing Notes / fresh workspace regression (24 October 2026)

- Verify Review is absent and Writing Notes accepts a separate topic, source text and level. Generate notes, download an A4 portrait PDF, reload and confirm persistence without slide edits.
- Download draft PPTX and PDF with no citations or sign-offs. Test corrupt PNG/SVG: explicit missing-image placeholders, correct slide count, native text and no Review panel. Verify a second tap on each persistent download link.
- Inspect native SVG plus its PNG fallback dimensions; verify selectable/editable text rather than whole-slide screenshots. Qualify actual Office/mobile rendering separately.
- Refresh after generation failure and while research is pending. Check empty topic/search/note tabs, no stale result, reload retains empty state and all saved decks remain in Library.
- Automated browser coverage: `npm run qa:reviewed-export` (legacy command name, now export/notes/reset suite) and `npm run qa:topic-recovery`. Archived review-module tests cover historical record compatibility only.

## Logo qualification — 29 October 2026

**logo resolution below target**. The active legacy microscope remains unchanged pending original departmental artwork. The reconstructed PNG/SVG deliverables are not official originals and are not activated. `node scripts/logo-assets.mjs` fails qualification for the legacy image; the unit test asserts that this known defect is detected. Cache revisions are independent of V6.2.1 and do not establish improved resolution. Title-slide and physical-phone inspection are recorded separately.

## Educational workflow qualification — 29 October 2026

Run `npm run test:uk-english` and `npm run qa:notes` alongside the required build checks. The notes browser fixture uses explicitly synthetic software text with existing bibliographic identifiers; it tests extraction/persistence/PDF geometry and is not a scientific accuracy test or a quotation from those papers. Its PDF and rendered pages belong in CI artefacts. The 20-topic fixture checks source/count/failure contracts, not live provider coverage or universal scientific correctness. Physical Note20 acceptance remains pending in [the phone checklist](QA-PHONE-NOTE20.md).

Verified live application deployment on 29 October 2026: **build `e47ffd0`**, commit `e47ffd0c4c294cb6d82456dbf7c3999baca61a1c`. [Main Pages run 40952199307](https://github.com/Tajoor621/JUW-MicroSlides/actions/runs/40952199307) completed build, deployment and live smoke checks successfully. The deployed UI was independently observed showing `e47ffd0` and `V6.2.1`.

PR head `75b351bf5bda40f5416341c86c86f634d7160489` passed [Pages 40951140735](https://github.com/Tajoor621/JUW-MicroSlides/actions/runs/40951140735), [Windows 40951140543](https://github.com/Tajoor621/JUW-MicroSlides/actions/runs/40951140543) and native dependency security. The source tree matched the tested local tree before merging PR #33. The actual app regenerated `conjugation-18.pptx` in the browser-export CI artefact; it was not committed.

The PDF check renders every note page with Poppler and requires a visible centred crest with faint contrast, alongside A4 sizing, draft labels, page numbers and extractable text. Physical Note20 and actual Microsoft PowerPoint rendering remain unperformed. Manual live PDF inspection was interrupted when the browser environment disconnected; it is not counted as passed.

This is a dated verification record. Later documentation-only commits produce a new build ID without changing the application implementation. For the latest deployment, compare [build-info.json](https://tajoor621.github.io/JUW-MicroSlides/build-info.json) with its workflow SHA; the existing `smoke-live` job enforces that comparison on every main deployment.


## Source-first generation follow-up — 30 October 2026

Verified live application build **aa584f2**, commit `aa584f23b3b0e6e787b1d186af9066c344b274e9`, following [PR #35](https://github.com/Tajoor621/JUW-MicroSlides/pull/35). [Main Pages 41043253988](https://github.com/Tajoor621/JUW-MicroSlides/actions/runs/41043253988) completed build, deploy and live smoke successfully. The actual browser loaded aa584f2 through the update control, retained saved work and displayed V6.2.1. Later documentation-only commits change the build ID; compare current `build-info.json` with the latest smoke workflow rather than treating this dated record as a permanent latest-build label.

PR head `267e9859aecf0114e6b70f8b77b97f1bdcc048c8` passed [Pages 41042693878](https://github.com/Tajoor621/JUW-MicroSlides/actions/runs/41042693878), [Windows 41042693754](https://github.com/Tajoor621/JUW-MicroSlides/actions/runs/41042693754) and native security. Local checks: clean install, typecheck, lint, 53 unit tests, UK English, production build, zero-vulnerability high-severity audit, research/topic/count/scientific and teaching/export-fidelity contracts. CI also passed notes, ungated PPTX/PDF, mobile/offline/persistence, lecture and topic-recovery browser checks.

Manual PDF inspection is no longer wholly pending: a live c585d9f notes PDF was downloaded and both pages rendered on 30 October. Both were A4 portrait with repeated visible markings, department seal, faint centred crest, extractable text and readable body text. Its sparse contextual study fragments were not suitable as teaching notes; the aa584f2 generation change now rejects that minimum-content failure. This inspection qualifies the unchanged PDF formatter, not the scientific content. Physical phones and Microsoft PowerPoint remain untested. See [the continuation report and commit list](WORKFLOW-REPORT-2026-10-30.md).

Live aa584f2 also generated a real three-slide **Natural competence in bacteria** deck, selected it instead of the example and downloaded a valid PPTX with native text and the draft stamp on all three slides. Two awkward extracted headings prompted the follow-up concept-boundary fix (`54c56f7`); the observed example now has a regression test. The later revision has 54 passing local unit checks. The citation/source run does not establish scientific completeness or validate every retrieved statement.
