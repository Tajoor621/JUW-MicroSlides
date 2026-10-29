# Educational workflow report — V6.2.1

29 October 2026. Package `juw-microslides` remains version `6.2.1`. [Implementation PR #33](https://github.com/Tajoor621/JUW-MicroSlides/pull/33) is merged. Verified application build: `e47ffd0` (`e47ffd0c4c294cb6d82456dbf7c3999baca61a1c`).

| Section | Changes | Remaining limits |
| --- | --- | --- |
| A | Untrack 89 QA files under screenshots/; ignore that directory. Repair README steps 4–7, add the personal-use notice in README/Help, audit dependencies and remove 29 unused packages. Retain CSS-imported Tailwind/animation CSS and production fonts. Confirm the server archive exists. Document three hosting options with official sources. Record exact published reference titles and bibliographic check dates. | No hosting choice, visibility change or open-source licence was applied. Bibliographic identity is separate from scientific verification. |
| B | Convert authored prose/prompts to UK English, document style and add static prose/one-word-label regression checks with explicit CSS exceptions. | Keep original quotations, titles, organism names, identifiers and file names. Dynamic user/provider prose is outside static lint. |
| C | Retain original active branding, qualify PNG signatures/dimensions, refresh independent cache keys and document reconstructed assets separately. | **logo resolution below target**. Original departmental artwork is still needed. No logo-resolution fix or physical-phone sharpness sign-off is claimed. |
| D | Configure 30-minute research attempts, show progress/cancellation/resume guidance, persist batches/passages/cursors locally, add OpenAlex fallback to Europe PMC/PubMed, check extractive research bullets against passages, show Source needed and add 20-topic count/source/failure contracts. Document bundled/offline limits. | Exact-text containment is extractive support, not semantic entailment. Full factual verification of every authored field, bundled lesson and AI response is **not established**. Coverage of every topic is not claimed. |
| E | Add structured source-traced A4 portrait PDF notes, 20 mm body margins, bundled DejaVu, a 12-page limit without truncation, repeated draft/seal/page markings and a centred 6% official-crest watermark behind text. Omit unsupported note statements and non-guideline treatment material; require a guideline year and clinical-use reminder. Archive notes locally and preserve structured notes plus legacy working text in full JSON backups. | Strict note generation fails when attributable DOI/PMID passages are insufficient. Missing sections stay explicit. This is not independently authored or verified textbook content. |
| F | Run code/browser/PDF checks, regenerate the real 18-slide conjugation export in CI, add rendered watermark checks and document physical Note20 acceptance. | Physical Note20, actual Microsoft PowerPoint rendering, broad live-provider qualification and independent scientific review remain unperformed. Manual live PDF inspection was interrupted by the browser environment disconnecting. |
| G | Retain V6.2.1, existing IndexedDB and JSON saves, optional local SQLite/Ollama and ungated stamped lecture exports. | No backend, accounts, required paid API, remote deck storage, licence addition, repository-visibility change or Pages-setting change. |

## Test evidence

- Local: `npm ci`, typecheck, lint, 47 unit tests, UK English, Pages production build and high-severity npm audit passed; audit found zero vulnerabilities.
- Additional suites passed: 19 topic checks, 100 generation/count checks, 19 scientific contracts, 13 research checks, professional/audit/lecture/teaching/release/lecturer/slide-fidelity suites. Archived review tests preserve record compatibility; they do not restore an active Review menu or export gate.
- Hosted Chrome: `qa:pages`, `qa:notes`, lecture, topic recovery and editable export checks passed. A4 checks include every-page markings, text extraction, at most 12 pages and Poppler-rendered low-contrast crest pixels. CI generates `conjugation-18.pptx` as an artefact, never source. See the run links in [QA.md](QA.md).
- Controlled source fixtures test software contracts. Their synthetic wording is explicitly not a quotation from the bibliographic records and not scientific evidence. Passing the 20-topic fixture is not universal scientific qualification.
- Local browser QA commands were attempted but Chromium was unavailable; the hosted runner supplied Chrome. Later live UI inspection confirmed build/version, but the browser disconnected before manual PDF inspection finished.

## Decisions still needed

1. Supply original departmental logo artwork (prefer original SVG, otherwise a genuinely high-resolution transparent PNG). The reconstructed deliverables are not official originals and remain inactive.
2. Choose a future private-repository hosting option from [DEPLOYMENT.md](DEPLOYMENT.md). No option has been implemented.

## Task commits

| Commit | Task |
| --- | --- |
| [`b9e2bc2`](https://github.com/Tajoor621/JUW-MicroSlides/commit/b9e2bc23d84053700f4a7d71c4a52ccd5386ebf5) | docs: tidy lecturer workflow and document private hosting options |
| [`2f18555`](https://github.com/Tajoor621/JUW-MicroSlides/commit/2f18555d8bc3e9da4ed2d5012d007371c2eae03b) | docs: record exact conjugation titles and verification limits |
| [`23c49f1`](https://github.com/Tajoor621/JUW-MicroSlides/commit/23c49f1a4ff8316eb42017cc8981f01c770aef78) | build: remove audited unused dependencies and retain CSS imports |
| [`69e0c8e`](https://github.com/Tajoor621/JUW-MicroSlides/commit/69e0c8eae52cc401fb6a0a88807f356bb411f76d) | style: standardise authored prose and prompts on UK English |
| [`10990e6`](https://github.com/Tajoor621/JUW-MicroSlides/commit/10990e6dde0557a2c3be54f6aab901e67435155d) | test: detect low-resolution branding and preserve original artwork |
| [`fd37dc1`](https://github.com/Tajoor621/JUW-MicroSlides/commit/fd37dc1363cccb87deea5d4a8940c5f73e4ebb5f) | feat: checkpoint research batches and check extractive source support |
| [`1df7d5d`](https://github.com/Tajoor621/JUW-MicroSlides/commit/1df7d5da3a06cb4b000f340bc216a67008dec8c7) | feat: export source-traced A4 educational notes and back them up |
| [`5bb1ed0`](https://github.com/Tajoor621/JUW-MicroSlides/commit/5bb1ed0145392361d770058716b070727665afde) | test: qualify A4 notes and preserve physical-device verification gaps |
| [`621cb01`](https://github.com/Tajoor621/JUW-MicroSlides/commit/621cb011c561625773c43d433fb9c7fa530ef7ac) | fix: discard stale notes PDFs and validate source identifiers |
| [`49c6149`](https://github.com/Tajoor621/JUW-MicroSlides/commit/49c61494853242783dba928155fe5121e7be459c) | fix: continue saved research cursors after a bounded attempt |
| [`375400d`](https://github.com/Tajoor621/JUW-MicroSlides/commit/375400d7f7221e00eef5ecfe4478599103c9e445) | fix: keep resume guidance visible and check one-word UK labels |
| [`99c0dad`](https://github.com/Tajoor621/JUW-MicroSlides/commit/99c0dadbbbcf86d0611b64fd42071cd7385081b4) | test: align recovery assertion with UK starter title |
| [`2c5e9da`](https://github.com/Tajoor621/JUW-MicroSlides/commit/2c5e9dadcde328a369cd1766742f0b0067385cb4) | fix: enforce watermark opacity in the SVG renderer and verify pixels |
| [`31d2d34`](https://github.com/Tajoor621/JUW-MicroSlides/commit/31d2d345c66874b2b70a2275aea8ce72dcbe6884) | fix: retain legacy working notes in full JSON backups |
| [`79a510c`](https://github.com/Tajoor621/JUW-MicroSlides/commit/79a510c2f38ab35e1d85c6e2ea063e0247f266cc) | fix: draw a faint official crest behind note text |
| [`75b351b`](https://github.com/Tajoor621/JUW-MicroSlides/commit/75b351bf5bda40f5416341c86c86f634d7160489) | fix: compile the rendered watermark checker correctly |
