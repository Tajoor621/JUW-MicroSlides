# Continued workflow — V6.2.1

30 October 2026. Package `juw-microslides` remains `6.2.1`. This continues [the A–G report from 29 October](WORKFLOW-REPORT-2026-10-29.md). Merged implementation: [PR #35](https://github.com/Tajoor621/JUW-MicroSlides/pull/35).

## Changes by original section

| Section | This continuation |
| --- | --- |
| A | Preserve repository tidy-up, personal-use notice and static runtime. No visibility or hosting changes. |
| B | Correct the remaining research-control “prioritises” spelling and add a regression rule. Original source wording remains unchanged. |
| C | No original artwork was supplied. **logo resolution below target** remains open. No upscaling or reconstructed artwork was activated. |
| D | Standard/curriculum local AI and AI notes retrieve attributable passages before inference. Accept complete source wording, bind references from the retrieved bank, discard unsupported model text and structures, preserve exact counts, retain the active deck on source failure and honour cancellation. A complete retrieved draft may be retained if inference fails. Reject malformed/gapped OpenAlex abstracts. Check every slide ID and structured surface in the read-only provenance display; linked references alone do not approve a claim. |
| E | Use the same strict passage matcher for notes. A real live run exposed sparse contextual study fragments being labelled ready. New generation excludes first-person/deictic fragments and requires four distinct self-contained statements across two teaching sections, including an explanatory section; otherwise it fails and keeps previous notes. Archived notes remain readable. Source checks and quality heuristics do not constitute scientific validation. |
| F | Add public source-first AI integration, complete-statement/negation, source-identity, structured timing/table and notes-minimum fixtures. Inspect an actual live two-page notes PDF with Poppler. Hosted CI also regenerates the 18-slide conjugation deck as an artefact. See verification below. |
| G | No Review menu or export gate. Draft labels, editable PPTX/PDF, IndexedDB saves, JSON backups, local SQLite/Ollama and the locked version remain. No accounts, backend, paid API, remote deck storage or licence addition. |

## Verification

- Local clean `npm ci`, typecheck, lint, 53 unit checks, UK English, Pages production build and `npm audit --audit-level=high` passed. Audit: zero vulnerabilities.
- Research (13), topic (19), generation/count (100), scientific contracts (19), professional, audit, lecture, teaching, release, lecturer and slide-fidelity suites passed. Historical review-module tests preserve data compatibility; they do not restore the removed feature.
- Controlled source fixtures explicitly use artificial software wording, not quotations from their bibliographic records. Tests prove retrieval order, unsupported model-field removal, exact counts, source-shortage failure, model-failure fallback and cancellation. They do not qualify a live model or prove subject-wide accuracy.
- Local browser QA was attempted but Chromium was unavailable. The installation download was truncated. Hosted Chrome is used by the existing CI pipeline; no workflow was manually triggered.
- Live build `c585d9f` was observed on 30 October with `V6.2.1`. A real Bacterial conjugation note downloaded as a two-page PDF. `pdfinfo`: 595.28 × 841.89 pt, portrait A4. Both pages had extractable text, the draft/personal-use header, running topic, department seal, footer page number and visible centred crest behind readable text. Pixel checks found median green-region red 240 and 95th-percentile chroma 7 on both pages. The content was sparse and is **not** approved teaching material; that observation prompted the new minimum-content failure check.
- The first PR CI attempt, [41041619916](https://github.com/Tajoor621/JUW-MicroSlides/actions/runs/41041619916), passed notes PDF and ungated editable-export checks, including conjugation, but failed an outdated exact setup-message assertion in `qa:pages`. The wording was restored and a new source-display browser assertion added. This initial run is not recorded as an overall pass. The second attempt, [41042095189](https://github.com/Tajoor621/JUW-MicroSlides/actions/runs/41042095189), passed the new source-display check but exposed an ambiguous unconfigured-model text locator because the same error now appears in summary and recovery details. The locator was scoped to its alert and the preserved title is asserted directly; this second attempt is also not an overall pass.

- Final PR head `267e9859aecf0114e6b70f8b77b97f1bdcc048c8` passed [Pages run 41042693878](https://github.com/Tajoor621/JUW-MicroSlides/actions/runs/41042693878), [Windows build 41042693754](https://github.com/Tajoor621/JUW-MicroSlides/actions/runs/41042693754) and native dependency security. The remote source tree matched the local tested tree `fb212b3277a907e90db8138b970f2408743cadd2` before merge.
- Merged application commit `aa584f23b3b0e6e787b1d186af9066c344b274e9` passed [main Pages build, deployment and live smoke run 41043253988](https://github.com/Tajoor621/JUW-MicroSlides/actions/runs/41043253988). The actual browser updated through **Check for updates → Load latest build**, displayed **aa584f2 / V6.2.1**, and retained saved work.
- The [browser export artefact](https://github.com/Tajoor621/JUW-MicroSlides/actions/runs/41042693878/artifacts/12971605618) contains regenerated `conjugation-18.pptx` and PDF, source/geometry checks and rendered QA files. It expires on 28 January 2027. The 18-slide deck remains an unverified editorial draft; no actual Office or independent scientific approval is claimed.

- Live aa584f2 generated **Natural competence in bacteria** as exactly three slides with two cited content slides, selected the new deck and downloaded its PPTX without a gate. ZIP integrity passed; all three slide XML files contained native editable text runs and the draft label. This was a real provider run, not a synthetic fixture. Its two awkward verb/dangling-clause headings prompted the additional source-heading boundary fix listed below. The regression fixture now prefers source-contiguous noun phrases; source body wording is unchanged. Local unit count after that fix: **54 passed**. Successful generation is not scientific or pedagogical qualification.

## Remaining verification limits

Complete-statement identity is a conservative software check, not semantic entailment, study-quality assessment or independent microbiology review. Bundled editorial lessons may have references without retrieved supporting passages; their field display remains reference-only/unverified. Visual meaning, source context, numerical applicability, taxonomy and clinical currency still require expert assessment. Existing saved/editorial content is not silently rewritten or stamped verified. Full factual qualification of every bundled lesson or arbitrary topic is not established.

The new note breadth rule is a heuristic: it rejects the observed sparse-fragment failure but cannot guarantee pedagogical quality. A source shortage must still fail rather than manufacture a complete-looking note. Generic explanatory labels, questions and concepts are not evidence of scientific completeness.

Physical Note20/Chrome/Samsung Internet downloads, real phone keyboard behaviour, actual Microsoft PowerPoint rendering and independent scientific qualification remain unperformed. The original high-resolution logo and future hosting option are the two owner decisions still pending; consult [DEPLOYMENT.md](DEPLOYMENT.md).

## Task commits

| Commit | Task |
| --- | --- |
| [`2c8e786`](https://github.com/Tajoor621/JUW-MicroSlides/commit/2c8e786123e545adf2468274d1b4e453c1660827) | fix: reject incomplete OpenAlex abstract reconstructions |
| [`e569fc2`](https://github.com/Tajoor621/JUW-MicroSlides/commit/e569fc2f0f5aa0c58efc0ba953e9037acac599e7) | style: use UK spelling in research guidance |
| [`b51bd29`](https://github.com/Tajoor621/JUW-MicroSlides/commit/b51bd29e9f63fe09e5e856f6e90565128a241471) | feat: ground local AI drafts in retrieved source passages |
| [`5a57b82`](https://github.com/Tajoor621/JUW-MicroSlides/commit/5a57b82990c8044816cd5bcaef8c1cc24c3e0be9) | fix: reject sparse context-dependent educational notes |
| [`44a80fb`](https://github.com/Tajoor621/JUW-MicroSlides/commit/44a80fb443b0e8b62b3d5e922bc69525ef3319e1) | test: preserve setup guidance and exercise source provenance UI |
| [`267e985`](https://github.com/Tajoor621/JUW-MicroSlides/commit/267e9859aecf0114e6b70f8b77b97f1bdcc048c8) | test: scope model setup failure to its generation alert |
| [`54c56f7`](https://github.com/Tajoor621/JUW-MicroSlides/commit/54c56f751742cb4a5a673636b4deff123452c23b) | fix: prefer concept nouns in competence source headings |
