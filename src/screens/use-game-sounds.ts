import { useEffect } from "react";
import { sound } from "../app/sound";
import type { PlayingGame } from "../game/game-controller";
import { gameCues } from "../sound/game-cues";

/**
 * Plays the cues each step of `game` asks for (`gameCues`), as the step
 * lands. A resumed Game starts quiet: only steps taken here make sound.
 */
export function useGameSounds(game: PlayingGame): void {
  useEffect(() => {
    let previous = game.snapshot();
    return game.subscribe(() => {
      const next = game.snapshot();
      for (const cue of gameCues(previous, next)) sound.play(cue);
      previous = next;
    });
  }, [game]);
}
