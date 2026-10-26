import { describe, expect, it } from "vitest";
import { createSeededRandom } from "../random/random";
import type { Tier } from "../content/schema";
import { startGame, type GameActor } from "./machine";
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

function newGame(seed = 1): GameActor {
  return startGame({ topic, questions: fifteenQuestions(), random: createSeededRandom(seed) });
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
      startGame({ topic, questions: fifteenQuestions().slice(0, 14), random: createSeededRandom(1) }),
    ).toThrow(RangeError);
  });
});
