# Command reference — V6.2.1

The supported product is static Pages. No command below requires Postgres, a sign-in service or a paid cloud AI key. Run from the repository root with Node.js 24/npm 11.9.0.

## Required source and deployment checks

| Command                             | Purpose                                          |
| ----------------------------------- | ------------------------------------------------ |
| `npm ci`                            | Install locked dependencies.                     |
| `npm run dev`                       | Develop the static Pages UI.                     |
| `npm run typecheck`                 | Type-check supported source.                     |
| `npm run lint`                      | Check source rules.                              |
| `npm test`                          | Run deterministic unit/regression checks.        |
| `npm audit --audit-level=high`      | Blocking dependency vulnerability check.         |
| `npm run test:version-lock`         | Check V6.2.1 across package/web/native metadata. |
| `npm run build` / `build:pages`     | Build the supported static distribution.         |
| `npm run preview` / `preview:pages` | Inspect built Pages output.                      |

The Pages CI additionally runs every `test:*` command listed below, then all `qa:*` browser commands. It runs Gitleaks before deployment. No reviewer attestation unlocks export.

## Deterministic suites required by Pages CI

`test:research` covers citation/import and transport rules. `test:topics` covers topic specificity, media separation and source matching. `test:generation` covers exact counts and source/model fixtures. `test:scientific` covers source/notice/context contracts. `test:professional` covers draft/export/project behaviour. `test:audit` covers provenance and data protection. `test:lecture` covers generation modes/assessment records. `test:teaching`, `test:release` and `test:lecturer` include historical evidence/review API compatibility; their names do not imply active Review UI or gated downloads.

`qa:reviewed-export` is a legacy command name for **ungated editable exports**, Writing Notes, Refresh and mobile checks. `qa:pages` checks browser/exports/offline behaviour. `qa:lecture` checks structured modes. `qa:topic-recovery` checks generation/display recovery. Build Pages first and set `JUW_CHROMIUM` to an installed Chrome/Chromium binary when needed. `JUW_QA_OUTPUT` selects the CI artefact directory.

## Optional Windows companion

`desktop:icons`, `dev:desktop`, `build:desktop`, `desktop` and `desktop:build` require Rust/Tauri and native platform tools. The desktop companion uses local SQLite, not a hosted database. Windows CI packages and smoke-tests it separately. It is not required to use or deploy Pages.

## Source and rendering qualification

`test:slide-fidelity` checks shared scene rules. `benchmark:live` is used by the manual scientific-source matrix workflows and can be slow or provider-limited. Its manifest and planner remain required. Unused semantic benchmark/review CLI wrappers were removed; evaluation helpers retained by CI still test historical evidence formats and cannot establish scientific approval.

`qa:notes` checks A4/source/persistence/download behaviour. `node scripts/qa-textbook-sources.mjs` checks the pinned historical source edition in Actions, after Poppler is installed. `node scripts/logo-assets.mjs` qualifies the owner-selected JPEG. Generated reports, PDFs and screenshots belong in ignored output directories or CI artefacts. The owner can inspect Actions from a phone; local commands are not required as release evidence.

## Optional real local AI qualification

`JUW_OLLAMA_MODEL=<installed-model> npm run qa:local-ai` exercises actual local Ollama and public literature retrieval through the application generation engine. Set `JUW_OLLAMA_URL` only for your own local/private server; default is `http://127.0.0.1:11434`. The command does not install/start a server, download a model, change app settings or write saved decks. Outputs go to the ignored qualification directory (or `JUW_QA_OUTPUT`). It records server/model digest, real call outcomes, exact count and source checks; raw prompts and source text are not retained in the report.

A request failure can preserve a complete source draft, but is not an AI-writing pass. If every model body is rejected/repeated, the report says filtering was verified; this does not qualify that model as a lecture writer. Node/server tests do not establish browser CORS/private-network permission, physical-phone acceptance, Office rendering or scientific accuracy. Small CPU models used in development checks are not teaching-quality recommendations. This optional command is not part of default CI and makes no paid cloud calls.

`node scripts/record-dependency-audit.mjs` is a CI evidence step after the registry JSON audit. It records installed versions/paths and proposed remedies without applying changes or suppressing advisories. The separate `npm audit --audit-level=high` remains blocking.
