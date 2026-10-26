import { describe, expect, it } from "vitest";
import { TIERS } from "../content/schema";
import { createSeededRandom } from "../random/random";
import { loadTopic } from "./load-topic";
import { canFillGame, drawGame, drawSwitch } from "./selection";
import type { GameQuestion } from "./types";

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
    // Drawn across both fixture Movies Titles, not from one of them.
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

describe("drawSwitch", () => {
  it("draws a replacement from the same Tier that isn't already in this Game", () => {
    const game = drawGame(sitcom, {}, createSeededRandom(1));
    // The Sitcom has 4 Questions per Tier and the Game uses 3, so one is left.
    const left = sitcom.find((q) => q.tier === 4 && !game.includes(q))!;
    for (const seed of [1, 2, 3]) {
      expect(drawSwitch(sitcom, 4, game, {}, createSeededRandom(seed))).toEqual(left);
    }
  });

  it("never gives back a Question switched away from earlier", async () => {
    const tv = await loadTopic({ kind: "category", category: "tv" });
    const game = drawGame(tv, {}, createSeededRandom(2));
    const first = drawSwitch(tv, 5, game, {}, createSeededRandom(2))!;
    const second = drawSwitch(tv, 5, [...game, first], {}, createSeededRandom(2))!;
    expect(second.tier).toBe(5);
    expect([...game, first]).not.toContainEqual(second);
  });

  it("prefers an unseen replacement, then the oldest-seen", async () => {
    const tv = await loadTopic({ kind: "category", category: "tv" });
    const tier3 = tv.filter((q) => q.tier === 3);
    const game = tier3.slice(0, 2);
    const [a, b, c] = tier3.slice(2) as [GameQuestion, GameQuestion, GameQuestion];
    expect(drawSwitch(tv, 3, game, { [a.id]: 5, [b.id]: 6 }, createSeededRandom(1))).toEqual(c);
    expect(drawSwitch(tv, 3, game, { [a.id]: 9, [b.id]: 6, [c.id]: 7 }, createSeededRandom(1))).toEqual(b);
  });

  it("gives nothing when the Tier has no Question left outside this Game", async () => {
    const general = await loadTopic({ kind: "general" });
    const game = drawGame(general, {}, createSeededRandom(1));
    expect(drawSwitch(general, 2, game, {}, createSeededRandom(1))).toBeUndefined();
  });
});

describe("canFillGame", () => {
  it("says a Topic can fill a whole Game while every Tier has 3 unseen Questions", () => {
    const seenIds = TIERS.map((tier) => sitcom.find((q) => q.tier === tier)!.id);
    expect(canFillGame(sitcom, {})).toBe(true);
    expect(canFillGame(sitcom, Object.fromEntries(seenIds.map((id, i) => [id, i])))).toBe(true);
  });

  it("says a Topic has run out once any Tier has fewer than 3 unseen", () => {
    const tier5 = sitcom.filter((q) => q.tier === 5).map((q) => q.id);
    expect(canFillGame(sitcom, { [tier5[0]!]: 1, [tier5[1]!]: 2 })).toBe(false);
  });

  it("counts a Question seen in its Title as seen in the Mixed game", async () => {
    const tv = await loadTopic({ kind: "category", category: "tv" });
    // TV has 5 per Tier: 4 Sitcom and 1 Drama. Seeing 3 Sitcom Tier 1 Questions leaves 2.
    const sitcomTier1 = sitcom.filter((q) => q.tier === 1).map((q) => q.id);
    expect(canFillGame(tv, { [sitcomTier1[0]!]: 1, [sitcomTier1[1]!]: 2 })).toBe(true);
    expect(canFillGame(tv, { [sitcomTier1[0]!]: 1, [sitcomTier1[1]!]: 2, [sitcomTier1[2]!]: 3 })).toBe(false);
  });

  it("ignores seen IDs that are no longer in the content", () => {
    expect(canFillGame(sitcom, { gone0001: 1, gone0002: 2, gone0003: 3 })).toBe(true);
  });

  it("says a Topic with too few Questions in a Tier can't fill a Game", async () => {
    const drama = await loadTopic({ kind: "title", category: "tv", slug: "fixture-drama" });
    expect(canFillGame(drama, {})).toBe(false);
  });
});
