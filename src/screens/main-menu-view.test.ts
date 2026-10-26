import { describe, expect, it } from "vitest";
import type { TopicIndex } from "../content/types";
import { topicKey } from "../game/topic";
import type { Topic } from "../game/types";
import { mainMenuView } from "./main-menu-view";

const counts = { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4 };
const index: TopicIndex = {
  general: { questionCounts: counts },
  tv: [
    { name: "Friends", slug: "friends", questionCounts: counts },
    { name: "Modern Family", slug: "modern-family", questionCounts: counts },
  ],
  movies: [{ name: "Star Wars", slug: "star-wars", questionCounts: counts }],
};

const bests = (byKey: Record<string, number>) => (topic: Topic) => byKey[topicKey(topic)];

describe("the Main menu", () => {
  it("with no Saved game: Play, and no Personal bests yet", () => {
    expect(mainMenuView({ saved: undefined, personalBest: bests({}) }, index)).toEqual({
      resume: undefined,
      personalBests: [],
    });
  });

  it("offers Resume with the saved Game's Topic and question", () => {
    const view = mainMenuView(
      { saved: { topic: { kind: "title", category: "tv", slug: "friends" }, rung: 7 }, personalBest: bests({}) },
      index,
    );
    expect(view.resume).toBe("Resume: Friends, question 7");
  });

  it("names a saved Mixed game by its Category", () => {
    const view = mainMenuView(
      { saved: { topic: { kind: "category", category: "movies" }, rung: 1 }, personalBest: bests({}) },
      index,
    );
    expect(view.resume).toBe("Resume: Movies, question 1");
  });

  it("lists each Topic's Personal best: General, then each Category's mixed best before its Titles", () => {
    const view = mainMenuView(
      {
        saved: undefined,
        personalBest: bests({ "movies/star-wars": 1_000_000, tv: 0, general: 32_000, "tv/modern-family": 500 }),
      },
      index,
    );
    expect(view.personalBests).toEqual([
      "General: $32,000",
      "TV Shows: $0",
      "Modern Family: $500",
      "Star Wars: $1,000,000",
    ]);
  });
});
