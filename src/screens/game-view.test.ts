import { describe, expect, it } from "vitest";
import type { Tier } from "../content/schema";
import { startGame, type GameActor } from "../game/machine";
import type { AnswerPosition, GameQuestion, Topic } from "../game/types";
import { createSeededRandom } from "../random/random";
import { gameView } from "./game-view";

/** 15 Questions, three per Tier, each from a Title so a Mixed game can label them. */
function fifteenQuestions(): GameQuestion[] {
  return Array.from({ length: 15 }, (_, i) => ({
    id: `q${String(i + 1).padStart(7, "0")}`,
    tier: (Math.floor(i / 3) + 1) as Tier,
    subject: "pop culture",
    titleName: "Fixture Sitcom",
    prompt: `Question ${i + 1}?`,
    correct: `Right ${i + 1}`,
    wrong: [`Wrong ${i + 1}a`, `Wrong ${i + 1}b`, `Wrong ${i + 1}c`],
  }));
}

function newGame(topic: Topic = { kind: "title", category: "tv", slug: "fixture-sitcom" }): GameActor {
  const questions = fifteenQuestions();
  return startGame({ topic, questions, random: createSeededRandom(7), topicQuestions: questions, readSeen: () => ({}) });
}

function view(game: GameActor) {
  return gameView(game.getSnapshot());
}

function correct(game: GameActor): AnswerPosition {
  const { context } = game.getSnapshot();
  return context.questions[context.rung - 1]!.correct;
}

function wrong(game: GameActor): AnswerPosition {
  return ([0, 1, 2, 3] as const).find((position) => position !== correct(game))!;
}

/** Answers right through to `rung`, leaving the Game choosing there. */
function playTo(game: GameActor, rung: number) {
  while (game.getSnapshot().context.rung < rung) {
    game.send({ type: "pick", answer: correct(game) });
    game.send({ type: "finalAnswer" });
    game.send({ type: "reveal" });
    game.send({ type: "next" });
  }
}

describe("the Game header", () => {
  it("shows the question number and prize", () => {
    const game = newGame();
    expect(view(game).heading).toBe("Question 1 of 15 · for $100");

    playTo(game, 7);
    expect(view(game).heading).toBe("Question 7 of 15 · for $4,000");
  });
});

describe("the answers", () => {
  it("are lettered A to D in the order shown, none marked while choosing", () => {
    const game = newGame();
    const { answers } = game.getSnapshot().context.questions[0]!;
    expect(view(game).answers).toEqual(
      ["A", "B", "C", "D"].map((letter, i) => ({ letter, text: answers[i], mark: "none", label: `${letter}: ${answers[i]}` })),
    );
  });

  it("are taken away two at a time by the 50:50, never the correct one", () => {
    const game = newGame();
    expect(view(game).answers.some((answer) => answer.removed)).toBe(false);
    game.send({ type: "fiftyFifty" });
    const removed = view(game).answers.flatMap((answer, position) => (answer.removed ? [position] : []));
    expect(removed).toHaveLength(2);
    expect(removed).not.toContain(correct(game));
  });

  it("marks the picked one while waiting on Final answer", () => {
    const game = newGame();
    game.send({ type: "pick", answer: 2 });
    expect(view(game).answers.map((answer) => answer.mark)).toEqual(["none", "none", "picked", "none"]);
  });

  it("marks the right one with a ✓ in its name on a right answer", () => {
    const game = newGame();
    const right = correct(game);
    game.send({ type: "pick", answer: right });
    game.send({ type: "finalAnswer" });
    game.send({ type: "reveal" });
    const answer = view(game).answers[right]!;
    expect(answer.mark).toBe("right");
    expect(answer.label).toBe(`${answer.letter}: Right 1, ✓ correct`);
  });

  it("marks the pick wrong with a ✗ and still shows the correct one on a miss", () => {
    const game = newGame();
    const picked = wrong(game);
    game.send({ type: "pick", answer: picked });
    game.send({ type: "finalAnswer" });
    game.send({ type: "reveal" });
    const { answers } = view(game);
    expect(answers[picked]!.mark).toBe("wrong");
    expect(answers[picked]!.label).toMatch(/, ✗ your answer, wrong$/);
    expect(answers[correct(game)]!.mark).toBe("right");
    expect(answers.filter((answer) => answer.mark === "none")).toHaveLength(2);
  });
});

