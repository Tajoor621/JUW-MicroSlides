# Owner project instructions

## Fixed application version

The owner explicitly requires JUW-MicroSlides to remain **V6.2.1**, regardless of future fixes, feature additions, redesigns, or deployments. Do not increment the application version unless the owner explicitly changes this requirement.

- Keep `JUW.version` in `src/lib/brand.ts` set to `V6.2.1`.
- Use the shared brand version in application UI and server page metadata.
- Keep static page metadata, repository documentation, and package metadata aligned (npm uses `6.2.1`).
- Track subsequent work using commit hashes, dates, and changelog entries under V6.2.1.
- Storage schema versions and content-derived cache hashes may change when technically necessary; they are independent of the fixed application version. Never freeze cache hashes or skip required data migrations to preserve the visible version.
- Preserve all implemented functionality when changing version labels.

## Topic content and media policy

- Keep the introduction and substantive content aligned with the exact research topic. Do not pad requested counts using generic instructor prompts or unrelated material; if evidence is insufficient, fail generation explicitly and preserve the active deck. A successful generation must contain exactly the user-requested number of slides.
- Use concise concept headings. Do not append the full topic to every heading.
- Keep discovered scientific media in a separate collection. Only explicit user selection may attach an image. Never insert a replacement figure automatically when an image is removed or fails to load.
- Keep provenance and downloads available independently from slide attachment. Social-platform shortcuts are not authenticated integrations or exhaustive retrieval.
- Review findings must distinguish screening heuristics, provider metadata checks and actual model-assisted image inspection. Never certify accuracy, invent verification, or silently apply unreviewed model suggestions.

## Requested count and subject coverage

- Support arbitrary microbiology topics through the research/AI pipeline; bundled topic profiles are optional starting material, not an allowed-topic list.
- The toolbar must open the shared generator, never directly save a short local template.
- Validate the final slide count before writing state. Do not save partial fallbacks as successful decks.
- Preserve the exact editor slide count in PowerPoint; retain full references and extra-media provenance in notes instead of appending pages.

## University branding

- Use the shared transparent university crest in every slide layout, presenter, print and PowerPoint, and avoid white/square logo backplates in the header.
- Preserve the university's original lettering, colours and enclosed light areas. Only the exterior background should be transparent; keep the unmodified source artwork available.
