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
- Some topics receive template prompts rather than a complete specialist lecture. Requested counts up to 400 are an upper limit, not a guarantee of 400 distinct evidence-supported slides or figures.
- Elicit support imports exports; it is not an Elicit account connection. Ambiguous legacy author strings cannot be reconstructed reliably; structured BibTeX author data is retained.
- External searches depend on upstream availability, CORS, and provider quotas. This release does not certify their current availability in every region.
- PowerPoint exports all images, but additional images use extra figure slides rather than an exact multi-image copy of the editor. Browser fonts and PowerPoint fonts can differ. The reference appendix can add slides beyond the requested lecture count.
- Cross-device sync, multi-user collaboration, Android-native backup interchange, and an independently tested APK are not included. Use the browser backup format for browser-to-browser transfer.
- A physical Samsung-device test and a real Ollama connection remain required before claiming those environments are certified. Browser emulation is not a physical-device test.

## Third-party content and licences

Bundled CSL styles retain their licence declarations; see `src/lib/csl/README.md`. Reference parsing/formatting uses Citation.js, CSL/citeproc, and Papa Parse. External images retain provider metadata and must be checked individually. No new blanket licence is granted for university marks, third-party scientific images, or the existing repository. Grok platform branding/preview integration remains preserved.
