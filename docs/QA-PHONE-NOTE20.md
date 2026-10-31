# Samsung Galaxy Note20 acceptance — V6.2.1

Status: **not performed on a physical Note20**. Browser emulation and CI are separate software checks. Use a personal backup before testing. Record date, build ID, Android version, Chrome/Samsung Internet versions and installation mode.

| Check | Chrome result | Samsung Internet result | Completion criterion |
| --- | --- | --- | --- |
| First load, then offline reload | Pending | Pending | Wait for assets to cache; enable flight mode; reload and reopen a saved deck. Logos and bundled fonts display. Literature search clearly needs internet; bundled/cached material only is available offline. |
| Editable PPTX download | Pending | Pending | Prepare export, tap persistent Download PowerPoint link, open file in Microsoft PowerPoint; exact count, editable text/diagrams, readable fonts and draft stamp on every slide. |
| Lecture PDF download | Pending | Pending | Prepare PDF, tap persistent link and open a PDF viewer; all slides, logos and draft stamps visible. |
| IndexedDB after browser restart | Pending | Pending | Save a uniquely named deck and note, fully close/restart the browser, reopen the same origin; both remain available. Do not clear site data. |
| A4 educational note PDF | Pending | Pending | Generate from attributable passages; prepare PDF and tap download. Every page is A4 portrait, header and page numbers are readable, centre crest watermark is subtle, text is selectable, no blank pages, at most 12 pages. |
| JSON backup round trip | Pending | Pending | Download backup including notes; restore as copies; old decks and new structured notes retain sources. |
| Research pause/resume | Pending | Pending | Cancel after a completed batch, close/reopen browser, use the identical request; progress reports saved source slides and resumes query cursors, without replacing the active deck on failure. |
| Title logo in portrait | Pending | Pending | Inspect at normal zoom, rotate phone and use device pixel ratio display. Owner-selected 1,254-pixel artwork is supplied; check the deployed image and actual Office rendering before signing off sharpness. |
| Keyboard and touch | Pending | Pending | Focus topic/notes with keyboard open; scroll to Cancel, PDF and backup controls without hidden actions or page overflow. |

Use Refresh workspace to clear current editors only; confirm saved decks and the Saved notes archive survive. Failed generation must keep the active deck. Report any browser download prompt/file-manager behaviour separately from PDF/PPTX content defects.

31 October 2026: CI profile tests are software emulation only. Physical Chrome and Samsung Internet results remain pending; no desktop-mode device measurements have been invented.
