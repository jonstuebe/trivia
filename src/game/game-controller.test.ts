import { describe, expect, it } from "vitest";
import { createSeededRandom } from "../random/random";
import { createDeviceStorage, createMemoryBackend, type StorageBackend } from "../storage";
import { createGameController, type PlayingGame } from "./game-controller";
import { loadTopic } from "./load-topic";
import { savedGameFormat } from "./saved-game";
import type { AnswerPosition, Topic } from "./types";

// Whole Games end to end on the fixture Topics, with seeded randomness and an in-memory device.

const general: Topic = { kind: "general" };
const tvShows: Topic = { kind: "category", category: "tv" };

function aDevice(backend: StorageBackend = createMemoryBackend()) {
  const storage = createDeviceStorage(backend, { savedGame: savedGameFormat });
  return { backend, storage, controller: createGameController({ storage, random: createSeededRandom(7) }) };
}

function current(game: PlayingGame) {
  const { context } = game.snapshot();
  return context.questions[context.rung - 1]!;
}

function wrongAnswer(game: PlayingGame): AnswerPosition {
  const { context } = game.snapshot();
  return ([0, 1, 2, 3] as const).find((p) => p !== current(game).correct && !context.removed.includes(p))!;
}

function answer(game: PlayingGame, position: AnswerPosition) {
  game.send({ type: "pick", answer: position });
  game.send({ type: "finalAnswer" });
  game.send({ type: "next" });
}

/** Answers right until question `rung` is showing. */
function climbTo(game: PlayingGame, rung: number) {
  while (game.snapshot().context.rung < rung) answer(game, current(game).correct);
}

describe("a won Game", () => {
  it("ends with $1,000,000, sets the Personal best, clears the Saved game and leaves all 15 Questions seen", async () => {
    const { storage, controller } = aDevice();
    const game = await controller.startGame(general);
    const shown = game.snapshot().context.questions.map((q) => q.question.id);

    climbTo(game, 15);
    answer(game, current(game).correct);

    expect(game.gameOver()).toEqual({
      result: {
        topic: general,
        ending: "won",
        winnings: 1_000_000,
        reached: Array(15).fill("right"),
        lifelinesUsed: [],
      },
      personalBest: 1_000_000,
      newPersonalBest: true,
    });
    expect(storage.personalBest(general)).toBe(1_000_000);
    expect(storage.savedGame()).toBeUndefined();
    expect(Object.keys(storage.seenQuestions()).sort()).toEqual([...shown].sort());
  });
});

describe("every Lifeline", () => {
  it("is used in one won Game, each result kept in the Saved game, and the switched-away Question seen", async () => {
    const { storage, controller } = aDevice();
    const tier4 = (await loadTopic(tvShows)).filter((q) => q.tier === 4).map((q) => q.id);
    // One Tier 4 Question seen before: the Game draws 3 of the 4 unseen, so Switch has one unseen left.
    storage.markSeen(tier4[0]!);
    const game = await controller.startGame(tvShows);
    climbTo(game, 11);

    game.send({ type: "fiftyFifty" });
    expect(storage.savedGame()?.context.removed).toEqual(game.snapshot().context.removed);
    expect(game.snapshot().context.removed).toHaveLength(2);

    game.send({ type: "askTheAudience" });
    expect(storage.savedGame()?.context.audience).toEqual(game.snapshot().context.audience);
    expect(game.snapshot().context.audience?.votes[game.snapshot().context.removed[0]!]).toBe(0);

    game.send({ type: "phoneAFriend" });
    expect(storage.savedGame()?.value).toBe("pickingFriend");
    game.send({ type: "callFriend", friend: "pop culture" });
    expect(storage.savedGame()?.context.friend).toEqual(game.snapshot().context.friend);
    expect(game.snapshot().context.friend).toMatchObject({ friend: "pop culture" });

    const before = current(game).question;
    game.send({ type: "switchTheQuestion" });
    const after = current(game).question;
    expect(after.id).not.toBe(before.id);
    expect(after.tier).toBe(4);
    expect(after.id).not.toBe(tier4[0]);
    expect(storage.savedGame()?.context.switchedAway).toEqual([before]);
    expect(storage.savedGame()?.context.questions[10]).toEqual(current(game));
    expect(storage.seenQuestions()[before.id]).toBeDefined();
    expect(storage.seenQuestions()[after.id]).toBeDefined();

    climbTo(game, 15);
    answer(game, current(game).correct);
    expect(game.gameOver()?.result).toMatchObject({
      ending: "won",
      lifelinesUsed: ["fiftyFifty", "askTheAudience", "phoneAFriend", "switchTheQuestion"],
    });
    // 15 shown, 1 switched away, and the one seen before.
    expect(Object.keys(storage.seenQuestions())).toHaveLength(17);
  });

  it("backing out of Phone a Friend doesn't spend it", async () => {
    const { storage, controller } = aDevice();
    const game = await controller.startGame(general);
    game.send({ type: "phoneAFriend" });
    game.send({ type: "cancel" });
    expect(storage.savedGame()?.value).toBe("choosing");
    expect(storage.savedGame()?.context.lifelinesUsed).toEqual([]);
  });
});

