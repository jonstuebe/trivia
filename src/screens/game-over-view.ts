import type { GameOver } from "../game/game-controller";
import { shareResult } from "../game/share";
import { topicName } from "../game/topic";
import type { GameEnding } from "../game/types";
import { formatMoney } from "../ui/money";

/** What the Game over screen shows. */
export interface GameOverView {
  headline: string;
  /** After a miss only. */
  correctAnswer?: string;
  winnings: string;
  /** "🎉 New personal best!" or "Personal best: $X". */
  personalBest: string;
  /** The Share result text. */
  share: string;
}

const HEADLINES: Record<GameEnding, string> = {
  won: "You won the million!",
  missed: "Wrong answer. Game over.",
  walkedAway: "You walked away.",
};

/** Game over for a finished Game; `correctAnswer` is the missed Question's, shown only after a miss. */
export function gameOverView({ result, personalBest, newPersonalBest }: GameOver, correctAnswer?: string): GameOverView {
  return {
    headline: HEADLINES[result.ending],
    correctAnswer: result.ending === "missed" ? correctAnswer : undefined,
    winnings: formatMoney(result.winnings),
    personalBest: newPersonalBest ? "🎉 New personal best!" : `Personal best: ${formatMoney(personalBest)}`,
    share: shareResult(result, topicName(result.topic)),
  };
}
