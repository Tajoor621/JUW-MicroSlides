# V6.2.1 audit remediation — 21 October 2026

The visible version remains V6.2.1. This record describes implemented software changes, not independent scientific certification or a published release. PR #1 remains the integration boundary; its latest CI run identifies the exact tested commit.

## Three workstreams

1. **Evidence and reviewed export:** source text now participates through SHA-256 in surface-review context. Claim confirmations bind the claim, evidence and linked saved-source revision; changed context blocks export even after headings are re-reviewed. Old saved lectures remain available, but legacy source-linked reviews require renewed confirmation. The evidence overview and export share one publication-status predicate. Required primary figures are decoded before scene capture; corrupt PNG/SVG images stop reviewed export instead of producing an approved-looking placeholder. Draft exports remain available.
2. **Portability and release inputs:** portable packing tracks shared media objects without fetching rewritten asset identifiers. Streaming downloads enforce 25 MB per image and the remaining 100 MB project budget before retaining over-budget chunks. Native Ollama traffic uses a bounded bridge restricted to the authoring window, local/private IPs, and chat/embed/tags endpoints. Redirects and system proxies are disabled; timeouts, request/response limits and cancellation apply. Renderer CSP remains constrained. Cargo.lock and Rust 1.99.1 are pinned; Windows builds/tests enforce locked resolution and record installer hashes, signature status and dependency-lock hashes. Owner-paid cloud calls default to disabled and require explicit server opt-in plus authenticated server identity; local Ollama remains the zero-cost path.
3. **Qualification:** the new regression and reviewed-download checks run in Pages CI; Windows CI exercises the native bridge, public-host rejection, cancellation and audience denial. Native dependency auditing has a separate retained report. The owner-labelled full scientific matrix restarts on a PR source update and supersedes its old run, preserving one frozen source identity per run. Independent scientific and physical qualification remain separate, unfinished evidence requirements.

## Evidence collected locally

- 276 unit tests passed: 221 script tests and 55 TypeScript tests.
- Type checking passed. Lint has no errors and four pre-existing warnings.
- Research, topic/media, generation, scientific, professional, lecturer and release suites passed; the generation suite covers 99 cases.
- New audit regressions passed: source-context edits, stale claim provenance despite fresh heading reviews, schema preservation, publication-summary consistency, alias-safe media packaging and streaming cancellation/size boundaries.
- Browser download tests: corrupt PNG and SVG produce an explicit error and no reviewed download; a valid SVG still produces a PowerPoint package.
- Full production Pages browser QA passed 42 workflows with no uncaught errors. Recovery testing explicitly unlocks a recovered locked slide before attempting edits; restored lock state is preserved.
- Server, Pages and desktop frontend builds passed. Installed Windows execution of the new native bridge requires the new Windows CI result; prior-head success cannot qualify this native change.
- npm audit after compatible lock updates: zero vulnerabilities across the complete installed JavaScript graph. Patched resolutions include Vite 8.2.4, image-size 2.0.3, source-map-js 1.2.2 and compatible brace-expansion patches.
- cargo-audit 0.22.2 found zero active vulnerability entries in Cargo.lock, with the following informational warnings retained for upstream review.

| Warning           | Package                | Disposition                                                                                    |
| ----------------- | ---------------------- | ---------------------------------------------------------------------------------------------- |
| RUSTSEC-2024-0370 | proc-macro-error 1.0.4 | Upstream unmaintained macro dependency; track Tauri dependency migration                       |
| RUSTSEC-2026-0371 | zbus_names 4.3.5       | Upstream unmaintained D-Bus dependency; assess Linux target separately                         |
| RUSTSEC-2026-0370 | zvariant 5.15.1        | Upstream unmaintained D-Bus dependency; assess Linux target separately                         |
| RUSTSEC-2026-0372 | zvariant_derive 5.15.1 | Upstream unmaintained D-Bus dependency; assess Linux target separately                         |
| RUSTSEC-2024-0429 | glib 0.18.5            | Informational soundness warning in the GTK dependency graph; Linux desktop remains unqualified |

Zero active audit entries do not mean absence of every security risk. Do not suppress these warnings or describe the native graph as warning-free. Public paid-model operation still needs an external distributed budget/quota policy; the default configuration sends no paid requests.

## Remaining release gates

- Inspect the latest Windows build/install/Rust/native-UI and provenance results after integration. The new native policy unit cases and loopback/cancellation harness do not establish private-network reachability on physical devices.
- Finish the latest 200-topic × 50-count matrix and account for every missing/failed result. Earlier-revision results are historical evidence only. Full runs can take hours or days.
- Rebuild review packs against the frozen release candidate and obtain verified independent microbiology reviewers. The archived cohort still has zero completed independent human reviews; synthetic software fixtures do not change that count.
- Acquire an independently labelled blind semantic holdout and representative installed model. The failed public MiniLM development evaluation remains failed.
- Complete all 16 physical classroom cases, including real Microsoft PowerPoint rendering, offline cold start, projector/DPI/reconnect, accessibility, low disk, interruption recovery and long-lecture performance.
- Obtain trusted signing credentials and qualify same-version distribution/recovery. Provenance records unsigned status honestly; it does not manufacture a trusted signature.

The software workstreams are integrated and testable. These external evidence gates must remain pending until the actual reviews, measurements and signatures exist. No merge or deployment is implied by successful PR checks.
