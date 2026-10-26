import type { GameActor } from "../game/machine";
import type { CueName } from "./cues";

type GameSnapshot = ReturnType<GameActor["getSnapshot"]>;

/**
 * The cues one step of a Game asks for, from the step before it and the one
 * it reached. The Game screen plays them as each step lands, so a cue sounds
 * the same whether the move came from a tap or a key. Add a cue for a Game
 * moment here.
 *
 * - "Final answer" locks in: from confirming the answer to revealing it.
 */
export function gameCues(previous: GameSnapshot, next: GameSnapshot): CueName[] {
  const cues: CueName[] = [];
  if (previous.matches("confirmingAnswer") && next.matches("revealing")) cues.push("lockIn");
  return cues;
}
