# Dependency policy — JUW-MicroSlides

The required Pages workflow runs pinned depcheck in GitHub Actions. It retains the complete report and CSS usage explanation in CI artefacts, and fails on genuinely unused or missing packages. `tailwindcss` and `tw-animate-css` are imported by `src/styles.css`; they are required even when depcheck reports them as unused. No package is removed on that false-positive basis.

Keep `npm ci`, the existing npm lockfile, pinned build tooling and the blocking `npm audit --audit-level=high`. The lockfile controls installed versions; optional Tauri dependencies remain locked separately in Cargo.lock. Do not remove bundled fonts or citation style assets required for offline rendering. Historical removal lists belong in CHANGELOG and historical CI artefacts, not a second release report.

## Advisory follow-up — 31 October 2026

The verified `5fa73c0` build reported 13 moderate findings through development-only lint tooling and minimatch. The registry’s proposed remediation included a breaking eslint-config-prettier downgrade. The locked older ESLint callers use minimatch’s older default/function interface; a blanket override to the new major has not been justified. No advisory is suppressed and no dependency version is falsified. Keep the high/critical gate blocking; compatible upstream remediation remains outstanding.

[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) lists versions before 11.0.1 as affected and 11.0.1 as patched. Reassess against the current installed dependency tree rather than assuming that a new major is compatible. The Pages workflow now retains the complete registry audit, installed paths/versions, development flags and proposed fixes in CI artefacts. An incomplete registry result fails evidence collection. This does not claim a clean audit or demonstrated exploitability of the app.
