import { INSTANT_REVEAL_KEY } from "../content/fixture-mode";
import type { Tier } from "../content/schema";
import { revealWait } from "../game/reveal-wait";

/**
 * Only the test build reads `INSTANT_REVEAL_KEY`. Written out rather than
 * compared with `FIXTURE_MODE`, so the real build folds the check to false
 * and drops the switch (as beacon.ts does). The test build is also what the
 * preview URL serves until Phase 7, so there anyone who sets the key by
 * hand gets instant reveals.
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