describe("a missed Game", () => {
  it("missing question 5, just before the first Safe level, leaves with $0", async () => {
    const { storage, controller } = aDevice();
    const game = await controller.startGame(general);
    climbTo(game, 5);
    answer(game, wrongAnswer(game));

    expect(game.gameOver()?.result).toMatchObject({ ending: "missed", winnings: 0 });
    expect(game.gameOver()).toMatchObject({ personalBest: 0, newPersonalBest: true });
    expect(storage.personalBest(general)).toBe(0);
    expect(storage.savedGame()).toBeUndefined();
  });

  it("missing question 6, just past the first Safe level, keeps its $1,000", async () => {
    const { storage, controller } = aDevice();
    const game = await controller.startGame(general);
    climbTo(game, 6);
    answer(game, wrongAnswer(game));

    expect(game.gameOver()?.result).toMatchObject({
      ending: "missed",
      winnings: 1_000,
      reached: [...Array(5).fill("right"), "miss"],
    });
    expect(storage.personalBest(general)).toBe(1_000);
    expect(storage.savedGame()).toBeUndefined();
  });

  it("doesn't lower a better Personal best", async () => {
    const { storage, controller } = aDevice();
    storage.recordWinnings(general, 32_000);
    const game = await controller.startGame(general);
    climbTo(game, 6);
    answer(game, wrongAnswer(game));
    expect(game.gameOver()).toMatchObject({ personalBest: 32_000, newPersonalBest: false });
  });
});

describe("a walked-away Game", () => {
  it("keeps the winnings so far and counts toward the Topic as picked, here TV Shows", async () => {
    const { storage, controller } = aDevice();
    const game = await controller.startGame(tvShows);
    climbTo(game, 8);
    game.send({ type: "walkAway" });
    game.send({ type: "confirmWalkAway" });

    expect(game.gameOver()?.result).toMatchObject({
      topic: tvShows,
      ending: "walkedAway",
      winnings: 4_000,
      reached: [...Array(7).fill("right"), "walkedAway"],
    });
    expect(storage.personalBest(tvShows)).toBe(4_000);
    expect(storage.personalBest({ kind: "title", category: "tv", slug: "fixture-sitcom" })).toBeUndefined();
    expect(storage.savedGame()).toBeUndefined();
    expect(Object.keys(storage.seenQuestions())).toHaveLength(8);
  });

  it("ignores moves sent after Game over", async () => {
    const { controller } = aDevice();
    const game = await controller.startGame(general);
    climbTo(game, 2);
    game.send({ type: "walkAway" });
    game.send({ type: "confirmWalkAway" });
    const over = game.gameOver();
    game.send({ type: "next" });
    expect(game.gameOver()).toBe(over);
  });
});
