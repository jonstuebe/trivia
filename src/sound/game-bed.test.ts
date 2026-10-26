import { describe, expect, it } from "vitest";
import type { Tier } from "../content/schema";
import { restoreGame, saveGame, startGame, type GameActor } from "../game/machine";
import type { AnswerPosition, GameQuestion } from "../game/types";
import { createSeededRandom } from "../random/random";
import { BEDS, type BedName } from "./cues";
import { createFakeAudio } from "./fake-audio";
import { gameBed } from "./game-bed";
import { createSoundEngine } from "./sound-engine";

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

const dependencies = () => ({ random: createSeededRandom(7), topicQuestions: fifteenQuestions(), readSeen: () => ({}) });

function newGame(): GameActor {
  return startGame({
    topic: { kind: "title", category: "tv", slug: "fixture-sitcom" },
    questions: fifteenQuestions(),
    ...dependencies(),
  });
}

function correct(game: GameActor): AnswerPosition {
  const { context } = game.getSnapshot();
  return context.questions[context.rung - 1]!.correct;
}

function wrong(game: GameActor): AnswerPosition {
  return ((correct(game) + 1) % 4) as AnswerPosition;
}

const bed = (game: GameActor) => gameBed(game.getSnapshot());

/** Answers the Question on screen right, through the reveal, without going on. */
function lockInAndReveal(game: GameActor, answer: AnswerPosition): void {
  game.send({ type: "pick", answer });
  game.send({ type: "finalAnswer" });
  game.send({ type: "reveal" });
}

/** Climbs to `rung` with right answers. */
function climbTo(game: GameActor, rung: number): void {
  while (game.getSnapshot().context.rung < rung) {
    lockInAndReveal(game, correct(game));
    game.send({ type: "next" });
  }
}

describe("the Game's Tier bed", () => {
  it("climbs a Tier every three Rungs", () => {
    const game = newGame();
    const beds: string[] = [];
    for (let rung = 1; rung <= 15; rung++) {
      climbTo(game, rung);
      beds.push(String(bed(game)));
    }
    expect(beds).toEqual([
      "tier1", "tier1", "tier1",
      "tier2", "tier2", "tier2",
      "tier3", "tier3", "tier3",
      "tier4", "tier4", "tier4",
      "tier5", "tier5", "tier5",
    ]);
  });

  it("draws out at the Question's Tier through the reveal wait, then gives way to the reveal", () => {
    const game = newGame();
    climbTo(game, 7);
    game.send({ type: "pick", answer: correct(game) });
    expect(bed(game)).toBe("tier3");
    game.send({ type: "finalAnswer" });
    expect(bed(game)).toBe("tier3LockedIn");
    game.send({ type: "reveal" });
    expect(bed(game)).toBeUndefined();
    game.send({ type: "next" });
    expect(bed(game)).toBe("tier3");
  });

  it("carries on through the Lifelines and their dialogs", () => {
    const game = newGame();
    climbTo(game, 4);
    game.send({ type: "fiftyFifty" });
    expect(bed(game)).toBe("tier2");
    game.send({ type: "askTheAudience" });
    expect(bed(game)).toBe("tier2");
    game.send({ type: "phoneAFriend" });
    expect(game.getSnapshot().matches("pickingFriend")).toBe(true);
    expect(bed(game)).toBe("tier2");
    game.send({ type: "cancel" });
    game.send({ type: "switchTheQuestion" });
    expect(bed(game)).toBe("tier2");
    game.send({ type: "walkAway" });
    expect(bed(game)).toBe("tier2");
  });

  it("stops on Walk away", () => {
    const game = newGame();
    climbTo(game, 2);
    game.send({ type: "walkAway" });
    game.send({ type: "confirmWalkAway" });
    expect(game.getSnapshot().status).toBe("done");
    expect(bed(game)).toBeUndefined();
  });

  it("stops on a wrong answer's Game over", () => {
    const game = newGame();
    climbTo(game, 5);
    lockInAndReveal(game, wrong(game));
    game.send({ type: "next" });
    expect(game.getSnapshot().status).toBe("done");
    expect(bed(game)).toBeUndefined();
  });

  it("stops on winning the million", () => {
    const game = newGame();
    climbTo(game, 15);
    lockInAndReveal(game, correct(game));
    game.send({ type: "next" });
    expect(game.getSnapshot().status).toBe("done");
    expect(bed(game)).toBeUndefined();
  });

  it("stays quiet on a Game resumed at the reveal", () => {
    const game = newGame();
    climbTo(game, 10);
    game.send({ type: "pick", answer: correct(game) });
    game.send({ type: "finalAnswer" });
    const resumed = restoreGame(saveGame(game), dependencies());
    expect(bed(resumed)).toBeUndefined();
    resumed.send({ type: "next" });
    expect(bed(resumed)).toBe("tier4");
  });
});

describe("the Tier beds", () => {
  function engine() {
    const audio = createFakeAudio();
    let muted = false;
    const remembered = { muted: () => muted, setMuted: (value: boolean) => void (muted = value) };
    return { audio, sound: createSoundEngine({ createContext: audio.createContext, remembered }) };
  }

  it("each make sound, and stop every source they started", () => {
    for (const name of Object.keys(BEDS) as BedName[]) {
      const { audio, sound } = engine();
      sound.unlock();
      sound.startBed(name);
      expect(audio.started.length, name).toBeGreaterThan(0);
      sound.stopBed();
      expect(audio.stopped, name).toBe(audio.started.length);
    }
  });

  it("go quiet on the mute, and come back at the same Tier when it's turned off", () => {
    const { audio, sound } = engine();
    sound.unlock();
    sound.startBed("tier4");
    sound.setMuted(true);
    expect(sound.state().bed).toBeUndefined();
    expect(audio.stopped).toBe(audio.started.length);
    sound.setMuted(false);
    expect(sound.state().bed).toBe("tier4");
    expect(audio.started.length).toBeGreaterThan(audio.stopped);
  });
});
