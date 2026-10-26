import { byContentPath, type TopicFileLoaders } from "./topic-file-loaders";

/** The fixture Topic set's files, swapped in for `topic-files.ts` by `fixture-build.ts`. */
export const topicFiles: TopicFileLoaders = byContentPath(
  import.meta.glob("/src/content/fixtures/**/*.json", { import: "default" }),
  "/src/content/fixtures/",
);
