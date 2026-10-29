# Dependency audit — 29 October 2026

`npx depcheck --json` reported unused packages. Confirmed no source/config/script imports for the removed packages. CSS imports in src/styles.css retain tailwindcss and tw-animate-css despite depcheck false positives. Vite still uses @tailwindcss/vite; its internal lightningcss dependency is independent from the removed direct declaration. Citation.js plugin-csl retains its transitive citeproc dependency.

Removal list:

- `@hookform/resolvers`
- `@radix-ui/react-accordion`
- `@radix-ui/react-alert-dialog`
- `@radix-ui/react-avatar`
- `@radix-ui/react-checkbox`
- `@radix-ui/react-collapsible`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-popover`
- `@radix-ui/react-progress`
- `@radix-ui/react-radio-group`
- `@radix-ui/react-select`
- `@radix-ui/react-separator`
- `@radix-ui/react-slider`
- `@radix-ui/react-switch`
- `@radix-ui/react-tabs`
- `@radix-ui/react-toggle`
- `@radix-ui/react-toggle-group`
- `@tanstack/react-query`
- `@tanstack/react-table`
- `citeproc`
- `cmdk`
- `date-fns`
- `react-day-picker`
- `react-hook-form`
- `react-resizable-panels`
- `recharts`
- `vaul`
- `eslint-plugin-prettier`
- `lightningcss`

Production fonts are intentional offline assets. No font packages or files removed.
