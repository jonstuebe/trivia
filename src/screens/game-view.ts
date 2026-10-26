import { shownNow, type GameActor } from "../game/machine";
import { LADDER_LENGTH, prizeForRung, winningsAfterMiss, winningsBeforeRung } from "../game/ladder";
import { ANSWER_POSITIONS, type AnswerPosition } from "../game/types";
import type { AnswerMark } from "../ui/lozenge";
import { formatMoney } from "../ui/money";

/** A Game's snapshot, as `PlayingGame.snapshot()` gives it. */
export type GameSnapshot = ReturnType<GameActor["getSnapshot"]>;

/**
 * What the Game screen shows for a snapshot, worked out from the Game alone
 * so the screen only lays it out.
 */
export interface GameView {
  /** "Question 7 of 15 · for $4,000". */
  heading: string;
  /** The Question's Title ("Friends"), in a Mixed game only. */
  titleLabel?: string;
  /** The four answers, A to D, in the order shown. */
  answers: AnswerView[];
  /** What screen readers hear for a new Question: its Rung and prize, the Question, then the four answers. */
  announcement: string;
  /** "B: is that your final answer?", while an answer waits on Final answer / Cancel. */
  finalAnswer?: string;
  /**
   * "B: Monica is locked in. The answer is coming…", through the reveal wait
   * after Final answer, when the stage dims and nothing can be picked.
   */
  lockedIn?: string;
  /** Right or wrong, said in words with a ✓ or ✗, and what Next does. Only while revealing. */
  reveal?: { right: boolean; message: string; next: "Next question" | "See result" };
  /** Walk away, when it's offered now (choosing, from question 2). */
  walkAway?: { link: string; confirm: string };
  /**
   * The Rung the Ladder shows as current: the one being played, stepping up
   * to the next as soon as a right answer is revealed (past 15 on the win).
   */
  ladderRung: number;
}

export interface AnswerView {
  letter: string;
  text: string;
  mark: AnswerMark;
  /** Its accessible name: "B: Monica", with the reveal said in words, never colour alone. */
  label: string;
  /** Taken away by the 50:50: out of view and out of picking. Set only when true. */
  removed?: true;
}

export const ANSWER_LETTERS = ["A", "B", "C", "D"] as const;

const MARK_SUFFIX: Record<AnswerMark, string> = {
  none: "",
  picked: "",
  right: ", ✓ correct",
  wrong: ", ✗ your answer, wrong",
};

function markFor(snapshot: GameSnapshot, position: AnswerPosition): AnswerMark {
  const { picked } = snapshot.context;
  const { correct } = shownNow(snapshot.context);
  const revealing = snapshot.matches("revealing") || snapshot.matches("finished");
  if (revealing && position === correct) return "right";
  if (revealing && position === picked) return "wrong";
  if (position === picked) return "picked";
  return "none";
}

function revealFor(snapshot: GameSnapshot): GameView["reveal"] {
  const { rung, picked } = snapshot.context;
  const { answers, correct } = shownNow(snapshot.context);
  if (snapshot.matches({ revealing: "right" })) {
    return rung === LADDER_LENGTH
      ? { right: true, message: "✓ Correct! That was the million-dollar question!", next: "See result" }
      : { right: true, message: `✓ Correct! You've banked ${formatMoney(prizeForRung(rung))}.`, next: "Next question" };
  }
  if (snapshot.matches({ revealing: "wrong" }) && picked !== null) {
    return {
      right: false,
      message: `✗ Wrong. The correct answer was ${answers[correct]}. You drop to ${formatMoney(winningsAfterMiss(rung))}.`,
      next: "See result",
    };
  }
  return undefined;
}

export function gameView(snapshot: GameSnapshot): GameView {
  const { context } = snapshot;
  const { rung, topic, picked } = context;
  const { question, answers } = shownNow(context);
  const lockedIn = snapshot.matches("lockedIn") && picked !== null;
  const prize = formatMoney(prizeForRung(rung));
  const banked = formatMoney(winningsBeforeRung(rung));
  const lettered = ANSWER_POSITIONS.map((position) => `${ANSWER_LETTERS[position]}: ${answers[position]}.`);
  return {
    answers: ANSWER_POSITIONS.map((position) => {
      const letter = ANSWER_LETTERS[position];
      const text = answers[position];
      const mark = markFor(snapshot, position);
      const label = `${letter}: ${text}${lockedIn && position === picked ? ", locked in" : MARK_SUFFIX[mark]}`;
      return context.removed.includes(position) ? { letter, text, mark, label, removed: true } : { letter, text, mark, label };
    }),
    announcement: `Question ${rung} for ${prize}. ${question.prompt} ${lettered.join(" ")}`,
    finalAnswer:
      snapshot.matches("confirmingAnswer") && picked !== null
        ? `${ANSWER_LETTERS[picked]}: is that your final answer?`
        : undefined,
    lockedIn: lockedIn ? `${ANSWER_LETTERS[picked]}: ${answers[picked]} is locked in. The answer is coming…` : undefined,
    reveal: revealFor(snapshot),
    walkAway:
      snapshot.can({ type: "walkAway" }) || snapshot.matches("confirmingWalkAway")
        ? { link: `Walk away with ${banked}`, confirm: `Walk away with ${banked}?` }
        : undefined,
    heading: `Question ${rung} of ${LADDER_LENGTH} · for ${prize}`,
    titleLabel: topic.kind === "category" ? question.titleName : undefined,
    ladderRung: snapshot.matches({ revealing: "right" }) ? rung + 1 : rung,
  };
}
