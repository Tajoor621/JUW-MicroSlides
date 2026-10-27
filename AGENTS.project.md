# Owner project instructions

## Application version

The owner's latest instruction (23 October 2026) restores the permanent **V6.2.1** lock. Use **V6.2.1** in the UI and **6.2.1** in package/native metadata for every feature and fix. The earlier V7 master specification defines feature scope, not an application version change. Identify revisions by commit and date. Keep historical archives and qualification records intact. Cache and storage schema versions remain independent from the app label. The owner’s 24 October 2026 instruction removes the Review feature and all export review gates. Replace Review with independent Writing Notes, retain saved evidence/source records and all media, generation, editable PPTX, PDF and local-first capabilities. Refresh opens an empty workspace without deleting saved decks.

## Topic content and media policy

- Keep the introduction and substantive content aligned with the exact research topic. Do not pad requested counts using generic instructor prompts or unrelated material; if evidence is insufficient, fail generation explicitly and preserve the active deck. A successful generation must contain exactly the user-requested number of slides.
- Use concise concept headings. Do not append the full topic to every heading.
- Keep discovered scientific media in a separate collection. Only explicit user selection may attach an image. Never insert a replacement figure automatically when an image is removed or fails to load.
- Keep provenance and downloads available independently from slide attachment. Social-platform shortcuts are not authenticated integrations or exhaustive retrieval.
- Historical screening/evidence records distinguish heuristics, provider metadata and model-assisted inspection. These do not expose an active Review menu or certify accuracy. Never invent verification.

## Requested count and subject coverage

- Support arbitrary microbiology topics through the research/AI pipeline; bundled topic profiles are optional starting material, not an allowed-topic list.
- The toolbar must open the shared generator, never directly save a short local template.
- Validate the final slide count before writing state. Do not save partial fallbacks as successful decks.
- Preserve the exact editor slide count in PowerPoint; retain full references and extra-media provenance in notes instead of appending pages.

## University branding

- Use the shared transparent university crest in every slide layout, presenter, print and PowerPoint, and avoid white/square logo backplates in the header.
- Preserve the university's original lettering, colours and enclosed light areas. Only the exterior background should be transparent; keep the unmodified source artwork available.

## Shared lecturer and optional Windows contract

- Generation and editable/exported decks are limited to 1–50 slides. Never silently clamp, pad, repeat, or truncate to satisfy the count.
- Preserve older 51–400-slide archives intact; changing the application cap is not permission to delete saved content.
- Evidence statements require exact claim-to-passage relationships. Model screening, metadata matches and lecturer review are separate statuses. Editing a claim invalidates its previous review.
- Desktop data uses transactional SQLite; portable projects preserve evidence and media with integrity checks. Visible version is V6.2.1.

## Supported product and export disclosure — 27 October 2026

The supported lecturer product is the static client-only GitHub Pages application, with zero required paid services, no sign-in and no hosted backend. The former server/Postgres/paid-AI/platform implementation is archived in `archive/server-platform-6702c13`; it is not part of this branch's supported runtime. Optional Tauri uses local transactional SQLite as its sole database. The browser retains IndexedDB and existing saved decks. Every exported PPTX slide and PDF page must display exactly “Unverified AI-assisted draft”, without adding a review gate. README and current instructions must not advertise removed Review menus or gated exports. Keep production fonts for offline editable exports; keep generated test exports in CI artifacts. Remove platform scaffolding and test authentication domains from the supported product.
