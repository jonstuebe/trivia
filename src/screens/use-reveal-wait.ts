import { useEffect } from "react";
import { revealWaitHere } from "../app/reveal-pacing";
import type { Tier } from "../content/schema";
import type { PlayingGame } from "../game/game-controller";

/**
 * Runs the reveal wait: while the Game is locked in, sends `reveal` once the
 * wait for the Question's Tier has passed (`revealWait`, cut under reduced
 * motion). Nothing the player does ends it sooner. Leaving the screen stops
 * the wait; the Saved game already holds the reveal, so it comes back there.
 */
export function useRevealWait(game: PlayingGame, lockedIn: boolean, tier: Tier): void {
  useEffect(() => {
    if (!lockedIn) return;
    const timer = window.setTimeout(() => game.send({ type: "reveal" }), revealWaitHere(tier));
    return () => window.clearTimeout(timer);
  }, [game, lockedIn, tier]);
}
