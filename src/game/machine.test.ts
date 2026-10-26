import { describe, expect, it } from "vitest";
import { createSeededRandom } from "../random/random";
import type { Tier } from "../content/schema";
import { restoreGame, saveGame, startGame, type GameActor, type SavedGameSnapshot } from "./machine";
import type { AnswerPosition, GameQuestion, Topic } from "./types";

const topic: Topic = { kind: "general" };

/** 15 Questions, three per Tier, in Ladder order. */
function fifteenQuestions(): GameQuestion[] {
  return Array.from({ length: 15 }, (_, i) => ({
    id: `q${String(i + 1).padStart(7, "0")}`,
    tier: (Math.floor(i / 3) + 1) as Tier,
    subject: "history",
    prompt: `Question ${i + 1}`,
    correct: `Right ${i + 1}`,
    wrong: [`Wrong ${i + 1}a`, `Wrong ${i + 1}b`, `Wrong ${i + 1}c`],
  }));
}

/** The Topic's whole pool: the Game's 15 plus a spare in each Tier, for Switch to draw. */
function topicQuestions(): GameQuestion[] {
  const spares = Array.from({ length: 5 }, (_, i) => ({
    id: `s${String(i + 1).padStart(7, "0")}`,
    tier: (i + 1) as Tier,
    subject: "history" as const,
    prompt: `Spare ${i + 1}`,
    correct: `Spare right ${i + 1}`,
    wrong: [`Spare wrong ${i + 1}a`, `Spare wrong ${i + 1}b`, `Spare wrong ${i + 1}c`] as [string, string, string],
  }));
  return [...fifteenQuestions(), ...spares];
}

function dependencies(seed: number) {
  return { random: createSeededRandom(seed), topicQuestions: topicQuestions(), seen: {} };
}

function newGame(seed = 1): GameActor {
  return startGame({ topic, questions: fifteenQuestions(), ...dependencies(seed) });
}

function saveAndRestore(game: GameActor, seed = 99): GameActor {
  return restoreGame(JSON.parse(JSON.stringify(saveGame(game))) as SavedGameSnapshot, dependencies(seed));
}

function current(game: GameActor) {
  const { context } = game.getSnapshot();
  return context.questions[context.rung - 1]!;
}

function aWrongAnswer(game: GameActor): AnswerPosition {
  return ([0, 1, 2, 3] as const).find((position) => position !== current(game).correct)!;
}

describe("Final answer", () => {
  it("opens on picking an answer, and Cancel goes back to choosing with nothing picked", () => {
    const game = newGame();
    game.send({ type: "pick", answer: 2 });
    expect(game.getSnapshot().value).toBe("confirmingAnswer");
    expect(game.getSnapshot().context.picked).toBe(2);

    game.send({ type: "cancel" });
    expect(game.getSnapshot().value).toBe("choosing");
    expect(game.getSnapshot().context.picked).toBeNull();
  });

  it("counts only a confirmed answer", () => {
    const game = newGame();
    game.send({ type: "pick", answer: aWrongAnswer(game) });
    game.send({ type: "cancel" });
    game.send({ type: "pick", answer: current(game).correct });
    game.send({ type: "finalAnswer" });
    expect(game.getSnapshot().value).toEqual({ revealing: "right" });
  });

  it("ignores Final answer before an answer is picked", () => {
    const game = newGame();
    game.send({ type: "finalAnswer" });
    expect(game.getSnapshot().value).toBe("choosing");
  });
});

function answer(game: GameActor, position: AnswerPosition) {
  game.send({ type: "pick", answer: position });
  game.send({ type: "finalAnswer" });
}

/** Answers right and presses Next until the Game is on `rung`. */
function climbTo(game: GameActor, rung: number) {
  while (game.getSnapshot().context.rung < rung) {
    const before = game.getSnapshot().context.rung;
    answer(game, current(game).correct);
    game.send({ type: "next" });
    if (game.getSnapshot().context.rung !== before + 1) throw new Error(`Stuck on question ${before}`);
  }
}

describe("the reveal", () => {
  it("shows right with the correct answer, and waits for Next", () => {
    const game = newGame();
    answer(game, current(game).correct);
    expect(game.getSnapshot().value).toEqual({ revealing: "right" });
    expect(game.getSnapshot().context.picked).toBe(current(game).correct);
    expect(game.getSnapshot().context.rung).toBe(1);

    game.send({ type: "next" });
    expect(game.getSnapshot().value).toBe("choosing");
    expect(game.getSnapshot().context.rung).toBe(2);
    expect(game.getSnapshot().context.picked).toBeNull();
  });

  it("shows wrong, with what was picked and where the correct answer is", () => {
    const game = newGame();
    const wrong = aWrongAnswer(game);
    answer(game, wrong);
    expect(game.getSnapshot().value).toEqual({ revealing: "wrong" });
    expect(game.getSnapshot().context.picked).toBe(wrong);
    expect(current(game).answers[current(game).correct]).toBe("Right 1");
  });
});

