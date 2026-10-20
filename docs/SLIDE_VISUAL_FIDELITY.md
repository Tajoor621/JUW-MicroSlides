# Topic-coordinated slides and sharp PowerPoint export

## Scope of this change

This update **does not alter existing deck JSON, slide text, research claims, source citations, media lists, or slide counts**. The application version remains 6.2.1.

### Topic identity and introductory slide

The title slide is now decorated using the same deterministic research-topic theme selector used by the content slides. Examples include molecular/genomics, culture/enzymes, mycology, clinical, and parasitology. It keeps the established institutional crest, course details, author/department and slide layout. Each existing content slide retains its individually saved theme; the title slide acts as a visual introduction to the overall research topic, not a forced generic template.

Decorative topic SVGs are schematic ornaments, **not scientifically validated illustrations**.

### PPTX visual fidelity

- Text remains native PowerPoint text, so it stays editable and scales without raster blur.
- Embedded topic illustrations and SVG icons now remain **SVG vectors** inside PPTX instead of being flattened into a PNG.
- Bitmap photos/micrographs use source-resolution-aware export up to 3x layout pixels, capped at 4096×2304. Low-resolution source images cannot be made genuinely sharp by upscaling; replace them with higher-resolution, properly licensed originals.
- No change to the 16:9 aspect ratio, slide dimensions, existing references, notes or scientific review gates.

### Validation

Run `node scripts/test-slide-fidelity.mjs`, `npm run typecheck`, `npm run test:professional` and export a sample PPTX. Inspect in Microsoft PowerPoint at 100% and 200%, including a title slide, icon-rich slide and micrograph. Check editable text, sharp vector icon edges, color contrast and any SVG compatibility warnings. Automated source checks do **not** replace manual PowerPoint rendering or a native-office roundtrip.

### Known limitations

- Bitmap quality is limited by the original image resolution and compression.
- PowerPoint SVG support varies by Office version; modern desktop PowerPoint is recommended.
- Installed fonts and office rendering engines can alter text metrics. Keep fonts installed and test actual presentation hardware.
