import type { GameActor } from "../game/machine";
import { tierForRung } from "../game/ladder";
import type { BedName } from "./cues";

type GameSnapshot = ReturnType<GameActor["getSnapshot"]>;

/**
 * The bed a Game wants at this step: the Tier bed for the Rung under each
 * Question (through the Lifelines and every dialog too), its locked-in
 * version through the reveal wait, and nothing once the answer is revealed
 * (the right or wrong sting has the stage) or the Game is over. A Game
 * resumed at the reveal starts there, so it starts quiet.
 */
export function gameBed(snapshot: GameSnapshot): BedName | undefined {
  if (snapshot.status === "done" || snapshot.matches("revealing")) return undefined;
  const tier = tierForRung(snapshot.context.rung);
  return snapshot.matches("lockedIn") ? `tier${tier}LockedIn` : `tier${tier}`;
}