describe("a win", () => {
  it("ends after question 15 with $1,000,000 and 15 right answers", () => {
    const game = newGame();
    climbTo(game, 15);
    answer(game, current(game).correct);
    expect(game.getSnapshot().status).toBe("active");

    game.send({ type: "next" });
    expect(game.getSnapshot().status).toBe("done");
    expect(game.getSnapshot().output).toEqual({
      topic,
      ending: "won",
      winnings: 1_000_000,
      reached: Array(15).fill("right"),
      lifelinesUsed: [],
    });
  });
});

describe("a miss", () => {
  function missOn(rung: number) {
    const game = newGame();
    climbTo(game, rung);
    answer(game, aWrongAnswer(game));
    expect(game.getSnapshot().status).toBe("active");
    game.send({ type: "next" });
    expect(game.getSnapshot().status).toBe("done");
    return game.getSnapshot().output!;
  }

  it("before question 5 leaves with $0", () => {
    expect(missOn(4)).toEqual({
      topic,
      ending: "missed",
      winnings: 0,
      reached: ["right", "right", "right", "miss"],
      lifelinesUsed: [],
    });
  });

  it("on question 5 itself still leaves with $0", () => {
    expect(missOn(5).winnings).toBe(0);
  });

  it("just after question 5 keeps the $1,000 Safe level", () => {
    const result = missOn(6);
    expect(result.winnings).toBe(1_000);
    expect(result.reached).toEqual([...Array(5).fill("right"), "miss"]);
  });

  it("on question 10 keeps $1,000, and after it keeps $32,000", () => {
    expect(missOn(10).winnings).toBe(1_000);
    expect(missOn(11).winnings).toBe(32_000);
    expect(missOn(15).winnings).toBe(32_000);
  });
});

describe("Walk away", () => {
  it("isn't offered on question 1", () => {
    const game = newGame();
    expect(game.getSnapshot().can({ type: "walkAway" })).toBe(false);
    game.send({ type: "walkAway" });
    expect(game.getSnapshot().value).toBe("choosing");
  });

  it("asks to confirm from question 2, and Cancel goes back to choosing", () => {
    const game = newGame();
    climbTo(game, 2);
    expect(game.getSnapshot().can({ type: "walkAway" })).toBe(true);
    game.send({ type: "walkAway" });
    expect(game.getSnapshot().value).toBe("confirmingWalkAway");
    game.send({ type: "cancel" });
    expect(game.getSnapshot().value).toBe("choosing");
    expect(game.getSnapshot().context.rung).toBe(2);
  });

  it("keeps the current winnings once confirmed", () => {
    const game = newGame();
    climbTo(game, 8);
    game.send({ type: "walkAway" });
    game.send({ type: "confirmWalkAway" });
    expect(game.getSnapshot().status).toBe("done");
    expect(game.getSnapshot().output).toEqual({
      topic,
      ending: "walkedAway",
      winnings: 4_000,
      reached: [...Array(7).fill("right"), "walkedAway"],
      lifelinesUsed: [],
    });
  });

  it("isn't offered while an answer waits on Final answer", () => {
    const game = newGame();
    climbTo(game, 3);
    game.send({ type: "pick", answer: 0 });
    game.send({ type: "walkAway" });
    expect(game.getSnapshot().value).toBe("confirmingAnswer");
  });
});

describe("saving and restoring a Game", () => {
  it("round-trips through JSON as plain data and plays on from where it was", () => {
    const game = newGame(3);
    climbTo(game, 6);
    const restored = saveAndRestore(game);
    expect(restored.getSnapshot().value).toBe("choosing");
    expect(restored.getSnapshot().context).toEqual(game.getSnapshot().context);

    answer(restored, aWrongAnswer(restored));
    restored.send({ type: "next" });
    expect(restored.getSnapshot().output).toMatchObject({ ending: "missed", winnings: 1_000 });
  });

  it("keeps the step within a question", () => {
    const game = newGame();
    climbTo(game, 2);
    game.send({ type: "walkAway" });
    const restored = saveAndRestore(game);
    expect(restored.getSnapshot().value).toBe("confirmingWalkAway");
  });
});

