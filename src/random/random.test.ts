import { describe, expect, it } from "vitest";
import { createUnseededRandom, createSeededRandom, shuffle, weightedPick, type Random } from "./random";

function take(random: Random, count: number): number[] {
  return Array.from({ length: count }, () => random.next());
}

describe("seeded random source", () => {
  it("gives the same sequence for the same seed", () => {
    expect(take(createSeededRandom(42), 20)).toEqual(take(createSeededRandom(42), 20));
  });

  it("gives different sequences for different seeds", () => {
    expect(take(createSeededRandom(1), 20)).not.toEqual(take(createSeededRandom(2), 20));
  });

  it("gives numbers in [0, 1) that vary", () => {
    const values = take(createSeededRandom(7), 1000);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(new Set(values).size).toBeGreaterThan(990);
  });
});

describe("unseeded random source", () => {
  it("gives numbers in [0, 1) that differ between sources", () => {
    const a = take(createUnseededRandom(), 20);
    const b = take(createUnseededRandom(), 20);
    for (const value of [...a, ...b]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(a).not.toEqual(b);
  });
});

describe("shuffle", () => {
  const items = ["A", "B", "C", "D", "E", "F", "G", "H"];

  it("keeps every item exactly once", () => {
    const shuffled = shuffle(items, createSeededRandom(3));
    expect(shuffled).toHaveLength(items.length);
    expect([...shuffled].sort()).toEqual(items);
  });

  it("does not change the list it was given", () => {
    const original = [...items];
    shuffle(items, createSeededRandom(3));
    expect(items).toEqual(original);
  });

  it("gives the same order for the same seed", () => {
    expect(shuffle(items, createSeededRandom(9))).toEqual(shuffle(items, createSeededRandom(9)));
  });

  it("reorders the items, differently for different seeds", () => {
    const orders = new Set(
      [1, 2, 3, 4, 5].map((seed) => shuffle(items, createSeededRandom(seed)).join("")),
    );
    orders.delete(items.join(""));
    expect(orders.size).toBeGreaterThan(1);
  });

  it("puts each item first about equally often", () => {
    const random = createSeededRandom(2024);
    const rolls = 10_000;
    const firsts = new Map<string, number>();
    for (let i = 0; i < rolls; i++) {
      const first = shuffle(["A", "B", "C", "D"], random)[0]!;
      firsts.set(first, (firsts.get(first) ?? 0) + 1);
    }
    for (const item of ["A", "B", "C", "D"]) {
      expect(Math.abs((firsts.get(item) ?? 0) / rolls - 0.25)).toBeLessThan(0.02);
    }
  });
});

describe("weighted pick", () => {
  function shareOfRolls<T>(
    outcomes: readonly { value: T; weight: number }[],
    seed: number,
    rolls = 10_000,
  ): Map<T, number> {
    const random = createSeededRandom(seed);
    const counts = new Map<T, number>();
    for (let i = 0; i < rolls; i++) {
      const value = weightedPick(outcomes, random);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return new Map([...counts].map(([value, count]) => [value, count / rolls]));
  }

  // The 95/85/70/55/40% odds from the testing approach (issue #10).
  it.each([0.95, 0.85, 0.7, 0.55, 0.4])(
    "lands on odds of %s over 10,000 rolls, within 2 points",
    (odds) => {
      const shares = shareOfRolls(
        [
          { value: "right", weight: odds },
          { value: "wrong", weight: 1 - odds },
        ],
        1234,
      );
      expect(Math.abs((shares.get("right") ?? 0) - odds)).toBeLessThan(0.02);
    },
  );

  it("follows the odds across several outcomes, given as any weights", () => {
    const shares = shareOfRolls(
      [
        { value: "A", weight: 4 },
        { value: "B", weight: 3 },
        { value: "C", weight: 2 },
        { value: "D", weight: 1 },
      ],
      99,
    );
    const expected = { A: 0.4, B: 0.3, C: 0.2, D: 0.1 };
    for (const [value, share] of Object.entries(expected)) {
      expect(Math.abs((shares.get(value) ?? 0) - share)).toBeLessThan(0.02);
    }
  });

  it("never picks an outcome with no weight", () => {
    const shares = shareOfRolls(
      [
        { value: "A", weight: 1 },
        { value: "never", weight: 0 },
        { value: "B", weight: 1 },
      ],
      5,
    );
    expect(shares.has("never")).toBe(false);
  });

  it("gives the same picks for the same seed", () => {
    const outcomes = [
      { value: 1, weight: 1 },
      { value: 2, weight: 1 },
      { value: 3, weight: 1 },
    ];
    const picks = (seed: number) => {
      const random = createSeededRandom(seed);
      return Array.from({ length: 20 }, () => weightedPick(outcomes, random));
    };
    expect(picks(8)).toEqual(picks(8));
  });

  it("refuses outcomes it can't pick from", () => {
    const random = createSeededRandom(1);
    expect(() => weightedPick([], random)).toThrow();
    expect(() => weightedPick([{ value: "A", weight: 0 }], random)).toThrow();
    expect(() => weightedPick([{ value: "A", weight: -1 }, { value: "B", weight: 2 }], random)).toThrow();
  });
});
