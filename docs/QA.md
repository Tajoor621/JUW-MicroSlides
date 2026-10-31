# JUW-MicroSlides V6.2.1 QA

## Verified release snapshot — 31 October 2026

Live build `5fa73c0`, commit `5fa73c03c21411909d08e054f61d7c01afc47c14`. [Production build/deployment/live smoke](https://github.com/Tajoor621/JUW-MicroSlides/actions/runs/41201445814) and [Windows installer/native checks](https://github.com/Tajoor621/JUW-MicroSlides/actions/runs/41201445826) passed. [Export artefacts](https://github.com/Tajoor621/JUW-MicroSlides/actions/runs/41201445814/artifacts/13042697877) include the regenerated conjugation deck, A4 notes and rendered checks. An old live tab updated successfully, preserved saves, generated exactly three Gram-staining slides and downloaded a two-page note. This dated snapshot precedes the transparent-logo change; every later revision requires its own CI evidence.

## Current revision evidence

Use the current PR's checks and [Actions](https://github.com/Tajoor621/JUW-MicroSlides/actions). The live metadata includes the full source commit and its build/deploy workflow URL. Compare [live build-info.json](https://tajoor621.github.io/JUW-MicroSlides/build-info.json) with its main workflow SHA. The existing smoke job checks this after every deployment. A documentation commit changes the build ID too; the snapshot above is dated, not a permanent latest-build assertion.

Keep lint, typecheck, UK English, tests, dependency audit, coverage contracts, production build, notes PDF, editable export, offline/persistence and live smoke checks passing. Fixtures test software contracts, not universal microbiology accuracy. Real literature may be sparse, stale or inappropriate for teaching.

## Checks requiring external access

The original 1,254-pixel JPEG is retained; the owner-requested transparent PNG display variant is being qualified. Dimensional and alpha checks are separate from visual inspection. Actual Note20/Chrome/Samsung Internet and Microsoft PowerPoint tests remain unperformed. Record physical results only in [the device checklist](QA-PHONE-NOTE20.md). Teacher-authored concept approval, a department topic list and independent scientific assessment remain outstanding. Never infer these from CI or an assistant-led source comparison.

An additional GitHub-generated Pages publisher was observed during the snapshot deployment. The final compiled application won that deployment and passed live smoke, but publishing-source consolidation remains a settings decision. Repository visibility and Pages settings have not been changed.
