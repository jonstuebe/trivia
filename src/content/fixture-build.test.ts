import { join } from "node:path";
import { createServer } from "vite";
import { describe, expect, it } from "vitest";
import type { TopicIndex } from "./check";

const root = join(import.meta.dirname, "../..");

/** The topic index the app sees when Vite runs in this mode, as the build would bundle it. */
async function appTopicIndex(mode: string): Promise<TopicIndex> {
  const server = await createServer({
    root,
    configFile: join(root, "vite.config.ts"),
    mode,
    logLevel: "silent",
    appType: "custom",
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  });
  try {
    const module = await server.ssrLoadModule("/src/content/topic-index.ts");
    return module.topicIndex as TopicIndex;
  } finally {
    await server.close();
  }
}

describe("the test build", () => {
  it("uses the fixture Topic set in fixtures mode", async () => {
    const index = await appTopicIndex("fixtures");
    expect(index.tv.map((title) => title.slug)).toEqual(["fixture-drama", "fixture-sitcom"]);
    expect(index.movies.map((title) => title.slug)).toEqual(["fixture-heist", "fixture-saga"]);
    expect(index.general).not.toBeNull();
  });

  it("uses the real content in a normal build, even before there is any", async () => {
    const index = await appTopicIndex("production");
    expect(index.tv.some((title) => title.slug.startsWith("fixture-"))).toBe(false);
    expect(index.movies.some((title) => title.slug.startsWith("fixture-"))).toBe(false);
  });
});