describe("the reveal wait", () => {
  it("says the answer is locked in and the reveal is coming, and shows no result yet", () => {
    const game = newGame();
    const picked = wrong(game);
    game.send({ type: "pick", answer: picked });
    expect(view(game).lockedIn).toBeUndefined();
    game.send({ type: "finalAnswer" });
    const shown = view(game);
    const { letter, text } = shown.answers[picked]!;
    expect(shown.lockedIn).toBe(`${letter}: ${text} is locked in. The answer is coming…`);
    expect(shown.reveal).toBeUndefined();
    expect(shown.finalAnswer).toBeUndefined();
    expect(shown.answers.map((answer) => answer.mark).filter((mark) => mark !== "none")).toEqual(["picked"]);
    expect(shown.answers[picked]!.label).toBe(`${letter}: ${text}, locked in`);

    game.send({ type: "reveal" });
    expect(view(game).lockedIn).toBeUndefined();
  });

  it("keeps the Ladder on the Rung being played until a right answer is revealed, then steps it up", () => {
    const game = newGame();
    playTo(game, 4);
    game.send({ type: "pick", answer: correct(game) });
    game.send({ type: "finalAnswer" });
    expect(view(game).ladderRung).toBe(4);
    game.send({ type: "reveal" });
    expect(view(game).ladderRung).toBe(5);
    game.send({ type: "next" });
    expect(view(game).ladderRung).toBe(5);
  });

  it("leaves the Ladder where it was on a wrong answer", () => {
    const game = newGame();
    playTo(game, 4);
    game.send({ type: "pick", answer: wrong(game) });
    game.send({ type: "finalAnswer" });
    game.send({ type: "reveal" });
    expect(view(game).ladderRung).toBe(4);
  });
});

describe("the announcement", () => {
  it("says the Rung and prize, the Question, then the four answers", () => {
    const game = newGame();
    playTo(game, 3);
    const [a, b, c, d] = game.getSnapshot().context.questions[2]!.answers;
    expect(view(game).announcement).toBe(`Question 3 for $300. Question 3? A: ${a}. B: ${b}. C: ${c}. D: ${d}.`);
  });
});

describe("Final answer", () => {
  it("asks about the picked answer by its letter", () => {
    const game = newGame();
    expect(view(game).finalAnswer).toBeUndefined();
    game.send({ type: "pick", answer: 1 });
    expect(view(game).finalAnswer).toBe("B: is that your final answer?");
  });
});

describe("the reveal", () => {
  it("says a right answer and what's banked, then moves to the next question", () => {
    const game = newGame();
    playTo(game, 4);
    game.send({ type: "pick", answer: correct(game) });
    expect(view(game).reveal).toBeUndefined();
    game.send({ type: "finalAnswer" });
    game.send({ type: "reveal" });
    expect(view(game).reveal).toEqual({ right: true, message: "✓ Correct! You've banked $500.", next: "Next question" });
  });

  it("says the million-dollar question was right on Rung 15, then goes to the result", () => {
    const game = newGame();
    playTo(game, 15);
    game.send({ type: "pick", answer: correct(game) });
    game.send({ type: "finalAnswer" });
    game.send({ type: "reveal" });
    expect(view(game).reveal).toEqual({
      right: true,
      message: "✓ Correct! That was the million-dollar question!",
      next: "See result",
    });
  });

  it("says a miss, the Safe level dropped to, and the correct answer", () => {
    const game = newGame();
    playTo(game, 12);
    game.send({ type: "pick", answer: wrong(game) });
    game.send({ type: "finalAnswer" });
    game.send({ type: "reveal" });
    expect(view(game).reveal).toEqual({
      right: false,
      message: "✗ Wrong. The correct answer was Right 12. You drop to $32,000.",
      next: "See result",
    });
  });
});

describe("Walk away", () => {
  it("isn't offered on question 1", () => {
    expect(view(newGame()).walkAway).toBeUndefined();
  });

  it("offers the winnings so far from question 2, and asks to confirm", () => {
    const game = newGame();
    playTo(game, 6);
    expect(view(game).walkAway).toEqual({ link: "Walk away with $1,000", confirm: "Walk away with $1,000?" });
  });

  it("isn't offered while an answer is waiting on Final answer", () => {
    const game = newGame();
    playTo(game, 2);
    game.send({ type: "pick", answer: 0 });
    expect(view(game).walkAway).toBeUndefined();
  });
});

describe("the Title label", () => {
  it("shows each Question's Title in a Mixed game", () => {
    expect(view(newGame({ kind: "category", category: "tv" })).titleLabel).toBe("Fixture Sitcom");
    expect(view(newGame({ kind: "category", category: "movies" })).titleLabel).toBe("Fixture Sitcom");
  });

  it("isn't shown when the Game is one Title, or General", () => {
    expect(view(newGame()).titleLabel).toBeUndefined();
    expect(view(newGame({ kind: "general" })).titleLabel).toBeUndefined();
  });
});
