# V6.2.1 teaching workflow overhaul — 21 October 2026

This change extends the existing audit repairs with structured teaching authoring and a shared teaching-release gate. It does not merge, publish, authenticate instructor identity, or certify scientific accuracy. The visible application version remains **V6.2.1**.

## Implemented application workflows

- Structured content for definitions, mechanisms, advantages, limitations, pitfalls, takeaways, numerical observations, equations, model assumptions and discussion. Undergraduate, graduate/medical and research audiences have different required depth. Reaction–diffusion topics require appropriate research modelling discussion; no universal kinetic constants, activity recoveries or pore-size ranges are invented.
- Original editable SVG schematics for adsorption, covalent attachment, entrapment, cross-linking, diffusion, biofilm, conceptual peptidoglycan layers, fluorescence and enzyme-related teaching. These are conceptual templates requiring scientific inspection. They are not experimental figures or automatically verified illustrations.
- Schematic/figure-and-text composition, comparison tables, numbered process steps, labelled advantages/limitations, a permanent method-pitfall callout and a content-slide takeaway. Existing subject themes retain distinct colour and icon treatments. Generous text spacing and density limits are backed by rendered export-overflow checks.
- Existing separate scientific media collection, provider provenance and downloads remain available. Explicit attachment or drag-and-drop selects the figure. Attaching a figure replaces a generated schematic and clears stale annotations; removing it does not silently insert another image. Labels, calibrated scale bars and legends are editable. Image decoding and calibration dimensions are checked before teaching export.
- Live recent PubMed candidate lookup, existing OER/PMC discovery, five citation styles (Vancouver, APA, Harvard, Nature, AMA), source-type badges and a bibliography layout using the complete deduplicated reference list. A selected slide can be converted to the bibliography without adding slides. If the bibliography overflows, it must be shortened or the existing deck reorganized before export; full references are also retained in notes and the teaching pack.
- Numerical suggestions quote saved source text verbatim. Metric meaning, experimental conditions, primary-reference linkage and passage review remain mandatory. Recent papers are candidates: the app does not invent journal-impact rankings or certify study quality.
- All ordinary/reviewed PPTX, PDF and teaching-pack entry points use the same release gate. Every content slide needs a visual, alt text, source-linked quantitative data, appropriate depth, a currently checked primary reference, current checks for every attached bibliographic record, and current field/claim reviews. Scientific teaching fields cannot use a “not factual” decision to bypass source review. Provider metadata checks and lecturer passage review remain distinct.
- A named instructor explicitly records final verification after content findings clear and image/layout preflight succeeds. The attestation binds the complete teaching revision; later edits invalidate it. The prepared-by header cannot supply verification automatically. Exports display the name/date and identify this as lecturer self-attestation. Recovery JSON and portable archives remain available while drafts are blocked.
- PPTX exports preserve built-in schematic primitives as native editable Office shapes and text. Other artwork remains an embedded image/vector. PDF embeds the supplied open-licence DejaVu fonts and retains vector primitives. Active or externally dependent SVG content is rejected.
- Teaching packs include PPTX, PDF, speaker notes, references, editable schematic SVGs, a revision/verification manifest, font licence and an accessible HTML transcript.
- Google Slides receives an import-compatible PPTX download with explicit import instructions. This does not create or publish a presentation in a Google account.
- Guided First Deck setup, retained Knowledge/Ollama authoring, shared scientific gates for generated drafts, collapsible advanced authoring, lecture-time estimates, keyboard help, dark projector/export styling and one-point-at-a-time presentation reveal. Audience frames include visible teaching data and source-type labels while excluding source quotations, private notes and raw review records.
- Old archives remain readable. The teaching export range remains 1–50 slides; generation keeps the requested count. Original university branding and the course/date/educational-use footer remain fixed in slide rendering.

## Deliberate qualification boundaries and remaining work

