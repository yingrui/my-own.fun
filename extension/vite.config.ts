/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { resolve } from "path";
import { getCacheInvalidationKey, getPlugins } from "./utils/vite";

const rootDir = resolve(__dirname);
const srcDir = resolve(rootDir, "src");
const pagesDir = resolve(srcDir, "pages");

const isDev = process.env.__DEV__ === "true";
const isProduction = !isDev;

export default defineConfig({
  resolve: {
    alias: {
      "@root": rootDir,
      "@src": srcDir,
      "@pages": pagesDir,
    },
  },
  plugins: [...getPlugins(isDev), react()],
  publicDir: resolve(rootDir, "public"),
  build: {
    outDir: resolve(rootDir, "dist"),
    /** Can slow down build speed. */
    // sourcemap: isDev,
    minify: isProduction,
    modulePreload: false,
    reportCompressedSize: isProduction,
    emptyOutDir: !isDev,
    rollupOptions: {
      input: {
        src: resolve(srcDir, "background.js"),
        "src/pages/contentInjected": resolve(
          pagesDir,
          "content",
          "injected",
          "index.ts",
        ),
        "src/pages/contentUI": resolve(pagesDir, "content", "ui", "index.ts"),
        "src/pages/popup": resolve(pagesDir, "popup", "index.html"),
        "src/pages/sidepanel": resolve(pagesDir, "sidepanel", "index.html"),
        "src/pages/options": resolve(pagesDir, "options", "index.html"),
      },
      output: {
        entryFileNames: "[name]/index.js",
        chunkFileNames: isDev
          ? "assets/js/[name].js"
          : "assets/js/[name].[hash].js",
        assetFileNames: (assetInfo) => {
          const { name } = path.parse(assetInfo.name);
          const assetFileName =
            name === "contentStyle"
              ? `${name}${getCacheInvalidationKey()}`
              : name;
          return `assets/[ext]/${assetFileName}.chunk.[ext]`;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    setupFiles: "./test-utils/vitest.setup.js",
  },
});
