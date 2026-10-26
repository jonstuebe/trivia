import { describe, expect, it } from "vitest";
import type { Subject, Tier } from "../content/schema";
import { createSeededRandom } from "../random/random";
import { askTheAudience, phoneAFriend } from "./simulation";
import type { AnswerPosition, Friend, ShownQuestion } from "./types";

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

describe("phoneAFriend", () => {
  function rightRate(tier: Tier, friend: Friend, subject: Subject, seed: number) {
    const random = createSeededRandom(seed);
    let right = 0;
    for (let i = 0; i < 10_000; i++) {
      if (phoneAFriend({ shown: shownQuestion(tier, 3, subject), friend, random }).answer === 3) right++;
    }
    return right / 10_000;
  }

  it.each([
    { tier: 1, onSubject: 0.95, offSubject: 0.85 },
    { tier: 2, onSubject: 0.95, offSubject: 0.75 },
    { tier: 3, onSubject: 0.85, offSubject: 0.6 },
    { tier: 4, onSubject: 0.7, offSubject: 0.45 },
    { tier: 5, onSubject: 0.55, offSubject: 0.3 },
  ] as const)(
    "on Tier $tier, over 10,000 rolls, is right $onSubject of the time on their Subject and $offSubject off it",
    ({ tier, onSubject, offSubject }) => {
      expect(Math.abs(rightRate(tier, "science", "science", tier) - onSubject)).toBeLessThan(0.02);
      expect(Math.abs(rightRate(tier, "sports", "science", tier + 10) - offSubject)).toBeLessThan(0.02);
    },
  );

  it("after a 50:50 only ever names one of the two answers left", () => {
    const random = createSeededRandom(3);
    for (let i = 0; i < 500; i++) {
      const { answer } = phoneAFriend({ shown: shownQuestion(5, 3), remaining: [1, 3], friend: "history", random });
      expect([1, 3]).toContain(answer);
    }
  });

  function calls(tier: Tier, seed: number, count = 2000) {
    const random = createSeededRandom(seed);
    return Array.from({ length: count }, () =>
      phoneAFriend({ shown: shownQuestion(tier, 3, "history"), friend: "history", random }),
    );
  }
  const mean = (values: readonly number[]) => sum(values) / values.length;

  it("gives one line naming the answer's letter and a confidence", () => {
    for (const call of calls(3, 4, 200)) {
      expect(Number.isInteger(call.confidence) && call.confidence > 0 && call.confidence < 100).toBe(true);
      // The named letter stands alone in the line, and no other answer's letter does.
      expect(call.line.match(/\b[ABCD]\b/g)).toEqual(["ABCD"[call.answer]]);
      expect(call.line).toContain(`${call.confidence}%`);
    }
  });

  it("sounds less sure on harder Tiers", () => {
    const byTier = ([1, 2, 3, 4, 5] as const).map((tier) => mean(calls(tier, 20 + tier).map((c) => c.confidence)));
    for (let i = 1; i < byTier.length; i++) expect(byTier[i]!).toBeLessThan(byTier[i - 1]!);
  });

  it("sounds surer when right, but is sometimes confidently wrong", () => {
    const all = calls(3, 5, 5000);
    const right = all.filter((c) => c.answer === 3).map((c) => c.confidence);
    const wrong = all.filter((c) => c.answer !== 3).map((c) => c.confidence);
    expect(mean(right)).toBeGreaterThan(mean(wrong) + 5);
    const surestRight = Math.max(...right);
    expect(wrong.some((confidence) => confidence >= surestRight - 15)).toBe(true);
  });

  it("on Tier 5 sometimes admits they're guessing, and never before", () => {
    const tier5 = calls(5, 6);
    const guesses = tier5.filter((c) => c.guessing);
    expect(guesses.length / tier5.length).toBeGreaterThan(0.15);
    expect(guesses.length / tier5.length).toBeLessThan(0.5);
    for (const guess of guesses) {
      expect(guess.confidence).toBeLessThanOrEqual(35);
      expect(guess.line.toLowerCase()).toContain("guess");
    }
    for (const tier of [1, 2, 3, 4] as const) expect(calls(tier, 7, 500).some((c) => c.guessing)).toBe(false);
  });
});

describe("the audience and Friend together", () => {
  it("roll independently, so over 10,000 Tier 5 Questions they agree on being right only by chance", () => {
    const random = createSeededRandom(8);
    const rolls = 10_000;
    let bothRight = 0;
    for (let i = 0; i < rolls; i++) {
      const shown = shownQuestion(5, 0, "science");
      const { votes } = askTheAudience({ shown, random });
      const { answer } = phoneAFriend({ shown, friend: "sports", random });
      if (votes[0] === Math.max(...votes) && answer === 0) bothRight++;
    }
    // Audience 40% times off-Subject Friend 30%.
    expect(Math.abs(bothRight / rolls - 0.4 * 0.3)).toBeLessThan(0.02);
  });

  it("give plain data that survives being saved, and the same seed gives the same result", () => {
    const shown = shownQuestion(4, 1);
    const roll = (seed: number) => {
      const random = createSeededRandom(seed);
      return { audience: askTheAudience({ shown, random }), friend: phoneAFriend({ shown, friend: "history", random }) };
    };
    const result = roll(42);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    expect(roll(42)).toEqual(result);
  });

  it("reject answers left that leave out the right one or repeat one", () => {
    const random = createSeededRandom(1);
    const shown = shownQuestion(1, 2);
    expect(() => askTheAudience({ shown, remaining: [0, 1], random })).toThrow(RangeError);
    expect(() => phoneAFriend({ shown, remaining: [2, 2], friend: "history", random })).toThrow(RangeError);
  });
});