| Requirement                                        | Current disposition                                                                                                                                                                                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scientific completeness                            | Export gate and review tools implemented. Actual supporting passages, correct numerical interpretations and instructor decisions must be supplied for each real lecture. Neither a heuristic nor an AI response establishes scientific truth. |
| Primary-source quality / recent high-impact papers | Publication-currentness checks and instructor classification supported. Journal impact and experimental study quality are not independently established.                                                                                      |
| Automatic topic-specific numerical benchmarks      | Verbatim saved-source suggestions supported. No generic activity-recovery, loading, diffusivity or pore-size values are inserted as universal facts.                                                                                          |
| Native Google Slides account export                | Import-compatible PPTX supported. Authenticated account creation and an actual Google Slides round-trip remain unqualified.                                                                                                                   |
| Embedded fonts in PPTX                             | Not implemented. Office files declare Arial/Georgia and require compatible installed fonts. PDF embeds the bundled licensed fonts. Do not advertise PPTX font embedding.                                                                      |
| Accessibility                                      | Semantic editor controls, image alt text, contrast options and an accessible teaching-pack transcript implemented. Tagged-PDF/PDF-UA and Office screen-reader certification are not established.                                              |
| Bibliography pagination                            | Complete bibliography layout and handout supported. Automatic multi-page bibliography allocation within an exact requested slide count remains future work.                                                                                   |
| Diagram editing                                    | SVG source and native Office primitive editing supported. The editor exposes template selection, heading, annotations and legends; it is not a general node/path vector editor.                                                               |
| Model-based microbiology/image review              | Existing reviewer workflow retained. No model or independent reviewer has been newly qualified by this code change.                                                                                                                           |
| Institutional release                              | Requires current-head CI, actual licensed PowerPoint/Google Slides checks, independent microbiology review, classroom accessibility/presentation checks and the existing signing decision.                                                    |

## Verification

Tests use explicitly synthetic software fixtures. Their quotations, primary-reference metadata and instructor attestations are test data, not genuine papers or independent scientific review. Production gates are exercised directly; there is no test-only export bypass.

- Teaching regression coverage includes primary-reference identity matching, saved numerical quotation checks, required visuals/alt/depth/density, review invalidation, backup preservation, named verification, audience privacy and every teaching-export entry point.
- Browser qualification covers corrupt PNG/SVG rejection, valid PPTX, native editable diagram primitives, embedded-font PDF, teaching-pack contents, reveal interaction and invalidation after editing.
- The broader Pages workflow retains reviewed synthetic 50-slide export geometry checks across desktop/mobile and subject themes. Unreviewed generated decks now assert blocked export, while their recovery/download workflows remain available.
- The licensed PowerPoint workflow still consumes real reviewed synthetic PPTX fixtures and preview baselines. Passing ZIP/XML/browser tests does not count as passing that licensed renderer.

## Three highest-priority next steps

1. Review a representative real lecture with named microbiology instructors: verify claims, template annotations, equations, experimental conditions, numerical values, primary papers and media reuse terms, then record explicit final verification.
2. Run current-head Windows/Pages/security checks and actual licensed PowerPoint plus Google Slides import checks, including dense methods, research equations, dark mode and calibrated micrographs. Resolve rendering/accessibility defects before release.
3. Complete the outstanding export qualifications: PPTX font embedding, tagged-PDF/Office accessibility and automatic bibliography pagination. Preserve the honest draft/release boundaries until those capabilities are implemented and independently assessed.

### Local verification results for this implementation

- Type checking passed. Lint passed with the same four pre-existing warnings and no errors.
- All 276 baseline unit tests passed, alongside the research, topic/media, generation-count, scientific-workflow, professional, lecturer, release, audit and new teaching-gate contracts.
- Production Pages QA passed 42 workflows with no uncaught errors, including reviewed synthetic 50-slide desktop/mobile exports and blocked unreviewed exports.
- Reviewed-format browser checks passed corrupt PNG/SVG rejection, native editable schematic primitives, embedded-font PDF, complete teaching-pack contents, reveal controls, review invalidation, named-verification image/layout preflight, dark-mode re-verification/PDF and guided wizard choices.
- `pdffonts` confirmed that the generated teaching PDF uses embedded TrueType fonts with Unicode mapping. Light and dark PDF samples and desktop/mobile screenshots were inspected.
- Complete npm audit reported zero vulnerabilities. Server, Pages and desktop frontend builds passed.
- The development shell rendered on desktop/mobile without uncaught application errors or horizontal overflow. Its injected external platform script was unavailable in the restricted network (`ERR_EMPTY_RESPONSE`); the branding integration was preserved. This is not reported as a clean external-platform connectivity pass.
- New-head GitHub CI, native Windows installation, the full topic/count matrix, licensed PowerPoint/Google Slides rendering and independent scientific/accessibility review remain separate release qualifications. Previous-head results do not qualify this new source revision.

### Final authoring and CI guardrails

Recent-paper discovery preserves existing reviewed citation metadata, deduplicates DOI/PMID aliases and rejects a result if the research context changed during the request. Structured teaching edits are schema-checked before saving; an oversized paste preserves the previous valid value instead of crashing the editor. Regression checks cover both behaviours.

The first new-head Pages run passed all 42 application workflows but its additional reviewed-export evidence step failed because a test output path assumed `/workspace`. The test now uses the configured CI artefact directory or an operating-system temporary directory, and the Pages job retains those PDFs with the other browser qualification evidence. This was a test-path portability defect, not an export-gate bypass.
