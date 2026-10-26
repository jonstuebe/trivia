import type { Tier } from "../content/schema";
import { revealWait } from "../game/reveal-wait";

/**
 * The test build's switch for instant reveals: while this localStorage key
 * is "on", the reveal wait is 0, so the e2e journeys that climb the Ladder
 * stay fast. tests/support/engine.ts sets it on every page; the reveal wait
 * journey clears it to time the real wait. The real build never reads it.
 */
export const INSTANT_REVEAL_KEY = "trivia.fixtures.instantReveal";

/**
 * Written out rather than compared with `FIXTURE_MODE`, so the real build
 * folds the check to false and drops the switch (as beacon.ts does).
 */
const FIXTURE_BUILD = import.meta.env.MODE === "fixtures";

function instantReveal(): boolean {
  try {
    return window.localStorage.getItem(INSTANT_REVEAL_KEY) === "on";
  } catch {
    return false;
  }
}

/** The reveal wait for a Question in `tier` on this device now, in milliseconds: see `revealWait`. */
export function revealWaitHere(tier: Tier): number {
  if (FIXTURE_BUILD && instantReveal()) return 0;
  return revealWait(tier, { reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches });
}
