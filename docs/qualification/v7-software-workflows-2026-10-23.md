# V7.0 software workflow validation — 23 October 2026

This record describes software checks, not scientific certification. Test-only protocol/case/publication records are explicitly synthetic and are never added to the application's bundled teaching content.

## Implemented paths

- Standard, canonical pathogen, laboratory, clinical-case and multi-lecture generation; contextual generation settings; exact requested counts and atomic curriculum saves.
- Bloom-aligned objectives, optional source-backed MCQ/short-answer/image assessment, ten additional structured layouts, editable protocol/case/table/chart/taxonomy fields and progressive process steps.
- Media tags and explicit attribution requirements, original local SVG templates, cached NCBI lineage lookup, evidence flags and opt-in guideline suggestions.
- Structured-field evidence snapshots, source-specific timing checks, public audience answer-key isolation, instructor speaker-note keys, course prerequisite cycle rejection and import identity remapping.
- Gated student handout, protocol card and high-contrast HTML exports; full JSON/Markdown recovery; inherited PPTX/PDF/teaching-pack gates.

## Local verification

| Check | Observed result |
| --- | --- |
| TypeScript and ESLint | Pass; four pre-existing lint warnings |
| Unit tests | 277 tests pass |
| Research, topic, count, scientific, professional, audit, teaching, release and lecturer contracts | Pass |
| V7 contracts | Pass: offline section allocation, invalid count rejection, protocol omissions and source timing, grounded extraction, rejection of unrelated or mixed-source case phases, taxonomy XML identity/entity rejection, review invalidation, assessment privacy, short-deck objectives, Markdown roundtrip, course cycles and restoration |
| Existing production browser suite | 44 checks pass; no uncaught errors |
| V7 production browser suite | 7 checks pass; no uncaught errors; pathogen creation, protocol/table edits, blocked draft export, mobile width, three clinical case pairs and two-lecture curriculum backup |
| Reviewed export suite | Pass: corrupt images blocked, editable PPTX schematics, embedded-font PDF, complete teaching pack, progressive reveal, final verification and invalidation, new handout/card/HTML downloads |
| Protocol-card inspection | Actual A4 PDF, one page, embedded Unicode fonts; extracted text and rendered page inspected |
| Pages and desktop web builds | Pass |
| npm security audit | Zero reported vulnerabilities |

The legacy export-parity fixture explicitly clears objective fields when exercising its original five layouts. This keeps the test scoped to the intended geometry; production review gates are unchanged.

## Remaining qualification

Independent microbiologist review, real patient/protocol interpretation, current guideline applicability, live local/cloud-model performance, physical classroom accessibility and licensed Microsoft PowerPoint/Google Slides qualification are not established by these tests. Missing source details stay empty and block reviewed teaching export. No automatic numeric benchmark, clinical recommendation, BSL assignment, PMID or human approval is invented.

PDF handouts embed fonts but are not certified PDF/UA. PPTX diagrams remain editable within the existing export vocabulary; PPTX font embedding and trusted installer signing are not introduced. Online sources and optional local models must actually be available; offline generation uses saved material. A successful literature search timestamp is not approval of guideline currency.

See [V7 workflow guide](../V7-LECTURE-WORKFLOWS.md) for supported operation and review requirements. Historical V6.2.1 qualifications remain historical and do not certify V7.
