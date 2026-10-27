import { execFileSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const buildId =
  process.env.GITHUB_SHA?.slice(0, 7) ||
  (() => {
    try {
      return execFileSync("git", ["rev-parse", "--short=7", "HEAD"], { encoding: "utf8" }).trim();
    } catch {
      return "local";
    }
  })();
export default defineConfig({
  define: { "import.meta.env.VITE_BUILD_ID": JSON.stringify(buildId) },
  base: "/JUW-MicroSlides/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [{ find: "@", replacement: path("./src") }],
  },
  build: { outDir: "dist-pages", rolldownOptions: { input: "pages.html" } },
});
