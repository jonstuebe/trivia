import { useEffect } from "react";
import { sound } from "../app/sound";
import type { PlayingGame } from "../game/game-controller";
import type { BedName } from "../sound/cues";
import { gameBed } from "../sound/game-bed";
import { gameCues } from "../sound/game-cues";

/**
 * Plays the cues each step of `game` asks for (`gameCues`), as the step
 * lands, and keeps the bed it wants (`gameBed`) playing: the Tier bed under
 * each Question, drawn out through the reveal wait. A resumed Game plays no
 * cues for where it was: only steps taken here make a sting. Leaving the
 * Game stops the bed. It only ever stops its own bed, so the menu theme the
 * root starts on the way out (`useMenuTheme`) isn't cut off, whichever
 * effect runs first.
 */
export function useGameSounds(game: PlayingGame): void {
  useEffect(() => {
    let bed: BedName | undefined;
    const playBed = (next: BedName | undefined) => {
      if (next) sound.startBed(next);
      else if (bed) sound.stopBed(bed);
      bed = next;
    };
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
      playBed(undefined);
    };
  }, [game]);
}
