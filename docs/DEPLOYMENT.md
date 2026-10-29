# Private-repository deployment options — V6.2.1

Terms checked against official documentation on 29 October 2026. No option has been selected or implemented. Repository visibility and Pages settings remain unchanged.

| Option | Requirements and limits | What becomes public |
| --- | --- | --- |
| GitHub Pages from a private repository | GitHub Pro, Team or Enterprise supports Pages from private repositories; GitHub Free personal repositories must be public. Private Actions usage can incur charges after plan allowances. | The rendered site and its downloadable JavaScript, assets, fonts and bundled material are ordinarily public even when source history is private. Private site access has separate Enterprise organisation requirements. Browser IndexedDB decks are not uploaded by this app. |
| Cloudflare Pages Free with a private GitHub repository | Private and public repositories are supported by the Git integration. The Free plan currently permits 500 builds/month, one build at a time, 20-minute build timeout and 20,000 site files. The owner must authorise the provider to read the selected repository. Configure the appropriate Vite base when making a future deployment. | The deployed site, assets and bundled material are accessible from its site URL; preview URLs can also expose builds. A private repository does not make the site private. Local IndexedDB data stays on the lecturer's device. |
| Windows desktop only | Build the optional Tauri application with local SQLite and optional Ollama; no public site is required. Existing published hosting would require a separate owner decision to discontinue. | Nothing new is published if installers and build artefacts are kept private. Anyone given the installer can inspect its bundled assets. Online literature requests still go to public providers. |

A personal-use notice is not access control. Do not place private decks, original restricted teaching material or secrets in any public static bundle. This app does not require backend storage or sign-in. No open-source licence is added.

Official sources:

- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site
- https://developers.cloudflare.com/pages/get-started/git-integration/
- https://developers.cloudflare.com/pages/platform/limits/

Recheck terms and institutional artwork permissions before choosing a host. No paid plan has been purchased or enabled.
