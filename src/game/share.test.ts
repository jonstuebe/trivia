import { describe, expect, it } from "vitest";
import { shareResult } from "./share";
import type { QuestionOutcome } from "./types";

const rights = (n: number): QuestionOutcome[] => Array.from({ length: n }, () => "right");

describe("shareResult", () => {
  it("matches the example in the Share result decision", () => {
    const text = shareResult(
      {
        topic: { kind: "category", category: "movies" },
        ending: "missed",
        winnings: 32_000,
        reached: [...rights(11), "miss"],
        lifelinesUsed: ["switchTheQuestion", "fiftyFifty", "askTheAudience"],
      },
      "Movies",
    );
    expect(text).toBe(
      ["Trivia · Movies", "$32,000", "✅✅✅✅✅ ✅✅✅✅✅ ✅❌", "✂️ 👥 🔄", "trivia.jonstuebe.com/movies"].join("\n"),
    );
  });

  it("puts 🏆 after the winnings of a full win, and lists every Lifeline in the order they're shown", () => {
    const text = shareResult(
      {
        topic: { kind: "general" },
        ending: "won",
        winnings: 1_000_000,
        reached: rights(15),
        lifelinesUsed: ["phoneAFriend", "switchTheQuestion", "askTheAudience", "fiftyFifty"],
      },
      "General",
    );
    expect(text).toBe(
      [
        "Trivia · General",
        "$1,000,000 🏆",
        "✅✅✅✅✅ ✅✅✅✅✅ ✅✅✅✅✅",
        "✂️ 👥 📞 🔄",
        "trivia.jonstuebe.com/general",
      ].join("\n"),
    );
  });

  it("ends a walk away with 🚶 and links a Title to its own page", () => {
    const text = shareResult(
      {
        topic: { kind: "title", category: "tv", slug: "friends" },
        ending: "walkedAway",
        winnings: 2_000,
        reached: [...rights(6), "walkedAway"],
        lifelinesUsed: ["phoneAFriend"],
      },
      "Friends",
    );
    expect(text).toBe(
      ["Trivia · Friends", "$2,000", "✅✅✅✅✅ ✅🚶", "📞", "trivia.jonstuebe.com/tv/friends"].join("\n"),
    );
  });

  it("reads No lifelines when none were used, and shows $0 for a miss on question 1", () => {
    const text = shareResult(
      {
        topic: { kind: "category", category: "tv" },
        ending: "missed",
        winnings: 0,
        reached: ["miss"],
        lifelinesUsed: [],
      },
      "TV Shows",
    );
    expect(text).toBe(["Trivia · TV Shows", "$0", "❌", "No lifelines", "trivia.jonstuebe.com/tv"].join("\n"));
  });
});
