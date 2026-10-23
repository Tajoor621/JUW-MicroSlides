# V7.0 lecture workflows

The owner's 23 October 2026 V7.0 specification supersedes the V6.2.1 version lock. Application/package/native identity is V7.0/7.0.0; historical project files and qualification evidence remain readable.

## Generation

The authoring source (Knowledge or AI) remains separate from the new Generation Mode. Standard Lecture preserves the existing research/AI path, with count allocation for optional objectives and assessment. A one- or two-slide standard lecture embeds an objective in its teaching content when enabled, preserving a substantive short lecture. Assessment requires enough space and at least three distinct source-backed teaching sections.

Pathogen Profile allocates the canonical taxonomy, morphology, culture, virulence, pathogenesis, diagnosis, susceptibility/resistance and epidemiology/prevention sections in order, followed by takeaways and references. Additional slides expand each section in place. With objectives enabled its minimum is 12 slides; optional assessments reserve two further slides. NCBI Taxonomy can supply a cached lineage for an unambiguous scientific name. Database lineage does not establish accepted genome-based nomenclature; inspect current primary sources.

Laboratory Method allocates materials, timed procedure, interpretation, QC, biosafety/PPE and troubleshooting, followed by takeaways/references. With objectives its minimum is 10. Timings are extracted only when present in the source; unspecified values remain empty and block teaching export. Biosafety is an activity-specific review requirement, never a universal automatic BSL assignment.

Clinical Case Series allocates presentation/work-up and resolution/management slides for each of 3–8 cases. Source wording or labelled instructor notes populate the fields. Missing differentials, results, diagnoses and management remain visible review blockers. Presentation slides and audience frames withhold structured results, diagnosis and management until the resolution phase. Published-source excerpts are not falsely labelled as invented patients. The app never invents a patient identity or treatment recommendation to fill a missing case field. Research-generated presentation and resolution phases must share a source record; mixed supplied/retrieved phases or unrelated case reports stop generation. A shared publication is only a continuity screen: the instructor must still confirm the same patient or clearly labelled teaching case.

Curriculum Module accepts 2–12 distinct lecture topics. The requested 1–50 slide count applies to **each** lecture. Generation saves the complete module atomically after every deck succeeds; cancellation or failure preserves the current library. Course membership, order and prerequisite IDs travel with the decks. Course Builder prevents circular prerequisites and can replace a selected content slide with an overview while preserving count and introduction.

Focus depth influences model guidance and difficulty. Visual emphasis chooses the related palette. Exhaustive is a planning preference, not a claim of exhaustive scientific coverage.

## Offline section notes

Structured modes can read supplied notes without a network. Use Markdown headings matching the canonical section titles, for example:

```text
## Taxonomy & nomenclature
Your source-supported teaching statements.
Taxonomy: Family name > Genus name > Species name

## Protocol steps & timing
Your actual protocol step with its source-specific duration and source URL.

## Case 1: presentation & work-up
Vignette: Your reviewed teaching vignette.
Differential: Your evidence-supported alternatives.
Work-up: Your evidence-supported investigation.
```

No specimen fact, numerical value, protocol, PMID, diagnosis or treatment is supplied by this example. Labelled notes remain unverified draft content. Save the underlying sources and references through Evidence/Review. If there is insufficient distinct content for the requested count, generation fails rather than padding or repeating it. Offline lookup uses only available notes/cached sources and installed models.

## Editing and media

New layouts include pathogen cards, protocols, clinical cases, differential/comparison tables, objectives, assessments, takeaways, data charts and taxonomy trees. Original process-flow remains supported. The structured editor exposes scientific tables with editable cells, protocol actions/timing/source URLs, case phases, question options and answer keys, numerical chart points and parent-index taxonomy nodes. It supports difficulty, misconceptions, clinical pearls, takeaways and selected process-step builds.

Media retains a separate collection. Scientific tags are stored per item and per slide. Creator/source/reuse terms are visible; unknown attribution/licensing blocks attachment. Deterministic tags can be inferred from existing media kinds and changed in the inspector. Original conceptual SVG templates for viral cycles, biofilm stages, conjugation, Gram wall and One Health work locally. They require scientific inspection; they are not experimental images or validated models.

## Evidence and currency

Consensus, emerging, guideline-linked and needs-verification flags describe review state. The explicit needs-verification flag must be resolved before teaching export. Recent guideline searches and official EUCAST, CLSI, IDSA, CDC and WHO portals are optional candidates; nothing is attached automatically. The literature timestamp records a search, not approval of guideline currency or study quality. Publication identity/currentness checks, source-passage review and named final instructor verification remain distinct.

New scientific fields participate in surface snapshots and the final deck hash. Timings must occur verbatim in the step's supporting quotation and use its specified source URL. Chart data require source-linked numeric traceability. Scientific structured content cannot use a nonfactual verdict to bypass sourcing. Instruction-only objective slides use explicit surface review; assessment slides require checked primary evidence and review of question/answer content. These new pedagogical layouts do not demand an unrelated enzyme benchmark or illustration. Existing scientific content layouts retain their previous visual, quantitative, depth and primary-reference checks.

## Exports and recovery

PPTX, PDF and teaching packs retain the shared gate. New student handout PDF, single-page protocol-card PDF and high-contrast accessible HTML also require the same reviewed revision. Handouts omit assessment answer keys; current keys are generated from structured records into instructor speaker notes. Protocol cards reject overflow instead of silently dropping steps. PDF handouts embed the bundled licensed Unicode fonts. High-contrast slide styling is available for reviewed PPTX/PDF after re-verification.

JSON and portable recovery retain all structured fields and course membership. Markdown recovery includes human-readable notes and a complete fenced JSON backup that the Library restore action can read. Recovery is available while teaching export is blocked. It includes private instructor notes and assessment answers; share deliberately.

## Qualification boundaries

Automated tests use explicitly synthetic software material. They cannot certify scientific accuracy, specialist credentials, real-case management, guideline applicability, actual Office/Google Slides rendering or physical classroom accessibility. Existing independent-review and physical qualification requirements remain open. V7 does not add a hosted AI service, trusted installer signing, PPTX font embedding or PDF-UA certification. Formal source scarcity remains an explicit generation/review condition rather than a fabricated success.

The [23 October software validation record](qualification/v7-software-workflows-2026-10-23.md) lists the exercised paths and remaining qualifications.
