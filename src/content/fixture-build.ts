import { resolve } from "node:path";
import type { Plugin } from "vite";

/**
 * The test build (issue #24): the app built on the fixture Topic set in
 * `src/content/fixtures/` instead of the real content, for whole-Game tests
 * and the e2e journeys. Build it with `bun run build:fixtures`, which runs
 * `vite build --mode fixtures` into `dist-fixtures/`.
 */
export const FIXTURE_MODE = "fixtures";

const realIndex = resolve(import.meta.dirname, "topic-index.gen.json");
const fixtureIndex = resolve(import.meta.dirname, "topic-index.fixtures.gen.json");

/**
 * Swaps the real topic index for the fixtures' one wherever the app imports
 * it. When the app starts loading Topic files, swap their folder here too.
 */
export function fixtureContent(): Plugin {
  return {
    name: "trivia:fixture-content",
    enforce: "pre",
    async resolveId(source, importer, options) {
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      return resolved?.id === realIndex ? fixtureIndex : null;
    },
  };
}
