# JUW-MicroSlides

Evidence-based microbiology lecture deck generator for university students. Unlimited slides, no daily limits, no accounts, no ads, no paywall. Built as a static PWA — deploy to GitHub Pages, package to APK with Bubblewrap or PWABuilder.

## File structure

```
JUW-MicroSlides/
├── index.html              # Landing page (marketing)
├── app.html                # The application itself
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (caches app shell only)
├── README.md
├── css/
│   ├── tokens.css          # Design tokens: colors, type, radii (Gram-stain palette)
│   ├── landing.css         # Landing page styles
│   └── app.css             # Editor/app shell styles, all layouts
├── js/
│   ├── config.js           # Constants + localStorage helpers
│   ├── pubmed.js           # NCBI E-utilities: search, summarize, abstracts, citations
│   ├── media.js            # Wikimedia Commons, Openverse, CDC PHIL, Wikipedia sourcing
│   ├── ai.js               # Claude API: deck generation + in-app Copilot
│   ├── manual.js           # Manual Mode (no API key required)
│   ├── deck-model.js       # Deck/slide data model + persistence
│   ├── editor.js           # Renders slide rail + stage per layout
│   ├── export-pptx.js      # Builds editable .pptx via PptxGenJS
│   ├── export-pdf.js       # Builds print-ready .pdf via html2canvas + jsPDF
│   └── app.js              # Wires everything together, all event handling
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    ├── icon-maskable-512.png
    ├── favicon.png
    ├── logo-juw.png
    ├── dept-badge-default.png
    ├── source-logo-university.png
    └── source-title-reference.jpg
```

## Logo & university cover page

Both logos are wired in: the JUW seal is the app icon and the cover-page logo; the Department of Microbiology badge was cropped from the reference screenshot.

The **University Cover Page** layout replicates the departmental title-slide format: rust border → pale blue-gray frame → white content area, JUW seal top-left, department badge top-right, bold serif title, and bottom-right course-info block — all editable in place.

Click the badge on any cover slide to upload a cleaner version. It is saved per-deck and used in exports.

## Running locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening via `file://` mostly works but the service worker will not register.

## First-time setup (in the app)

Click the ⚙ settings icon:

- **Anthropic API key** — required only for **AI Mode** and Copilot. Get one at console.anthropic.com. Stored only in the browser’s localStorage.
- **NCBI API key** *(optional)* — raises the PubMed rate limit from 3 to 10 requests/second.

**Manual Mode works with zero keys** and still produces structured, PubMed-grounded, image-illustrated lecture decks.

## Deploying to GitHub Pages

1. Push this folder to a GitHub repo.
2. Repo Settings → Pages → Deploy from branch → select `main` / root.
3. Live at `https://<username>.github.io/<repo>/`.

## Packaging as a native app

### Android (APK / AAB)
**Recommended: Bubblewrap**
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest=https://<username>.github.io/<repo>/manifest.json
bubblewrap build
```
Produces a Trusted Web Activity (TWA) that installs and runs like a native app.

**Alternative:** [PWABuilder](https://www.pwabuilder.com) — paste your GitHub Pages URL.

### Windows
Edge and Chrome can install the PWA directly (“Install app”). For Microsoft Store, use PWABuilder’s Windows package option.

## Where the “unlimited, free” model comes from

There is no backend. Every API call (Claude, PubMed, Wikimedia Commons, Openverse) is made directly from the user’s browser using their own API key (Claude) or free public endpoints (everything else). That is what makes zero monetization and zero slide limits sustainable.

## Open media sources

| Source | Used for | Auth |
|--------|----------|------|
| Wikimedia Commons | Diagrams, micrographs, GIFs | None |
| Openverse | Broader CC-licensed images | None |
| CDC Public Health Image Library | Clinical photography (link-through) | None |
| NCBI PubMed / PMC | Citations + abstracts | None (optional key) |
| Wikipedia REST API | Fallback lead image | None |

All sources are free and carry visible license/attribution in the app and in exports.

## Version
2.2.0
```