describe("starting a Game", () => {
  it("shows question 1, for $100, with its four answers", () => {
    const game = newGame();
    const { context } = game.getSnapshot();
    expect(game.getSnapshot().value).toBe("choosing");
    expect(context.rung).toBe(1);
    const shown = context.questions[0]!;
    expect(shown.question.prompt).toBe("Question 1");
    expect([...shown.answers].sort()).toEqual(["Right 1", "Wrong 1a", "Wrong 1b", "Wrong 1c"]);
    expect(shown.answers[shown.correct]).toBe("Right 1");
  });

  it("shuffles the answers the same way for the same seed", () => {
    const orders = (seed: number) => newGame(seed).getSnapshot().context.questions.map((q) => q.answers.join("|"));
    expect(orders(7)).toEqual(orders(7));
    expect(orders(7)).not.toEqual(orders(8));
    const correctPositions = new Set(orders(7).map((_, i) => newGame(7).getSnapshot().context.questions[i]!.correct));
    expect(correctPositions.size).toBeGreaterThan(1);
  });

  it("needs exactly 15 Questions", () => {
    expect(() =>
      startGame({ topic, questions: fifteenQuestions().slice(0, 14), ...dependencies(1) }),
    ).toThrow(RangeError);
  });
});

describe("50:50", () => {
  function removedWith(seed: number) {
    const game = newGame(seed);
    game.send({ type: "fiftyFifty" });
    return game.getSnapshot().context.removed;
  }

  it("removes two wrong answers, the same two for the same seed", () => {
    const game = newGame(4);
    game.send({ type: "fiftyFifty" });
    const { removed, lifelinesUsed } = game.getSnapshot().context;
    expect(removed).toHaveLength(2);
    expect(new Set(removed).size).toBe(2);
    expect(removed).not.toContain(current(game).correct);
    expect(lifelinesUsed).toEqual(["fiftyFifty"]);
    expect(game.getSnapshot().value).toBe("choosing");
    expect(removedWith(4)).toEqual(removed);
    const bySeed = new Set(Array.from({ length: 20 }, (_, i) => removedWith(i + 1).join()));
    expect(bySeed.size).toBeGreaterThan(1);
  });

  it("can be used once, and a removed answer can't be picked", () => {
    const game = newGame();
    game.send({ type: "fiftyFifty" });
    const { removed } = game.getSnapshot().context;
    expect(game.getSnapshot().can({ type: "fiftyFifty" })).toBe(false);
    game.send({ type: "pick", answer: removed[0]! });
    expect(game.getSnapshot().value).toBe("choosing");
  });

  it("brings back all four answers on the next question", () => {
    const game = newGame();
    game.send({ type: "fiftyFifty" });
    climbTo(game, 2);
    expect(game.getSnapshot().context.removed).toEqual([]);
    expect(game.getSnapshot().can({ type: "fiftyFifty" })).toBe(false);
  });
});

describe("Ask the Audience", () => {
  it("shows a vote over all four answers that adds up to 100, once per Game", () => {
    const game = newGame();
    game.send({ type: "askTheAudience" });
    const { audience, lifelinesUsed } = game.getSnapshot().context;
    expect(audience!.votes.reduce((a, b) => a + b, 0)).toBe(100);
    expect(audience!.votes.every((vote) => vote > 0)).toBe(true);
    expect(lifelinesUsed).toEqual(["askTheAudience"]);
    expect(game.getSnapshot().can({ type: "askTheAudience" })).toBe(false);
  });

  it("only votes between the two answers a 50:50 left", () => {
    const game = newGame(5);
    game.send({ type: "fiftyFifty" });
    game.send({ type: "askTheAudience" });
    const { audience, removed, lifelinesUsed } = game.getSnapshot().context;
    for (const position of removed) expect(audience!.votes[position]).toBe(0);
    expect(audience!.votes.filter((vote) => vote > 0)).toHaveLength(2);
    expect(lifelinesUsed).toEqual(["fiftyFifty", "askTheAudience"]);
  });

  it("is gone on the next question", () => {
    const game = newGame();
    game.send({ type: "askTheAudience" });
    climbTo(game, 2);
    expect(game.getSnapshot().context.audience).toBeNull();
  });
});

