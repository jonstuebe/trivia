import type { Tier } from "../content/schema";

/** The reveal wait under reduced motion, at every Tier, in milliseconds. */
export const REDUCED_MOTION_REVEAL_WAIT = 1_000;

/**
 * How long the Game waits after "Final answer" before showing right or wrong,
 * in milliseconds: about 1s at Tier 1, a second more for each Tier up to
 * about 5s at Tier 5, and about 1s at every Tier with reduced motion. The
 * wait can't be skipped; the suspense bed plays across it.
 */
export function revealWait(tier: Tier, { reducedMotion }: { reducedMotion: boolean }): number {
  return reducedMotion ? REDUCED_MOTION_REVEAL_WAIT : tier * 1_000;
}
