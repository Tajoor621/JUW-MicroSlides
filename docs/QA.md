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
- After a scientific rendering revision, confirm formal instructor layout verification needs renewal; retain existing claim reviews and permit draft downloads.
- Confirm the prepared link remains usable after a delay. Edit the deck and confirm the stale-file note; export again for current content.
- Attempt formal reviewed export without current instructor verification: it must remain gated. Review status must revert after edits; importing a `reviewed` string must never bypass evidence snapshots.
- On first online visit wait for installation, then go offline and reload. Check university artwork (including query-string URLs), all four bundled font faces, stored slides, PDF/PPTX, and project backups. Search and external media may require connectivity.
- Upgrade a version-1 IndexedDB containing state, recovery records, revision history and unknown keys. Confirm version 2 adds schema history while retaining all original values. Keep an older tab open to exercise the blocked-update message, close it and retry.
- On a phone, focus fields with the keyboard open, rotate the phone, scroll to export/recovery actions, and check touch targets and safe-area padding. These styles must not change slide export geometry.
- Request an ordinary lab teaching method: it remains available. A flagged high-containment procedural request must stop before retrieval/model calls and preserve the active deck. Non-operational lectures remain available. This heuristic does not replace biosafety review.
- Update through **Check for updates → Load latest build** and confirm the saved library survives.

Do not claim scientific certification, accurate taxonomy for every organism, universal browser compatibility, or physical-device qualification from passing software tests.

## Writing Notes / fresh workspace regression (24 October 2026)

- Verify Review is absent and Writing Notes accepts a separate topic, source text and level. Generate notes, edit, download Markdown, reload and confirm persistence without slide edits.
- Download draft PPTX and PDF with no citations or sign-offs. Test corrupt PNG/SVG: explicit missing-image placeholders, correct slide count, native text and no Review panel. Verify a second tap on each persistent download link.
- Inspect native SVG plus its PNG fallback dimensions; verify selectable/editable text rather than whole-slide screenshots. Qualify actual Office/mobile rendering separately.
- Refresh after generation failure and while research is pending. Check empty topic/search/note tabs, no stale result, reload retains empty state and all saved decks remain in Library.
- Automated browser coverage: `npm run qa:reviewed-export` (legacy command name, now export/notes/reset suite) and `npm run qa:topic-recovery`. Archived review-module tests cover historical record compatibility only.
