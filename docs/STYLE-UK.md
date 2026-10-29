# UK English style — V6.2.1

Use UK English in authored interface text, documentation, bundled teaching prose and AI instructions. Prefer organise/organisation, colour, centre, behaviour, analyse, licence (noun), haemolytic, anaemia, oesophagus and programme (educational programme). Use programme for a teaching series; retain program when describing computer code. Use license as a verb only. Also prefer immobilisation, normalisation, visualisation and artefact.

Keep exact published titles, quoted source passages, author names, organism names, DOIs, URLs, file names, JSON fields and programming/CSS identifiers unchanged. `license`, `color`, `center`, `behavior` and `organization` can be required code or provider fields; changing these would break compatibility. Never normalise quotations to UK spelling while labelling them verbatim.

Run `npm run test:uk-english`. It scans authored TypeScript/JSX prose literals, JSX text and Markdown prose. It excludes imports, properties, type literals, URLs, code blocks and explicit identifiers. Exact embedded-CSS exceptions live in `scripts/uk-english-exceptions.json`; every exception requires a reason. Do not add broad directory exclusions to make failures disappear. Retrieved provider passages, user-entered content and exact quotations retain source spelling; the test does not certify arbitrary external content.
