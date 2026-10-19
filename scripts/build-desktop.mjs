import { readFile, writeFile, copyFile } from "node:fs/promises";
// A desktop bundle has no remote executable scripts, PWA update lifecycle or CDN fonts.
const html = (await readFile("dist-desktop/pages.html", "utf8")).replace(
  /<script[^>]+src="https:[^>]+><\/script>/g,
  "",
);
await writeFile("dist-desktop/index.html", html);
await copyFile("dist-desktop/index.html", "dist-desktop/pages.html");
