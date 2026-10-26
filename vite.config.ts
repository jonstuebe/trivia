/// <reference types="vitest/config" />
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { fixtureBeacon } from "./src/analytics/fixture-beacon.ts";
import { fixtureContent } from "./src/content/fixture-build.ts";
import { FIXTURE_MODE } from "./src/content/fixture-mode.ts";
import { linkPreview } from "./src/link-preview.ts";
import { PWA_OPTIONS } from "./src/pwa.ts";

export default defineConfig(({ mode }) => ({
  plugins: [
    // The test build and the unit tests (Vitest runs in "test" mode) play the
    // fixture Topic set instead of the real content.
    (mode === FIXTURE_MODE || mode === "test") && fixtureContent(),
    mode === FIXTURE_MODE && fixtureBeacon(),
    // The router plugin must come before the React plugin.
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    linkPreview(),
    // The manifest, the offline service worker and its registration; `vite build` only.
    VitePWA(PWA_OPTIONS),
  ],
  build: mode === FIXTURE_MODE ? { outDir: "dist-fixtures" } : {},
  test: {
    // Unit tests cover pure logic only, so they run in Node with no browser.
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
}));
