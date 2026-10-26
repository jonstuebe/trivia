import { useEffect } from "react";
import { sound } from "../app/sound";
import type { PlayingGame } from "../game/game-controller";
import { gameBed } from "../sound/game-bed";
import { gameCues } from "../sound/game-cues";

/**
 * Plays the cues each step of `game` asks for (`gameCues`), as the step
 * lands, and keeps the bed it wants (`gameBed`) playing: the Tier bed under
 * each Question, drawn out through the reveal wait. A resumed Game plays no
 * cues for where it was: only steps taken here make a sting. Leaving the
 * Game stops the bed.
 */
export function useGameSounds(game: PlayingGame): void {
  useEffect(() => {
    let previous = game.snapshot();
    playBed(gameBed(previous));
    const unsubscribe = game.subscribe(() => {
      const next = game.snapshot();
      for (const cue of gameCues(previous, next)) sound.play(cue);
      playBed(gameBed(next));
      previous = next;
    });
    return () => {
      unsubscribe();
      sound.stopBed();
    };
  }, [game]);
}

function playBed(bed: ReturnType<typeof gameBed>): void {
  if (bed) sound.startBed(bed);
  else sound.stopBed();
}
