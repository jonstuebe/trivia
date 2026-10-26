import { TIERS, type Tier } from "../content/schema";

/** The Ladder: 15 Rungs, each worth more than the last, with Safe levels at 5 and 10. */

const PRIZES = [
  100, 200, 300, 500, 1_000, 2_000, 4_000, 8_000, 16_000, 32_000, 64_000, 125_000, 250_000, 500_000, 1_000_000,
] as const;

/** The Rungs whose prize is kept after a later wrong answer. */
export const SAFE_RUNGS = [5, 10] as const;

/** How many Rungs the Ladder has. */
export const LADDER_LENGTH = PRIZES.length;

function checkRung(rung: number): void {
  if (!Number.isInteger(rung) || rung < 1 || rung > LADDER_LENGTH) throw new RangeError(`No Rung ${rung}`);
}

/** The prize for answering Rung `rung` (1–15) right. */
export function prizeForRung(rung: number): number {
  checkRung(rung);
  return PRIZES[rung - 1]!;
}

/** What the player has won on reaching Rung `rung`: what a Walk away there keeps. */
export function winningsBeforeRung(rung: number): number {
  checkRung(rung);
  return rung === 1 ? 0 : prizeForRung(rung - 1);
}

/** What the player leaves with after missing Rung `rung`: the last Safe level passed, or $0. */
export function winningsAfterMiss(rung: number): number {
  checkRung(rung);
  const passed = SAFE_RUNGS.filter((safe) => safe < rung);
  const last = passed[passed.length - 1];
  return last === undefined ? 0 : prizeForRung(last);
}

/** The Tier for a Rung (1–15): Rungs 1–3 are Tier 1, up to 13–15 for Tier 5. */
export function tierForRung(rung: number): Tier {
  checkRung(rung);
  return Math.ceil(rung / (LADDER_LENGTH / TIERS.length)) as Tier;
}
