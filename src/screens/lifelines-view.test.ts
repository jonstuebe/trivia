import { describe, expect, it } from "vitest";
import type { Tier } from "../content/schema";
import { startGame, type GameActor } from "../game/machine";
import type { AnswerPosition, GameQuestion } from "../game/types";
import { createSeededRandom } from "../random/random";
import { lifelinesView } from "./lifelines-view";

/** `perTier` Questions in each Tier, so Switch has spares when it's more than 3. */
function questionsFor(perTier: number): GameQuestion[] {
  return Array.from({ length: perTier * 5 }, (_, i) => ({
    id: `q${String(i + 1).padStart(7, "0")}`,
    tier: (Math.floor(i / perTier) + 1) as Tier,
    subject: "pop culture",
    prompt: `Question ${i + 1}?`,
    correct: `Right ${i + 1}`,
    wrong: [`Wrong ${i + 1}a`, `Wrong ${i + 1}b`, `Wrong ${i + 1}c`],
  }));
}

/** A Game of 15 drawn three per Tier, with `perTier` Questions in the Topic for Switch to draw from. */
function newGame(perTier = 4): GameActor {
  const topicQuestions = questionsFor(perTier);
  const questions = ([1, 2, 3, 4, 5] as const).flatMap((tier) =>
    topicQuestions.filter((question) => question.tier === tier).slice(0, 3),
  );
  return startGame({
    topic: { kind: "title", category: "tv", slug: "fixture-sitcom" },
    questions,
    random: createSeededRandom(11),
    topicQuestions,
    readSeen: () => ({}),
  });
}

const view = (game: GameActor) => lifelinesView(game.getSnapshot());

function correct(game: GameActor): AnswerPosition {
  const { context } = game.getSnapshot();
  return context.questions[context.rung - 1]!.correct;
}

function playTo(game: GameActor, rung: number) {
  while (game.getSnapshot().context.rung < rung) {
    game.send({ type: "pick", answer: correct(game) });
    game.send({ type: "finalAnswer" });
    game.send({ type: "next" });
  }
}

const ovals = (game: GameActor) => view(game).ovals.map(({ name, label, state }) => ({ name, label, state }));

describe("the Lifeline ovals", () => {
  it("are 50:50, Ask the Audience, Phone a Friend and Switch the Question, in that order, with Switch locked through question 10", () => {
    const game = newGame();
    expect(ovals(game)).toEqual([
      { name: "50:50", label: "50:50", state: "ready" },
      { name: "Ask the Audience", label: "👥", state: "ready" },
      { name: "Phone a Friend", label: "📞", state: "ready" },
      { name: "Switch the Question", label: "🔄", state: "locked" },
    ]);
    playTo(game, 10);
    expect(view(game).ovals[3]).toMatchObject({ state: "locked", status: "locked until question 11", enabled: false });
    playTo(game, 11);
    expect(view(game).ovals[3]).toMatchObject({ state: "ready", enabled: true });
  });

  it("say their key and send their Lifeline", () => {
    expect(view(newGame()).ovals.map(({ key, event }) => [key, event.type])).toEqual([
      ["F", "fiftyFifty"],
      ["Q", "askTheAudience"],
      ["P", "phoneAFriend"],
      ["S", "switchTheQuestion"],
    ]);
  });

  it("are struck through once used, and say so in text", () => {
    const game = newGame();
    game.send({ type: "fiftyFifty" });
    expect(view(game).ovals[0]).toMatchObject({ state: "used", status: "used", enabled: false });
    expect(view(game).ovals[1]).toMatchObject({ state: "ready", enabled: true });
    expect(view(game).ovals[1]!.status).toBeUndefined();
  });

  it("can't be used while an answer waits on Final answer, but aren't shown as used", () => {
    const game = newGame();
    game.send({ type: "pick", answer: 0 });
    expect(view(game).ovals.slice(0, 3).map(({ state, enabled }) => [state, enabled])).toEqual([
      ["ready", false],
      ["ready", false],
      ["ready", false],
    ]);
  });

  it("show Switch as having nothing left when the Tier has no spare Question", () => {
    const game = newGame(3);
    playTo(game, 11);
    expect(view(game).ovals[3]).toMatchObject({ state: "locked", status: "no questions left to switch to", enabled: false });
  });
});

describe("the Lifeline results", () => {
  it("show nothing before a Lifeline is used", () => {
    expect(view(newGame())).toMatchObject({ fiftyFifty: undefined, audience: undefined, pickFriend: undefined, friend: undefined });
  });

  it("say which two answers the 50:50 took away", () => {
    const game = newGame();
    game.send({ type: "fiftyFifty" });
    const gone = game.getSnapshot().context.removed.map((position) => "ABCD"[position]);
    expect(view(game).fiftyFifty).toBe(`50:50 took away ${gone[0]} and ${gone[1]}.`);
  });

  it("give the audience's vote as bars and as text, adding up to 100%", () => {
    const game = newGame();
    game.send({ type: "askTheAudience" });
    const audience = view(game).audience!;
    expect(audience.bars.map((bar) => bar.letter)).toEqual(["A", "B", "C", "D"]);
    expect(audience.bars.reduce((sum, bar) => sum + bar.percent, 0)).toBe(100);
    expect(audience.text).toMatch(/^The audience voted A: \d+%, B: \d+%, C: \d+%, D: \d+%\.$/);
    expect(audience.bars[1]).toMatchObject({ label: `B: ${audience.bars[1]!.percent}%` });
  });

  it("leave the answers a 50:50 took away out of the audience's vote", () => {
    const game = newGame();
    game.send({ type: "fiftyFifty" });
    game.send({ type: "askTheAudience" });
    const { removed } = game.getSnapshot().context;
    const left = ["A", "B", "C", "D"].filter((_, position) => !removed.includes(position as AnswerPosition));
    expect(view(game).audience!.bars.map((bar) => bar.letter)).toEqual(left);
    expect(view(game).audience!.text).toMatch(new RegExp(`^The audience voted ${left[0]}: \\d+%, ${left[1]}: \\d+%\\.$`));
  });

  it("offer the four Friends while picking one", () => {
    const game = newGame();
    game.send({ type: "phoneAFriend" });
    expect(view(game).pickFriend).toEqual({
      title: "Who do you call?",
      friends: [
        { friend: "history", name: "History buff" },
        { friend: "science", name: "Science buff" },
        { friend: "sports", name: "Sports fan" },
        { friend: "pop culture", name: "Pop-culture fan" },
      ],
    });
    game.send({ type: "cancel" });
    expect(view(game).pickFriend).toBeUndefined();
    expect(view(game).ovals[2]).toMatchObject({ state: "ready", enabled: true });
  });

  it("give the Friend's line as text, saying who it is", () => {
    const game = newGame();
    game.send({ type: "phoneAFriend" });
    game.send({ type: "callFriend", friend: "sports" });
    expect(view(game).friend).toMatch(/^Sports fan: “.+”$/);
    expect(view(game).friend).toContain(game.getSnapshot().context.friend!.line);
  });

  it("are cleared by Switch the Question", () => {
    const game = newGame();
    playTo(game, 11);
    game.send({ type: "fiftyFifty" });
    game.send({ type: "askTheAudience" });
    game.send({ type: "phoneAFriend" });
    game.send({ type: "callFriend", friend: "history" });
    game.send({ type: "switchTheQuestion" });
    expect(view(game)).toMatchObject({ fiftyFifty: undefined, audience: undefined, friend: undefined });
    expect(view(game).ovals.map((oval) => oval.state)).toEqual(["used", "used", "used", "used"]);
  });
});
