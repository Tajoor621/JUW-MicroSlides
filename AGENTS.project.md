# Owner project instructions

## Fixed application version

The owner explicitly requires JUW-MicroSlides to remain **V6.2.1**, regardless of future fixes, feature additions, redesigns, or deployments. Do not increment the application version unless the owner explicitly changes this requirement.

- Keep `JUW.version` in `src/lib/brand.ts` set to `V6.2.1`.
- Use the shared brand version in application UI and server page metadata.
- Keep static page metadata, repository documentation, and package metadata aligned (npm uses `6.2.1`).
- Track subsequent work using commit hashes, dates, and changelog entries under V6.2.1.
- Storage schema versions and content-derived cache hashes may change when technically necessary; they are independent of the fixed application version. Never freeze cache hashes or skip required data migrations to preserve the visible version.
- Preserve all implemented functionality when changing version labels.
