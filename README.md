# JUW-MicroSlides V6.2.1

The owner has fixed the application version at **V6.2.1**. Keep this version for all future fixes and feature updates; identify revisions by commit and date instead.

A local-first microbiology lecture editor with editable slides, citations, presentation mode, PowerPoint export, and printable slides.

## Public deployment

The GitHub Pages build is a separate static entry point; it does not upload or execute TanStack server functions. Use Node.js 24 and npm 11.9.0. Run `npm ci` and `npm run build:pages`. Output is `dist-pages/`, with the application base `/JUW-MicroSlides/`.

The workflow `.github/workflows/pages.yml` checks types, lint, platform tests, research/data protection checks, and desktop/mobile browser workflows before deploying. In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions**. Repository administration settings are not embedded in the source code. If Actions cannot publish because Pages is disabled, enable this setting and rerun the workflow.

`npm run build` retains the original server/Vercel deployment. Server AI uses a server-side `XAI_API_KEY`; never place it in a VITE variable, committed file, or browser field. Provider availability/model names must be verified in your own provider account before enabling paid requests. The per-instance AI request quota is not a global billing cap; configure a provider spending limit before a public server deployment.

## Everyday use

1. Enter a topic, choose a count/level, and generate in Knowledge mode. This uses bundled material and topic templates; it is not a scientific fact-checking system.
2. Edit slides and speaker notes. Open Help in each inspector tab for task instructions and limitations.
3. Search Commons images and PubMed/OpenAlex references while online. Review source relevance and each asset's reuse licence.
4. Open Library to download an editable JSON backup. Restore adds copies, preserving existing decks. Use Current deck backup to split a large library.
5. Save external images offline while connected, then export a new backup. Failed CORS/unsupported/oversized images remain external links and are reported. A download does not imply all remote images are embedded.
6. PowerPoint exports notes, a references appendix, and extra images as additional figure slides. Verify layout and attribution before distribution. Print/PDF uses the browser print dialog.

## Storage, offline operation and recovery

Decks are stored in IndexedDB on this browser/origin. Existing data under `juw-microslides-v661-intro-logo` is copied during migration and the old copy is retained. Fresh samples no longer override older saved libraries. Invalid saved data is archived intact; Library → Download previous raw save retrieves it for repair instead of silently discarding it. There is no silent 24-deck eviction.

Offline launch becomes available after the service worker finishes its first successful online install. Bundled app assets and illustrations are precached. Literature/image searches require a connection. External images need successful embedding to be available offline. Browser storage can still be cleared or evicted: keep exported backups outside the browser. JSON backup schema version is 1; imports are validated before adding copies, with a 100 MB / 500-deck import ceiling.

Undo/redo retains up to 20 library snapshots in memory. Use Library buttons, Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y outside text fields. Native undo remains available while editing text. History resets on reload. New service workers wait for older app tabs to close before activation; close/reopen all app tabs after saving to receive an update.

## Optional local AI with Ollama

Settings accepts an explicitly configured local computer/private LAN server address and installed model name. Start and configure Ollama yourself, install the chosen model, and permit the exact website origin in its CORS settings if required. Network/browser security rules may prevent HTTPS-to-local HTTP connections. On a phone, localhost refers to the phone, not your computer; use the computer's LAN address. The app does not run or install a model on a phone.

