# JUW-MicroSlides

Evidence-based microbiology lecture deck generator for university students. Unlimited slides, no daily limits, no accounts, no ads, no paywall. Built as a static PWA — deploy to GitHub Pages, package to APK with Bubblewrap or PWABuilder.

## File structure

```
JUW-MicroSlides/
├── index.html              # Landing page (marketing — not part of slide counting)
├── app.html                # The application itself
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (caches app shell only)
├── README.md
├── css/
│   ├── tokens.css          # Design tokens: colors, type, radii (Gram-stain palette)
│   ├── landing.css         # Landing page styles
│   └── app.css             # Editor/app shell styles, all 8 slide layouts
├── js/
│   ├── config.js           # Constants + localStorage helpers
│   ├── pubmed.js            # NCBI E-utilities: search, summarize, format citations
│   ├── media.js              # Wikimedia Commons, Openverse, CDC PHIL, Wikipedia sourcing
│   ├── ai.js                    # Claude API: deck generation + in-app Copilot
│   ├── deck-model.js       # Deck/slide data model + persistence
│   ├── editor.js               # Renders slide rail + stage per layout
│   ├── export-pptx.js     # Builds editable .pptx via PptxGenJS
│   ├── export-pdf.js       # Builds print-ready .pdf via html2canvas + jsPDF
│   └── app.js                  # Wires everything together, all event handling
└── icons/
    ├── icon-192.png              # App icon, generated from your real JUW seal
    ├── icon-512.png
    ├── icon-maskable-512.png
    ├── favicon.png
    ├── logo-juw.png               # JUW seal, used top-left on the University Cover Page
    ├── dept-badge-default.png     # Dept. of Microbiology badge, cropped from your reference slide
    ├── source-logo-university.png # Your original uploaded seal, kept for re-exporting at higher res
    └── source-title-reference.jpg # Your reference title-slide screenshot, kept for future tweaks
```

## Logo & university cover page

Both logos you provided are wired in: the JUW seal is the app icon (`icons/icon-*.png`, `icons/favicon.png`) and the cover-page logo (`icons/logo-juw.png`); the Department of Microbiology badge (`icons/dept-badge-default.png`) was cropped directly from your reference screenshot.

The **University Cover Page** layout (pick it from the layout dropdown, or it's the default first slide of every deck) replicates your reference title-slide format: rust border → pale blue-gray frame → white content area, JUW seal top-left, department badge top-right, a bold serif title, and a bottom-right course-info block (course name, course code, prepared-by, department) — all directly editable in place.

The department badge was cropped from a screenshot, so it's a bit lower-resolution than the JUW seal. **Click the badge on any cover slide** to upload a cleaner version if you have the original file — it's saved per-deck and used everywhere that slide is exported (including PPTX/PDF).

To replace the JUW seal itself (e.g. a higher-res version), overwrite these three files with the same names and re-run the resize commands:
```bash
convert icons/logo-juw.png -resize 512x512 icons/icon-512.png
convert icons/logo-juw.png -resize 192x192 icons/icon-192.png
convert icons/logo-juw.png -resize 32x32 icons/favicon.png
convert -size 512x512 xc:white icons/logo-juw.png -resize 430x430 -gravity center -composite icons/icon-maskable-512.png
```

## Running locally

This is a static site — no build step. From the project root:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html`/`app.html` directly via `file://` will mostly work but the service worker won't register (browsers require http/https for that).

## First-time setup (in the app)

Click the ⚙ settings icon in the app and add:
- **Anthropic API key** — required for AI deck generation and Copilot. Get one at console.anthropic.com. Stored only in the browser's `localStorage` on the device — never sent anywhere except directly to Anthropic's API.
- **NCBI API key** *(optional)* — raises the PubMed rate limit from 3 to 10 requests/second. Not required for normal use.

Because keys are BYO and stored client-side, there's no server, no usage cost to you, and nothing to meter — hence no slide limits and no daily caps.

## Deploying to GitHub Pages

1. Push this folder to a GitHub repo.
2. Repo Settings → Pages → Deploy from branch → select `main` / root.
3. Your app will be live at `https://<username>.github.io/<repo>/`.

## Packaging to APK (Samsung Note 20 target)

**Recommended: Bubblewrap** (more forgiving than PWABuilder's web UI for edge-case manifests):
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest=https://<username>.github.io/<repo>/manifest.json
bubblewrap build
```
This produces a signed APK using Trusted Web Activity — installs and runs like a native app on the Note 20's 6.7" AMOLED display.

**Alternative: PWABuilder** (pwabuilder.com) — paste your GitHub Pages URL, it audits the manifest/service worker and generates an Android package. If it flags issues, Bubblewrap is the fallback since it uses the same underlying TWA technology with a simpler, more direct toolchain.

## Where the "unlimited, free" model comes from

There is no backend. Every API call (Claude, PubMed, Wikimedia Commons, Openverse) is made directly from the user's browser using their own API key (Claude) or free public endpoints (everything else). That's what makes zero monetization and zero slide limits sustainable — there's no server cost to you, ever.

## Open media sources wired in

| Source | Used for | Auth |
|---|---|---|
| Wikimedia Commons | Diagrams, micrographs, GIFs (life cycles, biofilm formation, etc.) | None |
| Openverse | Broader CC-licensed image aggregation | None |
| CDC Public Health Image Library | Clinical/public-health photography (link-through search, no scraping) | None |
| NCBI PubMed / PMC | Citations, abstracts | None (optional key raises rate limit) |
| Wikipedia REST API | Fallback lead image per topic | None |

All sources are free and carry visible license/attribution in the app and in exports.
