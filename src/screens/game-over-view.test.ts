import { describe, expect, it } from "vitest";
import type { GameResult } from "../game/types";
import { gameOverView, shareNote } from "./game-over-view";

const topic = { kind: "title", category: "tv", slug: "fixture-sitcom" } as const;

function result(overrides: Partial<GameResult>): GameResult {
  return { topic, ending: "won", winnings: 1_000_000, reached: Array(15).fill("right"), lifelinesUsed: [], ...overrides };
}

describe("Game over", () => {
  it("after a win: the headline, the winnings, a new Personal best and the Share result", () => {
    const view = gameOverView({ result: result({}), personalBest: 1_000_000, newPersonalBest: true });
    expect(view).toEqual({
      headline: "You won the million!",
      correctAnswer: undefined,
      winnings: "$1,000,000",
      personalBest: "🎉 New personal best!",
      share: [
        "Trivia · Fixture Sitcom",
        "$1,000,000 🏆",
        "✅✅✅✅✅ ✅✅✅✅✅ ✅✅✅✅✅",
        "No lifelines",
        "trivia.jonstuebe.workers.dev/tv/fixture-sitcom",
      ].join("\n"),
    });
  });

  it("after a miss: the correct answer, and the Personal best it didn't beat", () => {
    const view = gameOverView(
      {
        result: result({ ending: "missed", winnings: 1_000, reached: [...Array(7).fill("right"), "miss"] }),
        personalBest: 32_000,
        newPersonalBest: false,
      },
      "Right answer",
    );
    expect(view).toMatchObject({
      headline: "Wrong answer. Game over.",
      correctAnswer: "Right answer",
      winnings: "$1,000",
      personalBest: "Personal best: $32,000",
    });
  });

  it("after a Walk away", () => {
    const view = gameOverView({
      result: result({ ending: "walkedAway", winnings: 200, reached: ["right", "right", "walkedAway"] }),
      personalBest: 200,
      newPersonalBest: true,
    });
    expect(view).toMatchObject({ headline: "You walked away.", correctAnswer: undefined, winnings: "$200" });
  });
});

describe("the note under Share", () => {
  it("says Copied after a copy", () => {
    expect(shareNote("copied")).toBe("Copied");
  });

  it("after a failed copy, says to select the text by hand", () => {
    expect(shareNote("copyFailed")).toBe("Couldn't copy. Select the text above to copy it.");
  });

  it("says nothing after the share sheet, which speaks for itself, or after it's cancelled", () => {
    expect(shareNote("shared")).toBe("");
    expect(shareNote("cancelled")).toBe("");
  });
});
