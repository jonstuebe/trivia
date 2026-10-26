import { describe, expect, it } from "vitest";
import { prizeForRung, winningsAfterMiss, winningsBeforeRung } from "./ladder";

describe("prizeForRung", () => {
  it("follows the Ladder in docs/game-design.md", () => {
    const rungs = Array.from({ length: 15 }, (_, i) => i + 1);
    expect(rungs.map(prizeForRung)).toEqual([
      100, 200, 300, 500, 1_000, 2_000, 4_000, 8_000, 16_000, 32_000, 64_000, 125_000, 250_000, 500_000, 1_000_000,
    ]);
  });

  it("rejects a Rung off the Ladder", () => {
    expect(() => prizeForRung(0)).toThrow(RangeError);
    expect(() => prizeForRung(16)).toThrow(RangeError);
  });
});

describe("winningsAfterMiss", () => {
  it("drops to $0 before the first Safe level", () => {
    expect([1, 2, 5].map(winningsAfterMiss)).toEqual([0, 0, 0]);
  });

  it("keeps $1,000 once past question 5, and $32,000 once past question 10", () => {
    expect([6, 10, 11, 15].map(winningsAfterMiss)).toEqual([1_000, 1_000, 32_000, 32_000]);
  });
});

describe("winningsBeforeRung", () => {
  it("is $0 on question 1, then the prize of the question before", () => {
    expect([1, 2, 6, 15].map(winningsBeforeRung)).toEqual([0, 100, 1_000, 500_000]);
  });
});
