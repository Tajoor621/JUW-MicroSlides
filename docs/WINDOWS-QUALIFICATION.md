# Optional Windows companion — JUW-MicroSlides V6.2.1

The supported lecturer product is the static Pages app. The optional Tauri companion runs the same editing interface with local transactional SQLite, native save/open dialogues and optional configured Ollama. It has no hosted database, sign-in or paid inference. Browser IndexedDB and Windows SQLite remain separate local stores; use JSON or portable projects to move work.

## Obtain and check a build

Use the [Windows Actions workflow](https://github.com/Tajoor621/JUW-MicroSlides/actions/workflows/windows.yml) and select an artefact whose source commit matches the intended release. These are unsigned test installers, not an institutional distribution or a qualified Microsoft Office release. Keep a backup before installing or testing. The device/Office checks remain in [the physical checklist](QA-PHONE-NOTE20.md).

Windows CI builds the executable and NSIS package, runs Rust transaction checks and exercises the native WebView2 editing, persistence/recovery and audience-window boundaries. Read the actual run and artefacts: an implemented test is not a passing result. Hosted runner results cannot establish Note20 behaviour, classroom hardware compatibility, installer signing or scientific accuracy.

## Saves and exports

New generated/exported decks retain the 1–50 count contract. Historical larger archives remain readable without deleting saved slides; create a deliberate smaller working copy for teaching export. Portable projects preserve source passages and embedded media with integrity checks; JSON backups preserve project data and notes. External-only media may still require a connection.

PPTX and PDF are ungated educational drafts. Every exported slide/page retains “Unverified AI-assisted draft” and “Not yet expert-reviewed”. There is no Review menu or reviewed-export workflow. Historical review/attestation fields remain solely for saved-format compatibility; they do not authenticate an educator or certify scientific support.

## Evidence and limits

Use [QA](QA.md) for the release’s commit/run links and [scientific qualification](SCIENTIFIC-QUALIFICATION.md) for claim/source limitations. Earlier Windows implementation reports, including their failures and superseded Review descriptions, are preserved from the fixed historical source commit in CI artefacts. They are not instructions for current menus. Actual Office rendering, physical-device acceptance, external educator approval and any future private-repository hosting choice remain separate decisions/checks.
