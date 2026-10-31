# Slide visual fidelity — JUW-MicroSlides V6.2.1

The editor and export use a shared 1,280 × 720 composition. Title and content themes use the topic selector; existing saved slide themes remain editable. Decorative topic SVGs identify a subject visually and are not validated scientific figures. Figures require their own caption, source, attribution and descriptive alt text.

PPTX keeps native editable text and supported SVG diagrams. A raster fallback assists viewers without compatible SVG support; original bitmap quality remains limited by the supplied source. The owner-selected department JPEG is embedded at its full original resolution. The crest/seal source files remain vector. PDF is for reading/printing; educational notes use A4 portrait pages and a cached high-resolution seal rendering for reliable running headers.

Every export keeps “Unverified AI-assisted draft” and “Not yet expert-reviewed”. No scientific Review menu or export review gate exists. Source matching and output geometry do not certify factual accuracy.

## Check a revision

Inspect its [Actions](https://github.com/Tajoor621/JUW-MicroSlides/actions) results and browser/export artefacts. CI checks count, native text, vector/fallback presence, shared geometry, theme contrast, artwork bytes and desktop/portrait previews. Rendered notes checks inspect the visible watermark and disclosure lines as well as extracted text. The desktop timing profile is hosted Chromium emulation, not physical Note20 hardware.

Use the [device checklist](QA-PHONE-NOTE20.md) for actual Chrome, Samsung Internet and PowerPoint testing. Check editable text, organism italics, fonts, figure captions and every slide/page at normal viewing size. Installed fonts and Office rendering can change metrics; CI does not replace that inspection. Keep generated PPTX/PDF/screenshots in CI artefacts. Historical regression reports are archived from the recorded source commit and must not be presented as current passes.
