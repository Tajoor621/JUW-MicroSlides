import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export default defineConfig({
  base: "/JUW-MicroSlides/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: "@/lib/ai", replacement: path("./src/lib/browser-services.ts") },
      { find: "@/lib/media-search", replacement: path("./src/lib/browser-media.ts") },
      { find: "./media-search", replacement: path("./src/lib/browser-media.ts") },
      { find: "@", replacement: path("./src") },
    ],
  },
  build: { outDir: "dist-pages", rolldownOptions: { input: "pages.html" } },
});