describe("Phone a Friend", () => {
  it("opens a pick of the four Friends, and Cancel goes back without spending it", () => {
    const game = newGame();
    game.send({ type: "phoneAFriend" });
    expect(game.getSnapshot().value).toBe("pickingFriend");
    game.send({ type: "pick", answer: 0 });
    expect(game.getSnapshot().value).toBe("pickingFriend");

    game.send({ type: "cancel" });
    expect(game.getSnapshot().value).toBe("choosing");
    expect(game.getSnapshot().context.lifelinesUsed).toEqual([]);
    expect(game.getSnapshot().context.friend).toBeNull();
    expect(game.getSnapshot().can({ type: "phoneAFriend" })).toBe(true);
  });

  it("calls the chosen Friend, who names an answer still in play, once per Game", () => {
    const game = newGame(6);
    game.send({ type: "fiftyFifty" });
    game.send({ type: "phoneAFriend" });
    game.send({ type: "callFriend", friend: "sports" });
    const { friend, removed, lifelinesUsed } = game.getSnapshot().context;
    expect(game.getSnapshot().value).toBe("choosing");
    expect(friend).toMatchObject({ friend: "sports" });
    expect(removed).not.toContain(friend!.answer);
    expect(friend!.line).toContain("ABCD"[friend!.answer]);
    expect(lifelinesUsed).toEqual(["fiftyFifty", "phoneAFriend"]);
    expect(game.getSnapshot().can({ type: "phoneAFriend" })).toBe(false);
  });

  it("is gone on the next question", () => {
    const game = newGame();
    game.send({ type: "phoneAFriend" });
    game.send({ type: "callFriend", friend: "history" });
    climbTo(game, 2);
    expect(game.getSnapshot().context.friend).toBeNull();
  });
});

describe("Switch the Question", () => {
  it("is unavailable through question 10", () => {
    const game = newGame();
    expect(game.getSnapshot().can({ type: "switchTheQuestion" })).toBe(false);
    climbTo(game, 10);
    game.send({ type: "switchTheQuestion" });
    expect(game.getSnapshot().context.lifelinesUsed).toEqual([]);
    climbTo(game, 11);
    expect(game.getSnapshot().can({ type: "switchTheQuestion" })).toBe(true);
  });

  it("swaps in a Question from the same Tier, once per Game, keeping the one switched away from", () => {
    const game = newGame();
    climbTo(game, 11);
    const before = current(game).question;
    game.send({ type: "switchTheQuestion" });
    const { context } = game.getSnapshot();
    expect(current(game).question.prompt).toBe("Spare 4");
    expect([...current(game).answers].sort()).toEqual([
      "Spare right 4",
      "Spare wrong 4a",
      "Spare wrong 4b",
      "Spare wrong 4c",
    ]);
    expect(current(game).answers[current(game).correct]).toBe("Spare right 4");
    expect(context.switchedAway).toEqual([before]);
    expect(context.lifelinesUsed).toEqual(["switchTheQuestion"]);
    expect(game.getSnapshot().can({ type: "switchTheQuestion" })).toBe(false);

    answer(game, current(game).correct);
    expect(game.getSnapshot().value).toEqual({ revealing: "right" });
  });

  it("is unavailable when the Tier has no other Question left", () => {
    const game = startGame({ topic, questions: fifteenQuestions(), ...dependencies(1), topicQuestions: fifteenQuestions() });
    climbTo(game, 11);
    expect(game.getSnapshot().can({ type: "switchTheQuestion" })).toBe(false);
  });

  it("after a 50:50 brings back all four answers, and clears the audience and the Friend", () => {
    const game = newGame(2);
    climbTo(game, 13);
    game.send({ type: "fiftyFifty" });
    game.send({ type: "askTheAudience" });
    game.send({ type: "phoneAFriend" });
    game.send({ type: "callFriend", friend: "science" });
    game.send({ type: "switchTheQuestion" });
    const { context } = game.getSnapshot();
    expect(current(game).question.prompt).toBe("Spare 5");
    expect(context.removed).toEqual([]);
    expect(context.audience).toBeNull();
    expect(context.friend).toBeNull();
    expect(context.lifelinesUsed).toEqual(["fiftyFifty", "askTheAudience", "phoneAFriend", "switchTheQuestion"]);
    for (const lifeline of ["fiftyFifty", "askTheAudience", "phoneAFriend", "switchTheQuestion"] as const) {
      expect(game.getSnapshot().can({ type: lifeline })).toBe(false);
    }

    answer(game, current(game).correct);
    game.send({ type: "next" });
    climbTo(game, 15);
    answer(game, current(game).correct);
    game.send({ type: "next" });
    expect(game.getSnapshot().output).toMatchObject({
      ending: "won",
      lifelinesUsed: ["fiftyFifty", "askTheAudience", "phoneAFriend", "switchTheQuestion"],
    });
  });
});
