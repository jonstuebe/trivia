import { describe, expect, it } from "vitest";
import { TIERS } from "../content/schema";
import { createSeededRandom } from "../random/random";
import { loadTopic } from "./load-topic";
import { drawGame } from "./selection";

const sitcom = await loadTopic({ kind: "title", category: "tv", slug: "fixture-sitcom" });

describe("drawGame", () => {
  it("gives 3 Questions per Tier, Tier 1 for Rungs 1-3 up to Tier 5 for Rungs 13-15", () => {
    const game = drawGame(sitcom, {}, createSeededRandom(1));
    expect(game.map((q) => q.tier)).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5]);
    expect(new Set(game.map((q) => q.id)).size).toBe(15);
  });

  it("draws unseen Questions before seen ones", () => {
    // One Question seen in each Tier leaves exactly 3 unseen per Tier.
    const seenIds = TIERS.map((tier) => sitcom.find((q) => q.tier === tier)!.id);
    const seen = Object.fromEntries(seenIds.map((id, i) => [id, i + 1]));
    for (const seed of [1, 2, 3, 4, 5]) {
      const game = drawGame(sitcom, seen, createSeededRandom(seed));
      expect(game.filter((q) => seenIds.includes(q.id))).toEqual([]);
    }
  });

  it("draws repeats oldest-seen first, once the unseen run out", () => {
    // Every Question seen, the first in each Tier most recently (highest counter).
    const seen = Object.fromEntries(sitcom.map((q, i) => [q.id, 100 - i]));
    const newestInTier = TIERS.map((tier) => sitcom.find((q) => q.tier === tier)!.id);
    const game = drawGame(sitcom, seen, createSeededRandom(1));
    expect(game.filter((q) => newestInTier.includes(q.id))).toEqual([]);
    // Within a Tier, the oldest-seen comes first.
    const tier1 = sitcom.filter((q) => q.tier === 1).map((q) => q.id);
    expect(game.slice(0, 3).map((q) => q.id)).toEqual([tier1[3], tier1[2], tier1[1]]);
  });

  it("draws a Mixed game from every Title in the Category, each Question labelled with its Title", async () => {
    const movies = await loadTopic({ kind: "category", category: "movies" });
    // Each fixture Movies Title has only 2 per Tier, so a full Game needs both.
    const game = drawGame(movies, {}, createSeededRandom(3));
    expect(game).toHaveLength(15);
    expect(new Set(game.map((q) => q.titleName))).toEqual(new Set(["Fixture Heist", "Fixture Saga"]));
  });

  it("refuses a Topic with fewer than 3 Questions in a Tier", async () => {
    const drama = await loadTopic({ kind: "title", category: "tv", slug: "fixture-drama" });
    expect(() => drawGame(drama, {}, createSeededRandom(1))).toThrow(RangeError);
  });

  it("draws at random through the random source: the same seed gives the same Game", () => {
    const ids = (seed: number) => drawGame(sitcom, {}, createSeededRandom(seed)).map((q) => q.id);
    expect(ids(7)).toEqual(ids(7));
    const games = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ids(seed).join()));
    expect(games.size).toBeGreaterThan(1);
  });
});
