# JUW-MicroSlides V6.2.1 QA

## Verified release snapshot — 30 October 2026

Live build `b95ff43`, commit `b95ff43a9d59bc33a1004b26c1146d5a2c722713`. [Pages build, deployment and live smoke](https://github.com/Tajoor621/JUW-MicroSlides/actions/runs/41058384019) passed. The identical source tree passed [Windows installer/native UI qualification](https://github.com/Tajoor621/JUW-MicroSlides/actions/runs/41057347803). [Browser/export artefacts](https://github.com/Tajoor621/JUW-MicroSlides/actions/runs/41058384019/artifacts/12977978142) include the regenerated conjugation deck and notes PDF checks. Generated evidence belongs in CI artefacts, not documentation files.

## Release candidate checks — 31 October 2026

[PR #38](https://github.com/Tajoor621/JUW-MicroSlides/pull/38) retains the task commit list. [Candidate CI](https://github.com/Tajoor621/JUW-MicroSlides/actions/runs/41199443504) checked head `93306cb`: source suites, the pinned textbook edition, automatic notes PDF preparation, 20-slide native exports and offline notes, and the regenerated 18-slide conjugation PPTX/PDF. This is candidate software evidence, not the final deployed build or educator approval. Subsequent changes must pass their own checks. Use the live metadata below for the deployed source/run.

## Current revision evidence

Use the current PR's checks and [Actions](https://github.com/Tajoor621/JUW-MicroSlides/actions). The live metadata includes the full source commit and its build/deploy workflow URL. Compare [live build-info.json](https://tajoor621.github.io/JUW-MicroSlides/build-info.json) with its main workflow SHA. The existing smoke job checks this after every deployment. A documentation commit changes the build ID too; the snapshot above is dated, not a permanent latest-build assertion.

Keep lint, typecheck, UK English, tests, dependency audit, coverage contracts, production build, notes PDF, editable export, offline/persistence and live smoke checks passing. Fixtures test software contracts, not universal microbiology accuracy. Real literature may be sparse, stale or inappropriate for teaching.

## Checks requiring external access

The owner-selected 1,254-pixel department JPEG supplied on 31 October is integrated; dimensional qualification is separate from visual inspection. Actual Note20/Chrome/Samsung Internet and Microsoft PowerPoint tests remain unperformed. Record physical results only in [the device checklist](QA-PHONE-NOTE20.md). Teacher-authored concept approval, a department topic list and independent scientific assessment remain outstanding. Never infer these from CI or an assistant-led source comparison.
