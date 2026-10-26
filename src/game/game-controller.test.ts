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

function aDevice(backend: StorageBackend = createMemoryBackend(), seed = 7) {
  const storage = createDeviceStorage(backend, { savedGame: savedGameFormat });
  return { storage, controller: createGameController({ storage, random: createSeededRandom(seed) }) };
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
  game.send({ type: "reveal" });
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

describe("a Topic running out", () => {
  it("has enough new Questions until a Game has shown them, then still plays, repeats oldest-seen first", async () => {
    // General's fixture has exactly 3 Questions per Tier: one whole Game.
    const { storage, controller } = aDevice();
    expect(await controller.checkTopic(general)).toEqual({ enoughNew: true });

    const first = await controller.startGame(general);
    climbTo(first, 15);
    answer(first, current(first).correct);
    expect(await controller.checkTopic(general)).toEqual({ enoughNew: false });

    const firstOrder = first.snapshot().context.questions.map((q) => q.question.id);
    const repeat = await controller.startGame(general);
    const repeatIds = repeat.snapshot().context.questions.map((q) => q.question.id);
    // Within each Tier, the oldest-seen comes first: the order the first Game showed them.
    expect(repeatIds).toEqual(firstOrder);
    expect(storage.seenQuestions()[repeatIds[0]!]).toBeGreaterThan(storage.seenQuestions()[repeatIds[1]!]!);
  });

  it("has enough new Questions again after Reset this topic, which clears only its own", async () => {
    const { storage, controller } = aDevice();
    const game = await controller.startGame(general);
    climbTo(game, 15);
    answer(game, current(game).correct);
    storage.markSeen("notgen01");

    await controller.resetTopic(general);

    expect(await controller.checkTopic(general)).toEqual({ enoughNew: true });
    expect(storage.seenQuestions()).toEqual({ notgen01: 16 });
  });

  it("for a Category, resets every Title in it", async () => {
    const { storage, controller } = aDevice();
    const sitcom: Topic = { kind: "title", category: "tv", slug: "fixture-sitcom" };
    for (let i = 0; i < 2; i++) {
      const game = await controller.startGame(tvShows);
      climbTo(game, 15);
      answer(game, current(game).correct);
    }
    expect(await controller.checkTopic(sitcom)).toEqual({ enoughNew: false });

    await controller.resetTopic(tvShows);

    expect(storage.seenQuestions()).toEqual({});
    expect(await controller.checkTopic(sitcom)).toEqual({ enoughNew: true });
  });
});

describe("a restored Saved game", () => {
  it("resumes after a refresh exactly where it was, Lifeline results as rolled, and plays on to Game over", async () => {
    const backend = createMemoryBackend();
    const before = aDevice(backend);
    const game = await before.controller.startGame(tvShows);
    climbTo(game, 11);
    game.send({ type: "fiftyFifty" });
    game.send({ type: "askTheAudience" });
    game.send({ type: "phoneAFriend" });
    game.send({ type: "callFriend", friend: "history" });
    game.send({ type: "switchTheQuestion" });
    const seen = before.storage.seenQuestions();

    // A refresh: a fresh controller on the same device, with a different random source.
    const after = aDevice(backend, 1234);
    expect(after.controller.savedTopic()).toEqual(tvShows);
    const resumed = (await after.controller.resumeGame())!;
    expect(resumed.snapshot().value).toBe("choosing");
    expect(resumed.snapshot().context).toEqual(game.snapshot().context);
    // Resuming shows nothing new, so nothing is marked again.
    expect(after.storage.seenQuestions()).toEqual(seen);

    climbTo(resumed, 13);
    answer(resumed, wrongAnswer(resumed));
    expect(resumed.gameOver()?.result).toMatchObject({
      ending: "missed",
      winnings: 32_000,
      lifelinesUsed: ["fiftyFifty", "askTheAudience", "phoneAFriend", "switchTheQuestion"],
    });
    expect(after.storage.personalBest(tvShows)).toBe(32_000);
    expect(after.controller.savedTopic()).toBeUndefined();
    expect(await after.controller.resumeGame()).toBeUndefined();
  });

  it("comes back from Final answer to the Question with nothing picked", async () => {
    const backend = createMemoryBackend();
    const game = await aDevice(backend).controller.startGame(general);
    climbTo(game, 3);
    game.send({ type: "pick", answer: wrongAnswer(game) });
    expect(game.snapshot().value).toBe("confirmingAnswer");

    const resumed = (await aDevice(backend).controller.resumeGame())!;
    expect(resumed.snapshot().value).toBe("choosing");
    expect(resumed.snapshot().context).toMatchObject({ rung: 3, picked: null });
  });

  it("comes back from the reveal wait at the reveal, the answer still locked in, and plays on", async () => {
    const backend = createMemoryBackend();
    const game = await aDevice(backend).controller.startGame(general);
    climbTo(game, 3);
    const wrong = wrongAnswer(game);
    game.send({ type: "pick", answer: wrong });
    game.send({ type: "finalAnswer" });
    expect(game.snapshot().value).toBe("lockedIn");

    const { storage, controller } = aDevice(backend);
    const resumed = (await controller.resumeGame())!;
    expect(resumed.snapshot().value).toEqual({ revealing: "wrong" });
    expect(resumed.snapshot().context).toMatchObject({ rung: 3, picked: wrong });
    resumed.send({ type: "next" });
    expect(resumed.gameOver()?.result).toMatchObject({ ending: "missed", winnings: 0 });
    expect(storage.savedGame()).toBeUndefined();
  });

  it("resumes the Question shown, even one the Topic no longer has", async () => {
    const backend = createMemoryBackend();
    const game = await aDevice(backend).controller.startGame(general);
    climbTo(game, 2);
    const { storage } = aDevice(backend);
    const saved = storage.savedGame()!;
    const gone: Topic = { kind: "title", category: "tv", slug: "cancelled-show" };
    storage.saveGame({ ...saved, context: { ...saved.context, topic: gone } });

    const resumed = (await aDevice(backend).controller.resumeGame())!;
    expect(current(resumed)).toEqual(current(game));
    answer(resumed, current(resumed).correct);
    expect(resumed.snapshot().context.rung).toBe(3);
  });

  it("is discarded by starting a new Game: no Personal best from it, and its Questions stay seen", async () => {
    const { storage, controller } = aDevice();
    const abandoned = await controller.startGame(general);
    climbTo(abandoned, 7);
    const abandonedIds = abandoned.snapshot().context.questions.slice(0, 7).map((q) => q.question.id);

    const next = await controller.startGame(tvShows);
    expect(storage.savedGame()?.context.topic).toEqual(tvShows);
    expect(storage.savedGame()?.context.questions).toEqual(next.snapshot().context.questions);
    expect(storage.personalBest(general)).toBeUndefined();
    for (const id of abandonedIds) expect(storage.seenQuestions()[id]).toBeDefined();
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

  it("tells subscribers after each step, once it's saved, until they unsubscribe", async () => {
    const { storage, controller } = aDevice();
    const game = await controller.startGame(general);
    const steps: unknown[] = [];
    const unsubscribe = game.subscribe(() => steps.push(storage.savedGame()?.value));
    game.send({ type: "pick", answer: current(game).correct });
    game.send({ type: "finalAnswer" });
    game.send({ type: "reveal" });
    unsubscribe();
    game.send({ type: "next" });
    // Locked in is saved as revealed, so a refresh during the reveal wait comes back at the reveal.
    expect(steps).toEqual(["choosing", { revealing: "right" }, { revealing: "right" }]);
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
