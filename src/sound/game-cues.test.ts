import { describe, expect, it } from "vitest";
import type { Tier } from "../content/schema";
import { startGame, type GameActor } from "../game/machine";
import type { AnswerPosition, GameQuestion } from "../game/types";
import { createSeededRandom } from "../random/random";
import type { GameSnapshot } from "../screens/game-view";
import { gameCues } from "./game-cues";

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

function newGame(): GameActor {
  const questions = fifteenQuestions();
  return startGame({
    topic: { kind: "title", category: "tv", slug: "fixture-sitcom" },
    questions,
    random: createSeededRandom(7),
    topicQuestions: questions,
    readSeen: () => ({}),
  });
}

function correct(game: GameActor): AnswerPosition {
  const { context } = game.getSnapshot();
  return context.questions[context.rung - 1]!.correct;
}

/** Plays a Game, collecting the cues each step asks for. */
function cuesWhile(game: GameActor, steps: (send: GameActor["send"]) => void): string[] {
  const cues: string[] = [];
  let previous: GameSnapshot = game.getSnapshot();
  const subscription = game.subscribe((next) => {
    cues.push(...gameCues(previous, next));
    previous = next;
  });
  steps((event) => game.send(event));
  subscription.unsubscribe();
  return cues;
}

describe("the Game's sound cues", () => {
  it("lock in on Final answer, right or wrong", () => {
    const game = newGame();
    const cues = cuesWhile(game, (send) => {
      send({ type: "pick", answer: correct(game) });
      send({ type: "finalAnswer" });
      send({ type: "next" });
      send({ type: "pick", answer: ((correct(game) + 1) % 4) as AnswerPosition });
      send({ type: "finalAnswer" });
    });
    expect(cues).toEqual(["lockIn", "lockIn"]);
  });

  it("are silent on picking an answer and cancelling it", () => {
    const game = newGame();
    const cues = cuesWhile(game, (send) => {
      send({ type: "pick", answer: 0 });
      send({ type: "cancel" });
    });
    expect(cues).toEqual([]);
  });
});
