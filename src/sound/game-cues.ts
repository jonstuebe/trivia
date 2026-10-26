import { friendCallLanded, type GameSnapshot } from "../game/machine";
import { LADDER_LENGTH } from "../game/ladder";
import type { CueName } from "./cues";

/**
 * The cues one step of a Game asks for, from the step before it and the one
 * it reached. The Game screen plays them as each step lands, so a cue sounds
 * the same whether the move came from a tap or a key. Add a cue for a Game
 * moment here.
 *
 * - "Final answer" locks in: from confirming the answer into the reveal wait.
 * - The reveal, after the wait: out of the wait into right or wrong. The
 *   last right answer plays the million in place of right.
 * - Walk away, once it's confirmed: into the end of the Game. A win or a
 *   miss ends the Game quietly, since its sting has already played.
 * - Ask the Audience's vote and the phone ringing for Phone a Friend: as the
 *   audience's vote or the Friend's call arrives. Switch the Question clears
 *   both, silently.
 */
export function gameCues(previous: GameSnapshot, next: GameSnapshot): CueName[] {
  const cues: CueName[] = [];
  if (previous.matches("confirmingAnswer") && next.matches("lockedIn")) cues.push("lockIn");
  if (previous.matches("lockedIn") && next.matches({ revealing: "right" })) {
    cues.push(next.context.rung === LADDER_LENGTH ? "million" : "right");
  }
  if (previous.matches("lockedIn") && next.matches({ revealing: "wrong" })) cues.push("wrong");
  if (!previous.matches("finished") && next.matches("finished") && next.context.result?.ending === "walkedAway") {
    cues.push("walkAway");
  }
  if (!previous.context.audience && next.context.audience) cues.push("audienceVote");
  if (friendCallLanded(previous, next)) cues.push("phoneRing");
  return cues;
}
