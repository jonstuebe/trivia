import type { Question, Subject, Tier, TitleCategory } from "../content/schema";

/** Shapes shared by the Game machine, Question selection, the simulation, storage and the Share result. */

/**
 * What the player picks to play: General, a whole TV or Movies Category (a
 * Mixed game), or one Title in it.
 */
export type Topic =
  | { kind: "general" }
  | { kind: "category"; category: TitleCategory }
  | { kind: "title"; category: TitleCategory; slug: string };

/** One Question as a Game uses it, whichever Topic file it came from. */
export interface GameQuestion extends Question {
  /** The Friend specialty it counts towards: its own Subject in General, pop culture for TV and Movies. */
  subject: Subject;
  /** The Title's name, for the label above the Question in a Mixed game. Absent in General. */
  titleName?: string;
}

/**
 * The Seen questions on this device: Question ID → a running counter that
 * goes up by one every time a Question is shown. A lower counter is
 * older-seen. IDs no longer in the content are ignored.
 */
export type SeenQuestions = Readonly<Record<string, number>>;

/** One of the four answer positions, A to D. */
export type AnswerPosition = 0 | 1 | 2 | 3;

/** A Question as shown in a Game: its four answers in the order shown, A to D. */
export interface ShownQuestion {
  question: GameQuestion;
  /** The four answer texts in shown order. */
  answers: readonly [string, string, string, string];
  /** Where the correct answer is in `answers`. */
  correct: AnswerPosition;
}

/** The four Lifelines, in ladder order. */
export const LIFELINES = ["fiftyFifty", "askTheAudience", "phoneAFriend", "switchTheQuestion"] as const;
export type Lifeline = (typeof LIFELINES)[number];

/** The four Friends, one per Subject. */
export const FRIENDS = ["history", "science", "sports", "pop culture"] as const satisfies readonly Subject[];
export type Friend = (typeof FRIENDS)[number];

/** The Tier for a Rung (1–15): Rungs 1–3 are Tier 1, up to 13–15 for Tier 5. */
export function tierForRung(rung: number): Tier {
  if (!Number.isInteger(rung) || rung < 1 || rung > 15) throw new RangeError(`No Rung ${rung}`);
  return Math.ceil(rung / 3) as Tier;
}

/** How a Game ended. */
export type GameEnding = "won" | "missed" | "walkedAway";

/** What happened on one question reached, in Ladder order: ✅, ❌ or 🚶 in the Share result. */
export type QuestionOutcome = "right" | "miss" | "walkedAway";

/** A finished Game: what the end screen, the Personal best and the Share result are built from. */
export interface GameResult {
  topic: Topic;
  ending: GameEnding;
  /** What the player leaves with, in dollars. */
  winnings: number;
  /** One entry per question reached: every right answer, then the miss or the Walk away, if any. */
  reached: QuestionOutcome[];
  /** The Lifelines used, in the order used. Empty for "No lifelines". */
  lifelinesUsed: Lifeline[];
}
