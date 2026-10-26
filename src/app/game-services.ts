import { createGameController, type PlayingGame } from "../game/game-controller";
import { savedGameFormat } from "../game/saved-game";
import type { Topic } from "../game/types";
import { createUnseededRandom } from "../random/random";
import { createDeviceStorage } from "../storage";

/**
 * The app's one device storage and Game controller, shared by every screen.
 * Screens read Personal bests and the Saved game from `storage`, and start,
 * check and reset Topics through `controller`; the controller does the
 * marking, saving and Personal best updates itself.
 */
export const storage = createDeviceStorage(window.localStorage, {
  savedGame: savedGameFormat,
  persist: () => navigator.storage.persist(),
});

export const controller = createGameController({ storage, random: createUnseededRandom() });

/** The Game being played in this tab, handed from Ready to play to the Game screen. */
let current: PlayingGame | undefined;

/**
 * Starts a new Game in `topic` and keeps it as this tab's current Game, for
 * `/game` to pick up with `currentGame()`. Call it from the Start click, not
 * an effect, so StrictMode can't start two.
 */
export async function startGame(topic: Topic): Promise<PlayingGame> {
  current = await controller.startGame(topic);
  return current;
}

/** This tab's current Game, or undefined after a refresh (then `controller.resumeGame()` brings back the Saved game). */
export function currentGame(): PlayingGame | undefined {
  return current;
}

/** Makes `game` this tab's current Game, as after a resume. */
export function setCurrentGame(game: PlayingGame | undefined): void {
  current = game;
}
