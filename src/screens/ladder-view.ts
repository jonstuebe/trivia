import { LADDER_LENGTH, prizeForRung, SAFE_RUNGS } from "../game/ladder";
import { formatMoney } from "../ui/money";

/** One Rung of the Ladder as shown, from Rung 1 up. */
export interface RungView {
  rung: number;
  /** "$32,000", for the vertical Ladder on desktop. */
  prize: string;
  /** "$32K", for the phone strip. */
  short: string;
  /** A Safe level: white and bold on desktop, underlined on phones, and said in words. */
  safe: boolean;
  /** Passed, being played now (gold), or still to come. */
  state: "done" | "current" | "ahead";
}

/** "$100", "$32K", "$1M". */
function shortMoney(dollars: number): string {
  if (dollars >= 1_000_000) return `$${dollars / 1_000_000}M`;
  if (dollars >= 1_000) return `$${dollars / 1_000}K`;
  return `$${dollars}`;
}

/** The Ladder's 15 Rungs, from Rung 1 up, with `rung` the one being played. */
export function ladderView(rung: number): RungView[] {
  return Array.from({ length: LADDER_LENGTH }, (_, i) => {
    const at = i + 1;
    const prize = prizeForRung(at);
    return {
      rung: at,
      prize: formatMoney(prize),
      short: shortMoney(prize),
      safe: SAFE_RUNGS.some((safe) => safe === at),
      state: at < rung ? "done" : at === rung ? "current" : "ahead",
    };
  });
}
