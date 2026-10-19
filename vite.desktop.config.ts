import { defineConfig, mergeConfig } from "vite";
import pages from "./vite.pages.config.ts";
export default mergeConfig(
  pages,
  defineConfig({
    base: "./",
    server: { port: 1420, strictPort: true, host: "127.0.0.1" },
    build: { outDir: "dist-desktop" },
  }),
);
