import type { GameActor } from "../game/machine";
import type { CueName } from "./cues";

type GameSnapshot = ReturnType<GameActor["getSnapshot"]>;

/**
 * The cues one step of a Game asks for, from the step before it and the one
 * it reached. The Game screen plays them as each step lands, so a cue sounds
 * the same whether the move came from a tap or a key. Add a cue for a Game
 * moment here.
 *
 * - "Final answer" locks in: from confirming the answer into the reveal wait.
 * - The reveal, after the wait: out of the wait into right or wrong.
 * - Walk away, once it's confirmed, and the million, on moving on from the
 *   last right answer: into the end of the Game. A miss ends the Game
 *   quietly, since its wrong sting has already played.
 * - Ask the Audience's vote and the phone ringing for Phone a Friend: as the
 *   audience's vote or the Friend's call arrives. Switch the Question clears
 *   both, silently.
 */
export function gameCues(previous: GameSnapshot, next: GameSnapshot): CueName[] {
  const cues: CueName[] = [];
  if (previous.matches("confirmingAnswer") && next.matches("lockedIn")) cues.push("lockIn");
  if (previous.matches("lockedIn") && next.matches({ revealing: "right" })) cues.push("right");
  if (previous.matches("lockedIn") && next.matches({ revealing: "wrong" })) cues.push("wrong");
  if (!previous.matches("finished") && next.matches("finished")) {
    const ending = next.context.result?.ending;
    if (ending === "walkedAway") cues.push("walkAway");
    if (ending === "won") cues.push("million");
  }
  if (!previous.context.audience && next.context.audience) cues.push("audienceVote");
  if (!previous.context.friend && next.context.friend) cues.push("phoneRing");
  return cues;
}
