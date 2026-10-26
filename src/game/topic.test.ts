import { describe, expect, it } from "vitest";
import type { TopicIndex } from "../content/types";
import { topicName } from "./topic";

const counts = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 };
const index: TopicIndex = {
  general: { questionCounts: counts },
  tv: [{ name: "Friends", slug: "friends", questionCounts: counts }],
  movies: [{ name: "Star Wars", slug: "star-wars", questionCounts: counts }],
};

describe("topicName", () => {
  it("names General and the two Categories as the picker shows them", () => {
    expect(topicName({ kind: "general" }, index)).toBe("General");
    expect(topicName({ kind: "category", category: "tv" }, index)).toBe("TV Shows");
    expect(topicName({ kind: "category", category: "movies" }, index)).toBe("Movies");
  });

  it("names a Title by its name in the topic index", () => {
    expect(topicName({ kind: "title", category: "tv", slug: "friends" }, index)).toBe("Friends");
    expect(topicName({ kind: "title", category: "movies", slug: "star-wars" }, index)).toBe("Star Wars");
  });

  // A resumed Game can outlive its Title after an app update, and still needs a name at Game over.
  it("falls back to the slug for a Title the index no longer lists", () => {
    expect(topicName({ kind: "title", category: "movies", slug: "jaws" }, index)).toBe("jaws");
  });
});
