import { describe, expect, it } from "vitest";
import type { TopicIndex } from "../content/types";
import { listedTitles, offersMixedGame, topicFromPath, topicName, topicRoute } from "./topic";

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

const tiers = (a: number, b: number, c: number, d: number, e: number) => ({ 1: a, 2: b, 3: c, 4: d, 5: e });

describe("listedTitles", () => {
  const withTv = (...tv: TopicIndex["tv"]): TopicIndex => ({ ...index, tv });

  it("lists a Title with 20 Questions and at least 3 in every Tier", () => {
    const tvIndex = withTv({ name: "Friends", slug: "friends", questionCounts: tiers(4, 4, 4, 4, 4) });
    expect(listedTitles("tv", tvIndex).map((title) => title.slug)).toEqual(["friends"]);
  });

  it("leaves out a Title with fewer than 20 Questions, even one that could fill a Game", () => {
    const tvIndex = withTv({ name: "Lost", slug: "lost", questionCounts: tiers(3, 3, 3, 3, 3) });
    expect(listedTitles("tv", tvIndex)).toEqual([]);
  });

  it("leaves out a Title with 20 or more Questions but fewer than 3 in some Tier", () => {
    const tvIndex = withTv({ name: "Lost", slug: "lost", questionCounts: tiers(8, 8, 8, 8, 2) });
    expect(listedTitles("tv", tvIndex)).toEqual([]);
  });
});

describe("offersMixedGame", () => {
  const full = tiers(4, 4, 4, 4, 4);
  const thin = tiers(1, 1, 1, 1, 1);

  it("offers a Mixed game when the Category has 2 listed Titles", () => {
    const tvIndex: TopicIndex = {
      ...index,
      tv: [
        { name: "Friends", slug: "friends", questionCounts: full },
        { name: "Seinfeld", slug: "seinfeld", questionCounts: full },
      ],
    };
    expect(offersMixedGame("tv", tvIndex)).toBe(true);
  });

  it("doesn't count an unlisted Title towards the 2", () => {
    const tvIndex: TopicIndex = {
      ...index,
      tv: [
        { name: "Friends", slug: "friends", questionCounts: full },
        { name: "Lost", slug: "lost", questionCounts: thin },
      ],
    };
    expect(offersMixedGame("tv", tvIndex)).toBe(false);
  });
});

describe("topicFromPath", () => {
  const full = tiers(4, 4, 4, 4, 4);
  const pathIndex: TopicIndex = {
    general: { questionCounts: tiers(3, 3, 3, 3, 3) },
    tv: [
      { name: "Friends", slug: "friends", questionCounts: full },
      { name: "Lost", slug: "lost", questionCounts: tiers(1, 1, 1, 1, 1) },
    ],
    movies: [
      { name: "Jaws", slug: "jaws", questionCounts: full },
      { name: "Star Wars", slug: "star-wars", questionCounts: full },
    ],
  };

  it("reads each playable Topic's URL", () => {
    expect(topicFromPath("/general", pathIndex)).toEqual({ kind: "general" });
    expect(topicFromPath("/movies", pathIndex)).toEqual({ kind: "category", category: "movies" });
    expect(topicFromPath("/tv/friends", pathIndex)).toEqual({ kind: "title", category: "tv", slug: "friends" });
    expect(topicFromPath("/movies/star-wars", pathIndex)).toEqual({
      kind: "title",
      category: "movies",
      slug: "star-wars",
    });
  });

  it("finds nothing at a Topic the picker doesn't list", () => {
    expect(topicFromPath("/tv/lost", pathIndex)).toBeUndefined(); // unlisted Title
    expect(topicFromPath("/tv/seinfeld", pathIndex)).toBeUndefined(); // no such Title
    expect(topicFromPath("/tv", pathIndex)).toBeUndefined(); // one listed Title: no Mixed game
    expect(topicFromPath("/general", { ...pathIndex, general: null })).toBeUndefined();
  });

  // Vitest runs on the fixture Topic set; the e2e journeys rely on this listing.
  it("lists both fixture Movies with a Mixed game, and only Fixture Sitcom in TV", () => {
    expect(listedTitles("movies").map((title) => title.name)).toEqual(["Fixture Heist", "Fixture Saga"]);
    expect(offersMixedGame("movies")).toBe(true);
    expect(listedTitles("tv").map((title) => title.name)).toEqual(["Fixture Sitcom"]);
    expect(offersMixedGame("tv")).toBe(false);
    expect(topicFromPath("/tv/fixture-drama")).toBeUndefined();
  });

  it("finds nothing at a path that isn't a Topic", () => {
    expect(topicFromPath("/", pathIndex)).toBeUndefined();
    expect(topicFromPath("/books", pathIndex)).toBeUndefined();
    expect(topicFromPath("/general/friends", pathIndex)).toBeUndefined();
    expect(topicFromPath("/tv/friends/extra", pathIndex)).toBeUndefined();
  });
});

describe("topicRoute", () => {
  it("routes to each kind of Topic's own screen", () => {
    expect(topicRoute({ kind: "general" })).toEqual({ to: "/general" });
    expect(topicRoute({ kind: "category", category: "movies" })).toEqual({ to: "/$category", params: { category: "movies" } });
    expect(topicRoute({ kind: "title", category: "tv", slug: "friends" })).toEqual({
      to: "/$category/$slug",
      params: { category: "tv", slug: "friends" },
    });
  });
});
