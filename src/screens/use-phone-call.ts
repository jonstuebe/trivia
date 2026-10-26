import { useEffect, useState } from "react";
import type { PlayingGame } from "../game/game-controller";
import { CALL_WAIT } from "./lifelines-view";

/**
 * Whether the phone is still ringing on the Friend just called: true for
 * `CALL_WAIT` after a Phone a Friend call lands here, while the ring plays
 * and "Calling …" shows in place of the Friend's line. A resumed Game's
 * Friend has already picked up, so it never rings again.
 */
export function usePhoneCall(game: PlayingGame): boolean {
  const [calling, setCalling] = useState(false);
  useEffect(() => {
    let timer: number | undefined;
    let previous = game.snapshot();
    const unsubscribe = game.subscribe(() => {
      const next = game.snapshot();
      if (!previous.context.friend && next.context.friend) {
        setCalling(true);
        window.clearTimeout(timer);
        timer = window.setTimeout(() => setCalling(false), CALL_WAIT);
      }
      previous = next;
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, [game]);
  return calling;
}
