# Dependency policy — JUW-MicroSlides

The required Pages workflow runs pinned depcheck in GitHub Actions. It retains the complete report and CSS usage explanation in CI artefacts, and fails on genuinely unused or missing packages. `tailwindcss` and `tw-animate-css` are imported by `src/styles.css`; they are required even when depcheck reports them as unused. No package is removed on that false-positive basis.

Keep `npm ci`, the existing npm lockfile, pinned build tooling and the blocking `npm audit --audit-level=high`. The lockfile controls installed versions; optional Tauri dependencies remain locked separately in Cargo.lock. Do not remove bundled fonts or citation style assets required for offline rendering. Historical removal lists belong in CHANGELOG and historical CI artefacts, not a second release report.
