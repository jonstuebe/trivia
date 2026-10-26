import { resolve } from "node:path";
import type { Plugin } from "vite";

/** Each module that brings in the real content, and the fixture one that replaces it. */
const swaps = new Map([
  [resolve(import.meta.dirname, "topic-index.gen.json"), resolve(import.meta.dirname, "topic-index.fixtures.gen.json")],
  [resolve(import.meta.dirname, "topic-files.ts"), resolve(import.meta.dirname, "topic-files.fixtures.ts")],
]);

/**
 * Swaps the real topic index and Topic files for the fixtures' ones wherever
 * the app imports them. Vitest uses it too, so unit tests run on the fixtures.
 */
export function fixtureContent(): Plugin {
  return {
    name: "trivia:fixture-content",
    enforce: "pre",
    async resolveId(source, importer, options) {
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      return (resolved && swaps.get(resolved.id)) ?? null;
    },
  };
}
