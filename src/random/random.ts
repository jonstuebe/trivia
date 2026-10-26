/**
 * The random source all game randomness goes through: answer shuffles,
 * Question draws, and the audience and Friend rolls. Game code takes a
 * `Random` as an input, so tests can pass a seeded one and get the same
 * result every run.
 */
export interface Random {
  /** A number in [0, 1), like `Math.random()`. */
  next(): number;
}

/** The source for real play: unseeded, so every Game is different. */
export function createRandom(): Random {
  return { next: () => Math.random() };
}

/** A source that gives the same sequence every time for the same seed. */
export function createSeededRandom(seed: number): Random {
  // mulberry32: small, fast, and good enough for a game.
  let state = seed >>> 0;
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** A new array with the same items in a random order. The input is left as it was. */
export function shuffle<T>(items: readonly T[], random: Random): T[] {
  const result = [...items];
  // Fisher-Yates: every order is equally likely.
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random.next() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/** One possible result of a `weightedPick`, with its relative odds. */
export interface WeightedOutcome<T> {
  value: T;
  /** Relative odds: weights 3 and 1 give 75% and 25%. Zero never gets picked. */
  weight: number;
}

/** Chooses one outcome by the given odds. Throws if no outcome can be picked. */
export function weightedPick<T>(outcomes: readonly WeightedOutcome<T>[], random: Random): T {
  let total = 0;
  let lastPickable: WeightedOutcome<T> | undefined;
  for (const outcome of outcomes) {
    const { weight } = outcome;
    if (!(weight >= 0) || !Number.isFinite(weight)) {
      throw new RangeError(`Weights must be finite and not negative, got ${weight}`);
    }
    total += weight;
    if (weight > 0) lastPickable = outcome;
  }
  if (!lastPickable) throw new RangeError("weightedPick needs an outcome with a positive weight");

  let roll = random.next() * total;
  for (const { value, weight } of outcomes) {
    if (roll < weight) return value;
    roll -= weight;
  }
  // Floating-point rounding can leave the roll a hair past the end.
  return lastPickable.value;
}
