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

`test:research` covers citation/import and transport rules. `test:topics` covers topic specificity, media separation and source matching. `test:generation` covers exact counts and source/model fixtures. `test:scientific` covers source/notice/context contracts. `test:professional` covers draft/export/project behavior. `test:audit` covers provenance and data protection. `test:lecture` covers generation modes/assessment records. `test:teaching`, `test:release` and `test:lecturer` include historical evidence/review API compatibility; their names do not imply active Review UI or gated downloads.

`qa:reviewed-export` is a legacy command name for **ungated editable exports**, Writing Notes, Refresh and mobile checks. `qa:pages` checks browser/exports/offline behavior. `qa:lecture` checks structured modes. `qa:topic-recovery` checks generation/display recovery. Build Pages first and set `JUW_CHROMIUM` to an installed Chrome/Chromium binary when needed. `JUW_QA_OUTPUT` selects the CI artifact directory.

## Optional Windows companion

`desktop:icons`, `dev:desktop`, `build:desktop`, `desktop` and `desktop:build` require Rust/Tauri and native platform tools. The desktop companion uses local SQLite, not a hosted database. Windows CI packages and smoke-tests it separately. It is not required to use or deploy Pages.

## Optional specialist/developer qualification

`test:slide-fidelity` checks shared scene rules. `benchmark:live` queries real providers and can be slow/rate-limited. `benchmark:semantic`, `benchmark:semantic:local` and `qualify:semantic` need the documented installed model/provenance inputs. `review:scientific` is an **offline developer CLI** for external-review packs; it does not restore a Review menu or gate exports. `format` rewrites formatting and should be used on intentional files only. `build:dev` builds static development assets. Manual actual-PowerPoint and physical classroom workflows need their documented licensed hardware and cannot be substituted by browser/ZIP checks.

Historical qualification reports keep their original dates and commit hashes. Missing models, missing hardware, untested topics and incomplete results must be reported explicitly. Generated outputs stay in `qualification-results/`, an ignored `screenshots/` directory or the CI artifact directory.
