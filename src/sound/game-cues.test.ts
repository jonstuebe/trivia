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

/** A Game of fifteen, with `spares` more Questions in the Topic for Switch the Question to draw from. */
function newGame(spares: GameQuestion[] = []): GameActor {
  const questions = fifteenQuestions();
  return startGame({
    topic: { kind: "title", category: "tv", slug: "fixture-sitcom" },
    questions,
    random: createSeededRandom(7),
    topicQuestions: [...questions, ...spares],
    readSeen: () => ({}),
  });
}

function correct(game: GameActor): AnswerPosition {
  const { context } = game.getSnapshot();
  return context.questions[context.rung - 1]!.correct;
}

/** Answers `count` Questions right, quietly. */
function playRight(game: GameActor, count: number): void {
  for (let i = 0; i < count; i++) {
    game.send({ type: "pick", answer: correct(game) });
    game.send({ type: "finalAnswer" });
    game.send({ type: "reveal" });
    game.send({ type: "next" });
  }
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
  it("lock in on Final answer, and nothing more through the reveal wait", () => {
    const game = newGame();
    const cues = cuesWhile(game, (send) => {
      send({ type: "pick", answer: correct(game) });
      send({ type: "finalAnswer" });
    });
    expect(cues).toEqual(["lockIn"]);
    expect(game.getSnapshot().matches("lockedIn")).toBe(true);
  });

  it("sting a right answer and a wrong one when the reveal shows, after the lock-in", () => {
    const game = newGame();
    const cues = cuesWhile(game, (send) => {
      send({ type: "pick", answer: correct(game) });
      send({ type: "finalAnswer" });
      send({ type: "reveal" });
      send({ type: "next" });
      send({ type: "pick", answer: ((correct(game) + 1) % 4) as AnswerPosition });
      send({ type: "finalAnswer" });
      send({ type: "reveal" });
      send({ type: "next" });
    });
    expect(cues).toEqual(["lockIn", "right", "lockIn", "wrong"]);
  });

  it("sting a Walk away when it's confirmed", () => {
    const game = newGame();
    playRight(game, 1);
    const cues = cuesWhile(game, (send) => {
      send({ type: "walkAway" });
      send({ type: "cancel" });
      send({ type: "walkAway" });
      send({ type: "confirmWalkAway" });
    });
    expect(cues).toEqual(["walkAway"]);
  });

  it("play the million's sting on moving on from the last right answer", () => {
    const game = newGame();
    playRight(game, 14);
    const cues = cuesWhile(game, (send) => {
      send({ type: "pick", answer: correct(game) });
      send({ type: "finalAnswer" });
      send({ type: "reveal" });
      send({ type: "next" });
    });
    expect(cues).toEqual(["lockIn", "right", "million"]);
    expect(game.getSnapshot().status).toBe("done");
  });

  it("play the audience vote for Ask the Audience, and the phone ringing once a Friend is called", () => {
    const game = newGame();
    const cues = cuesWhile(game, (send) => {
      send({ type: "fiftyFifty" });
      send({ type: "askTheAudience" });
      send({ type: "phoneAFriend" });
      send({ type: "cancel" });
      send({ type: "phoneAFriend" });
      send({ type: "callFriend", friend: "sports" });
    });
    expect(cues).toEqual(["audienceVote", "phoneRing"]);
  });

  it("are silent when Switch the Question clears the audience and the Friend", () => {
    const spare = { ...fifteenQuestions()[10]!, id: "q0000099", prompt: "A spare?" };
    const game = newGame([spare]);
    playRight(game, 10);
    const cues = cuesWhile(game, (send) => {
      send({ type: "askTheAudience" });
      send({ type: "phoneAFriend" });
      send({ type: "callFriend", friend: "history" });
      send({ type: "switchTheQuestion" });
    });
    expect(cues).toEqual(["audienceVote", "phoneRing"]);
    expect(game.getSnapshot().context.lifelinesUsed).toContain("switchTheQuestion");
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
