import * as z from "zod";
import { describe, expect, it } from "vitest";
import type { Topic } from "../game/types";
import { createMemoryBackend } from "./backend";
import { createDeviceStorage, type SavedGameFormat } from "./device-storage";

// A stand-in for the Game machine's Saved game record, which #31 supplies.
const savedGameFormat: SavedGameFormat<{ rung: number }> = {
  version: 1,
  schema: z.object({ rung: z.int() }),
};

const open = (backend = createMemoryBackend()) => createDeviceStorage(backend, { savedGame: savedGameFormat });

describe("seen Questions", () => {
  it("starts with nothing seen", () => {
    expect(open().seenQuestions()).toEqual(new Map());
  });

  it("gives each shown Question the next running counter, so the latest is the newest", () => {
    const storage = open();
    storage.markSeen("aaaaaaaa");
    storage.markSeen("bbbbbbbb");
    storage.markSeen("cccccccc");
    expect(storage.seenQuestions()).toEqual(
      new Map([
        ["aaaaaaaa", 1],
        ["bbbbbbbb", 2],
        ["cccccccc", 3],
      ]),
    );
  });

  it("makes a Question shown again the newest", () => {
    const storage = open();
    storage.markSeen("aaaaaaaa");
    storage.markSeen("bbbbbbbb");
    storage.markSeen("aaaaaaaa");
    expect(storage.seenQuestions()).toEqual(
      new Map([
        ["aaaaaaaa", 3],
        ["bbbbbbbb", 2],
      ]),
    );
  });

  it("is remembered on the device", () => {
    const backend = createMemoryBackend();
    open(backend).markSeen("aaaaaaaa");
    expect(open(backend).seenQuestions()).toEqual(new Map([["aaaaaaaa", 1]]));
  });
});

describe("Personal bests", () => {
  const tvShows: Topic = { kind: "category", category: "tv" };
  const friends: Topic = { kind: "title", category: "tv", slug: "friends" };

  it("has none for a Topic never finished", () => {
    expect(open().personalBest(friends)).toBeUndefined();
  });

  it("keeps the best winnings from every finished Game in a Topic", () => {
    const storage = open();
    expect(storage.recordWinnings(friends, 1000)).toEqual({ best: 1000, isNew: true });
    expect(storage.recordWinnings(friends, 32000)).toEqual({ best: 32000, isNew: true });
    expect(storage.recordWinnings(friends, 500)).toEqual({ best: 32000, isNew: false });
    expect(storage.personalBest(friends)).toBe(32000);
  });

  it("counts a Game that won nothing", () => {
    const storage = open();
    storage.recordWinnings(friends, 0);
    expect(storage.personalBest(friends)).toBe(0);
  });

  it("keeps the Topic as picked: TV Shows and Friends apart", () => {
    const storage = open();
    storage.recordWinnings(tvShows, 64000);
    storage.recordWinnings(friends, 1000);
    storage.recordWinnings({ kind: "category", category: "movies" }, 500);
    storage.recordWinnings({ kind: "general" }, 250000);
    expect(storage.personalBest(tvShows)).toBe(64000);
    expect(storage.personalBest(friends)).toBe(1000);
    expect(storage.personalBest({ kind: "title", category: "movies", slug: "friends" })).toBeUndefined();
    expect(storage.personalBest({ kind: "general" })).toBe(250000);
  });

  it("is remembered on the device", () => {
    const backend = createMemoryBackend();
    open(backend).recordWinnings(friends, 1000);
    expect(open(backend).personalBest(friends)).toBe(1000);
  });
});

describe("the Saved game", () => {
  it("is empty until a Game is saved", () => {
    expect(open().savedGame()).toBeUndefined();
  });

  it("keeps the one Game in progress, rewritten after every step", () => {
    const backend = createMemoryBackend();
    open(backend).saveGame({ rung: 1 });
    open(backend).saveGame({ rung: 2 });
    expect(open(backend).savedGame()).toEqual({ rung: 2 });
  });

  it("is cleared at Game over", () => {
    const storage = open();
    storage.saveGame({ rung: 4 });
    storage.clearSavedGame();
    expect(storage.savedGame()).toBeUndefined();
  });

  it("is read with the format the caller gives it, migrations included", () => {
    const backend = createMemoryBackend({ "trivia.savedGame": JSON.stringify({ version: 1, data: { step: 6 } }) });
    const storage = createDeviceStorage(backend, {
      savedGame: {
        version: 2,
        schema: z.object({ rung: z.int() }),
        migrations: { 1: (data) => ({ rung: (data as { step: number }).step }) },
      },
    });
    expect(storage.savedGame()).toEqual({ rung: 6 });
  });

  it("is just dropped when it can't be read, with no backup", () => {
    const backend = createMemoryBackend({
      "trivia.savedGame": JSON.stringify({ version: 1, data: { rung: "six" } }),
    });
    expect(open(backend).savedGame()).toBeUndefined();
    expect(backend.keys()).toEqual([]);
  });
});

describe("settings", () => {
  it("has sound on by default", () => {
    expect(open().muted()).toBe(false);
  });

  it("remembers the mute", () => {
    const backend = createMemoryBackend();
    open(backend).setMuted(true);
    expect(open(backend).muted()).toBe(true);
    open(backend).setMuted(false);
    expect(open(backend).muted()).toBe(false);
  });
});
