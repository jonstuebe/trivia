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
