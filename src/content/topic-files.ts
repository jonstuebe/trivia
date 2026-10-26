import { byContentPath, type TopicFileLoaders } from "./topic-file-loaders";

/**
 * Every Topic file in `content/`, each loaded only when asked for: Vite puts
 * each file in its own chunk. The test build and Vitest swap in the fixture
 * Topic set's files instead; see `fixture-build.ts`.
 */
export const topicFiles: TopicFileLoaders = byContentPath(
  import.meta.glob("/content/**/*.json", { import: "default" }),
  "/content/",
);
