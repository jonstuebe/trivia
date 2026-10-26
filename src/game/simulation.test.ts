import { describe, expect, it } from "vitest";
import type { Subject, Tier } from "../content/schema";
import { createSeededRandom } from "../random/random";
import { askTheAudience } from "./simulation";
import type { AnswerPosition, ShownQuestion } from "./types";

function shownQuestion(tier: Tier, correct: AnswerPosition = 2, subject: Subject = "history"): ShownQuestion {
  return {
    question: { id: "abcd1234", tier, prompt: "Which?", correct: "Right", wrong: ["W1", "W2", "W3"], subject },
    answers: ["A", "B", "C", "D"],
    correct,
  };
}

const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);

describe("askTheAudience", () => {
  it("gives whole-number votes on all four answers that add up to 100%", () => {
    const random = createSeededRandom(1);
    for (let i = 0; i < 200; i++) {
      const { votes } = askTheAudience({ shown: shownQuestion(3), random });
      expect(sum(votes)).toBe(100);
      for (const vote of votes) expect(Number.isInteger(vote) && vote > 0).toBe(true);
    }
  });

  it.each([
    { tier: 1, odds: 0.95, leadShare: 75 },
    { tier: 2, odds: 0.85, leadShare: 66 },
    { tier: 3, odds: 0.7, leadShare: 57 },
    { tier: 4, odds: 0.55, leadShare: 49 },
    { tier: 5, odds: 0.4, leadShare: 40 },
  ] as const)("on Tier $tier, over 10,000 rolls, leads with the right answer at $odds odds by about $leadShare points", ({ tier, odds, leadShare }) => {
    const random = createSeededRandom(tier);
    const rolls = 10_000;
    let rightLeads = 0;
    let leadTotal = 0;
    for (let i = 0; i < rolls; i++) {
      const { votes } = askTheAudience({ shown: shownQuestion(tier, 1), random });
      const lead = Math.max(...votes);
      // Exactly one answer leads.
      expect(votes.filter((vote) => vote === lead)).toHaveLength(1);
      if (votes[1] === lead) rightLeads++;
      leadTotal += lead;
    }
    expect(Math.abs(rightLeads / rolls - odds)).toBeLessThan(0.02);
    expect(Math.abs(leadTotal / rolls - leadShare)).toBeLessThan(2);
  });

  it("leads with each wrong answer about equally when it gets it wrong", () => {
    const random = createSeededRandom(9);
    const wrongLeads = [0, 0, 0, 0];
    for (let i = 0; i < 10_000; i++) {
      const { votes } = askTheAudience({ shown: shownQuestion(5, 0), random });
      wrongLeads[votes.indexOf(Math.max(...votes))]!++;
    }
    // 60% wrong, split three ways: about 2,000 each.
    for (const count of wrongLeads.slice(1)) expect(Math.abs(count - 2000)).toBeLessThan(200);
  });

  it("after a 50:50 gives votes only to the two answers left", () => {
    const random = createSeededRandom(2);
    for (let i = 0; i < 200; i++) {
      const { votes } = askTheAudience({ shown: shownQuestion(5, 2), remaining: [0, 2], random });
      expect(votes[1]).toBe(0);
      expect(votes[3]).toBe(0);
      expect(votes[0] + votes[2]).toBe(100);
    }
  });
});
