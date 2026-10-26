/// <reference types="vitest/config" />
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    // The router plugin must come before the React plugin.
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
  ],
  test: {
    // Unit tests cover pure logic only, so they run in Node with no browser.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
