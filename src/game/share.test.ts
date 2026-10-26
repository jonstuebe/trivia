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
});
