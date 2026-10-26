/// <reference types="vitest/config" />
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { FIXTURE_MODE, fixtureBeacon, fixtureContent } from "./src/content/fixture-build.ts";

export default defineConfig(({ mode }) => ({
  plugins: [
    // The test build and the unit tests (Vitest runs in "test" mode) play the
    // fixture Topic set instead of the real content.
    (mode === FIXTURE_MODE || mode === "test") && fixtureContent(),
    mode === FIXTURE_MODE && fixtureBeacon(),
    // The router plugin must come before the React plugin.
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
  ],
  build: mode === FIXTURE_MODE ? { outDir: "dist-fixtures" } : {},
  test: {
    // Unit tests cover pure logic only, so they run in Node with no browser.
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
}));
