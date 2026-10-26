import { join } from "node:path";
import { createServer } from "vite";
import { describe, expect, it } from "vitest";
import type { TopicFileLoaders } from "./topic-file-loaders";
import type { TopicIndex } from "./types";

const root = join(import.meta.dirname, "../..");

/** One of the app's modules as Vite runs it in this mode, as the build would bundle it. */
async function appModule(mode: string, path: string): Promise<Record<string, unknown>> {
  const server = await createServer({
    root,
    configFile: join(root, "vite.config.ts"),
    mode,
    logLevel: "silent",
    appType: "custom",
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  });
  try {
    return await server.ssrLoadModule(path);
  } finally {
    await server.close();
  }
}

async function appTopicIndex(mode: string): Promise<TopicIndex> {
  return (await appModule(mode, "/src/content/topic-index.ts")).topicIndex as TopicIndex;
}

async function appTopicFilePaths(mode: string): Promise<string[]> {
  const { topicFiles } = await appModule(mode, "/src/content/topic-files.ts");
  return Object.keys(topicFiles as TopicFileLoaders).sort();
}

describe("the test build", () => {
  it("uses the fixture Topic set in fixtures mode", async () => {
    const index = await appTopicIndex("fixtures");
    expect(index.tv.map((title) => title.slug)).toEqual(["fixture-drama", "fixture-sitcom"]);
    expect(index.movies.map((title) => title.slug)).toEqual(["fixture-heist", "fixture-saga"]);
    expect(index.general).not.toBeNull();
  });

  it("loads the fixture Topic files in fixtures mode", async () => {
    expect(await appTopicFilePaths("fixtures")).toEqual([
      "general.json",
      "movies/fixture-heist.json",
      "movies/fixture-saga.json",
      "tv/fixture-drama.json",
      "tv/fixture-sitcom.json",
    ]);
  });

  it("uses the real content in a normal build, even before there is any", async () => {
    const index = await appTopicIndex("production");
    expect(index.tv.some((title) => title.slug.startsWith("fixture-"))).toBe(false);
    expect(index.movies.some((title) => title.slug.startsWith("fixture-"))).toBe(false);
    expect((await appTopicFilePaths("production")).some((path) => path.includes("fixture"))).toBe(false);
  });
});