Only a user-triggered AI generation or Copilot request sends content to that configured local server. Generation accepts at most 36 AI slides per request and validates returned JSON/count. If unavailable or invalid, the UI discloses the reason and creates a labelled Knowledge draft. No paid cloud API key is requested by the static site.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run test:research`
- `npm run build:pages`
- `npx playwright install chromium` then `npm run qa:pages`
- `npm run build` for the retained server target

`qa:pages` serves the built subdirectory in-process, checks desktop/mobile generation, >24 saved decks, backup/restore, undo/redo, reload persistence, PPTX download, and offline reopening. `JUW_QA_OUTPUT` sets its screenshot/report directory; `JUW_CHROMIUM` optionally selects an existing Chromium executable. Tests use Playwright when the optional agent-browser daemon is unavailable in restricted environments.

## Known limits and remaining work

- Scientific correctness, up-to-date clinical recommendations, and claim-to-source support require human review. Metadata lookup is not evidence verification.
- Unsupported topics receive an explicit coverage notice. The generator no longer pads decks with teaching instructions or unrelated material. Requested counts up to 400 are an upper limit, not a guarantee of 400 distinct evidence-supported slides.
- Elicit support imports exports; it is not an Elicit account connection. Ambiguous legacy author strings cannot be reconstructed reliably; structured BibTeX author data is retained.
- External searches depend on upstream availability, CORS, and provider quotas. This release does not certify their current availability in every region.
- PowerPoint exports all images, but additional images use extra figure slides rather than an exact multi-image copy of the editor. Browser fonts and PowerPoint fonts can differ. The reference appendix can add slides beyond the requested lecture count.
- Cross-device sync, multi-user collaboration, Android-native backup interchange, and an independently tested APK are not included. Use the browser backup format for browser-to-browser transfer.
- A physical Samsung-device test and a real Ollama connection remain required before claiming those environments are certified. Browser emulation is not a physical-device test.

## Third-party content and licences

Bundled CSL styles retain their licence declarations; see `src/lib/csl/README.md`. Reference parsing/formatting uses Citation.js, CSL/citeproc, and Papa Parse. External images retain provider metadata and must be checked individually. No new blanket licence is granted for university marks, third-party scientific images, or the existing repository. Grok platform branding/preview integration remains preserved.

## Topic-focused generation, separate media, and specialist review

The introduction uses the exact research topic and its scope. Concept headings are concise rather than repeatedly appending the topic. Generic filler, guessed universal course codes, and automatic scientific-image placement have been removed. Substantive instructor notes are labelled as user-provided evidence. Incomplete coverage is disclosed instead of inventing enough slides to reach a requested count. Untouched shipped samples are refreshed; edited saved decks remain preserved. Generate a new deck to use the new content builder.

**Media** searches public Wikimedia Commons images/videos and Openverse images, with visible provider results/errors, pagination, a persistent per-deck collection, and separate downloads. No search result is inserted into a slide automatically. Select an image and choose Attach to selected slide. Removing a figure leaves the slide without a replacement. Up to four manually selected images may be attached; choose the primary preview explicitly. Video files are downloadable but are not embedded in slides or PowerPoint. Direct in-app downloads are limited to 25 MB and require host/CORS permission; otherwise use Original source. Bundled illustrations are optional schematic aids and are not experimental images.

Public-search shortcuts cover X/Twitter, Facebook, Instagram, Pinterest, CDC PHIL, Europe PMC and general web images. They open search/source pages; the app does not scrape gated posts, bypass sign-in, or claim exhaustive access to social media. Save source links for later; direct image/video URLs with recognized extensions are saved to the collection only. Provider thumbnails, original URLs, creator and licence metadata are retained in editable backups.

**Review** replaces the old citation-percentage-only Audit tab. Built-in checks identify exact passages and suggest corrections for repeated headings, duplicate bodies, generator prompts, selected microbiology misconceptions, topic drift and attached-figure metadata issues. DOI/PMID checking uses Crossref/Europe PMC to compare bibliographic metadata for up to 30 records. A matching identifier is not proof of claim support, study quality or retraction status. Rules are screening checks, not comprehensive scientific verification.

Optional local AI specialist review uses the configured Ollama model for the selected slide. Text-only mode receives slide text and media metadata. The explicit image-inspection option requires a vision-capable model and readable PNG/JPEG/WebP files (four images / 8 MB total). Browser CORS and model capability can limit inspection. Suggestions are labelled unverified and are never applied automatically; stale reviews are identified after edits. Download the review report as JSON for manual correction and source checking. The app never invents a successful AI report when no model is configured.

Run `npm run test:topics` for the topic/media/reviewer regression suite. `qa:pages` also checks that collecting/downloading media does not attach it, manually attached mismatched media is flagged, correction reports download, and removing a figure does not add a fallback.
