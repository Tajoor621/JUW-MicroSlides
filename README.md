# JUW-MicroSlides V6.2.1

JUW-MicroSlides is a local-first microbiology lecture editor. **The supported lecturer product is the client-only GitHub Pages app:** https://tajoor621.github.io/JUW-MicroSlides/. The application remains permanently locked to V6.2.1; commits identify revisions.

For personal educational use. Not for distribution. Not an official publication of Jinnah University for Women.

## Supported runtime and cost

The Pages app needs no account, hosted backend, API key, Postgres service or paid AI subscription. Knowledge mode queries public literature services directly when online. Provider availability, rate limits and browser CORS rules apply. AI mode uses an explicitly configured local Ollama installation. There are no paid cloud AI calls in this branch.

Browser decks, notes, cached sources and recovery records stay in IndexedDB on this device. Export a JSON or portable-project backup before clearing browser data or moving devices. A static website cannot use the desktop app's native SQLite file. Existing browser saves remain supported; no storage migration to a different database is performed by this cleanup.

The optional Windows Tauri companion uses **local transactional SQLite as its sole database**, with the same lecture UI and optional Ollama. It requires no database server or sign-in. The former hosted server, authentication, Postgres and paid-AI implementation is preserved only in [archive/server-platform-6702c13](https://github.com/Tajoor621/JUW-MicroSlides/tree/archive/server-platform-6702c13). That archive is not the supported lecturer product and is not deployed from this branch. The old platform sign-in domains are not JUW production services; no gate, test-domain or platform sign-in dependency remains in the supported app.

Public GitHub Pages hosting and public-repository CI can run without a hosting subscription. Internet access, computer hardware, electricity and local-model execution remain the user's responsibility. Public evidence APIs do not guarantee unlimited access or permanent availability.

## Lecturer workflow

1. Choose **Generate**, enter a microbiology topic, level and exact total slide count (1–50). Select Standard Lecture, Pathogen Profile, Laboratory Method, Clinical Case Series or Curriculum Module. Learning objectives and optional assessments count toward the requested total.
2. **Thorough research** retrieves topic-specific abstracts and available open full text through Europe PMC and PubMed. Bundled/cached mode uses available local material first. Source shortages produce an explicit failure while preserving the existing deck; the app does not substitute unrelated material or silently save a shorter deck. Offline generation requires supplied/cached material or a configured local model.
3. Edit slide text directly or in **Edit**. Select layouts, theme, notes, difficulty and teaching fields. Themes and decorative motifs are visual aids, not scientific evidence. Media is never automatically attached to replace a removed figure.

General **Bacterial conjugation** requests have a [source-linked teaching core](docs/CONJUGATION-CORE.md): 14 distinct content lessons, original editable schematics and mechanism/application questions. With title, objectives and assessments this yields 18 slides. It remains an unreviewed editorial draft, not a live-literature synthesis or a qualification of every topic. Thorough mode attempts current reference-notice lookups; larger requests require additional research. Specialised organism requests and instructor material keep the general research path.

4. Use **PubMed** for reference discovery and **Evidence** for saved source passages, reference metadata and publication-status records. A valid DOI, a matching quotation or a successful metadata lookup is not independent confirmation of scientific correctness. Verify study context and applicable clinical guidance before teaching.
5. In **Media**, collect related assets separately, inspect the original caption and reuse licence, then attach selected images explicitly. Commons and Openverse are provider searches. X, Facebook, Instagram, Pinterest and other shortcuts open public search/source pages; they are not authenticated scraping integrations. Direct downloads are limited to 25 MB and require provider/browser permission. Videos are downloadable collection items, not embedded PowerPoint video objects. Export includes the primary figure; additional provenance and references remain available in notes/backups.
6. **Writing Notes** has its own topic and level. Generate using research or configured Ollama, edit the text and download Markdown. Notes are stored independently of decks. Export notes before **Refresh workspace** if you want to keep them: Refresh clears the current topic, searches and notes, cancels stale requests and opens a blank workspace. Saved decks remain in **Library**.
7. Use **Present**, **Export PPTX**, **Export PDF**, handouts or Teaching Pack from the lecture workspace. PPTX retains native editable text and vector diagrams where supported. PDF is for reading/printing. After export preparation, use the persistent **Download PowerPoint** or PDF link if the mobile browser suppresses the automatic download.

## Draft status and exports

**There is no Review tab and no export review gate.** All exported PPTX slides and PDF pages carry **“Unverified AI-assisted draft”**, including imported decks with old verification metadata. Export does not certify claims, citations, assessments or institutional approval. The draft label is a disclosure, not an export restriction.

Historical review/source records remain readable in project data for compatibility. Older qualification reports and archived review modules do not describe currently available lecturer menus. Writing Notes does not perform independent scientific review. Assessment questions and teaching fields are drafts that require faculty judgement; empty fields are not evidence that a topic was covered.

The editor exports exactly its slide count. Full references and source provenance are retained without adding hidden figure/reference slides. Keep the editable JSON/portable project for the complete evidence records and recovery history. PPTX speaker notes retain presenter notes, answer keys, references and media credits; raw source paragraphs and internal JSON records are not dumped into the teaching notes. SVG fallback images use up to 4× raster resolution, bounded to 4096×2304 pixels; original photographs cannot gain detail beyond their source. Bundled DejaVu font files are intentional offline/export assets, with their licence in `public/fonts/LICENSE.txt`. Do not delete them as if they were test exports. Original typography may depend on fonts installed in the recipient's viewer.

## Build and verification

Use Node.js 24 and npm 11.9.0. From a checkout:

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm audit --audit-level=high
npm run build
```

`npm run dev` serves the same static application used in production. `npm run build` and `npm run build:pages` produce `dist-pages/`; the Pages base is `/JUW-MicroSlides/`. In repository Settings → Pages, select GitHub Actions as the build source. The deployment workflow verifies source/tests and browser behaviour before publishing. No sandbox-specific startup script is needed.

See [script reference](docs/SCRIPTS.md) for required, optional and environment-dependent commands; [QA checklist](docs/QA.md) for manual checks; [phone contributor guide](docs/CONTRIBUTING-PHONE.md) for mobile-only edits; and [storage migrations](docs/STORAGE-MIGRATIONS.md) for compatibility rules. Generated PPTX/PDF files and screenshots belong in CI artefacts, not tracked source. Windows installers are optional unsigned test builds, not a signed institutional release.

## Qualification and permissions

Software checks distinguish successful generation, source traceability and independent scientific review. Passing fixtures does not prove accuracy across all microbiology topics. Actual Microsoft PowerPoint rendering, representative classroom hardware, accessibility and independent scientific qualification have separate requirements in [scientific qualification](docs/SCIENTIFIC-QUALIFICATION.md), [Windows qualification](docs/WINDOWS-QUALIFICATION.md) and the [classroom matrix](benchmarks/classroom-qualification.json). Historical reports retain their date and commit; do not treat them as a current release certificate or instructions for removed Review menus.

University marks remain owner-supplied artwork. Inclusion does not establish institutional endorsement or third-party redistribution permission. See [permissions and attribution](docs/PERMISSIONS.md). Article/figure licences and third-party exclusions must be checked individually. The app does not grant blanket reuse rights or authenticate lecturer/reviewer identities.

Private-repository hosting choices are documented in [deployment options](docs/DEPLOYMENT.md); no hosting choice or visibility change has been applied. The archive branch was confirmed on 29 October 2026 at `6702c131c15117d486f2421a78131577f0c8a42c`.
