import type { Tier } from "../content/schema";
import type { Random } from "../random/random";
import type { AnswerPosition, Friend, ShownQuestion } from "./types";

/**
 * The simulated Ask the Audience vote and Phone a Friend line. Each takes the
 * shown Question and a random source and returns plain data, so the Game can
 * save the result and a refresh or Resume shows it again without rerolling.
 */

const ALL_POSITIONS: readonly AnswerPosition[] = [0, 1, 2, 3];

export interface SimulationInput {
  shown: ShownQuestion;
  /** The answers still in play: all four, or the two a 50:50 left. Defaults to all four. */
  remaining?: readonly AnswerPosition[];
  random: Random;
}

/** The audience's vote: a whole-number percentage per answer, A to D, adding up to 100. Answers a 50:50 removed get 0. */
export interface AudienceResult {
  votes: readonly [number, number, number, number];
}

export function askTheAudience({ shown, remaining = ALL_POSITIONS, random }: SimulationInput): AudienceResult {
  const positions = checkRemaining(shown, remaining);
  const leader =
    random.next() < RIGHT_ODDS[shown.question.tier]
      ? shown.correct
      : pickOne(positions.filter((position) => position !== shown.correct), random);

  // The lead's share above an even split shrinks with the Tier; a little jitter keeps votes from looking canned.
  const even = 100 / positions.length;
  const lead = even + (100 - even) * AUDIENCE_LEAD[shown.question.tier] + (random.next() * 2 - 1) * LEAD_JITTER;
  const others = positions.filter((position) => position !== leader);
  // The rest is spread unevenly, but never so unevenly that another answer catches the lead.
  const weights = others.map(() => 1 + random.next() / 2);
  const weightTotal = weights.reduce((a, b) => a + b, 0);
  const shares = positions.map((position) =>
    position === leader ? lead : ((100 - lead) * weights[others.indexOf(position)]!) / weightTotal,
  );
  return { votes: toVotes(positions, shares) };
}

export interface FriendInput extends SimulationInput {
  /** The Friend the player chose to call. */
  friend: Friend;
}

/** What the Friend said on the call. */
export interface FriendResult {
  friend: Friend;
  /** The answer they named. */
  answer: AnswerPosition;
  /** How sure they said they were, as a whole percentage. */
  confidence: number;
  /** Whether they admitted they're guessing, which only happens on Tier 5. */
  guessing: boolean;
  /** What they said, e.g. "I'm pretty sure it's B, maybe 80%." */
  line: string;
}

export function phoneAFriend({ shown, remaining = ALL_POSITIONS, friend, random }: FriendInput): FriendResult {
  const positions = checkRemaining(shown, remaining);
  const { tier, subject } = shown.question;
  // On their own Subject a Friend is 15 points likelier to be right, never above 95%; off it, 10 points less.
  const odds = friend === subject ? Math.min(RIGHT_ODDS[tier] + 0.15, 0.95) : RIGHT_ODDS[tier] - 0.1;
  const right = random.next() < odds;
  const answer = right ? shown.correct : pickOne(positions.filter((position) => position !== shown.correct), random);

  // On Tier 5 they sometimes own up to guessing, more often when they're wrong.
  const guessing = tier === 5 && random.next() < (right ? 0.15 : 0.45);
  const confidence = guessing
    ? roundToFive(20 + random.next() * 15)
    : // Surer when right, but the spread is wide enough that they're sometimes confidently wrong.
      Math.min(95, Math.max(10, roundToFive(FRIEND_CONFIDENCE[tier] - (right ? 0 : 10) + (random.next() * 2 - 1) * 15)));
  return { friend, answer, confidence, guessing, line: friendLine(answer, confidence, guessing) };
}

/** A Friend's usual confidence when right, by Tier. */
const FRIEND_CONFIDENCE: Record<Tier, number> = { 1: 90, 2: 80, 3: 70, 4: 60, 5: 50 };

function roundToFive(value: number): number {
  return Math.round(value / 5) * 5;
}

function friendLine(answer: AnswerPosition, confidence: number, guessing: boolean): string {
  const letter = "ABCD"[answer];
  if (guessing) return `Honestly, I'm just guessing here. Maybe ${letter}? Call it ${confidence}%.`;
  if (confidence >= 80) return `I'm pretty sure it's ${letter}, maybe ${confidence}%.`;
  if (confidence >= 60) return `I think it's ${letter}. I'd say ${confidence}%.`;
  return `I'm not certain, but I'd go with ${letter}, about ${confidence}%.`;
}

/** How often the audience or a Friend (before their Subject bonus) points at the right answer, by Tier. */
export const RIGHT_ODDS: Record<Tier, number> = { 1: 0.95, 2: 0.85, 3: 0.7, 4: 0.55, 5: 0.4 };

/**
 * How far the audience's lead is from an even split towards everyone, by Tier:
 * with four answers, about 75% on Tier 1 down to about 40% on Tier 5.
 */
const AUDIENCE_LEAD: Record<Tier, number> = { 1: 50 / 75, 2: 41.25 / 75, 3: 32.5 / 75, 4: 23.75 / 75, 5: 15 / 75 };
/** The most the lead moves either way from its Tier's usual share, in points. */
const LEAD_JITTER = 3;

function pickOne<T>(items: readonly T[], random: Random): T {
  return items[Math.floor(random.next() * items.length)]!;
}

function checkRemaining(shown: ShownQuestion, remaining: readonly AnswerPosition[]): AnswerPosition[] {
  const positions = [...new Set(remaining)].sort();
  if (positions.length !== remaining.length || positions.length < 2 || !positions.includes(shown.correct)) {
    throw new RangeError(`The answers left must be distinct, at least two, and include the right one`);
  }
  return positions;
}

/** Rounds shares to whole percentages that add up to exactly 100, giving leftover points to the largest remainders. */
function toVotes(positions: readonly AnswerPosition[], shares: readonly number[]): AudienceResult["votes"] {
  const total = shares.reduce((a, b) => a + b, 0);
  const exact = shares.map((share) => (share / total) * 100);
  const rounded = exact.map(Math.floor);
  let leftover = 100 - rounded.reduce((a, b) => a + b, 0);
  const byRemainder = exact.map((value, i) => ({ i, remainder: value - rounded[i]! }));
  byRemainder.sort((a, b) => b.remainder - a.remainder);
  for (const { i } of byRemainder) {
    if (leftover-- <= 0) break;
    rounded[i]!++;
  }
  const votes: [number, number, number, number] = [0, 0, 0, 0];
  positions.forEach((position, i) => (votes[position] = rounded[i]!));
  return votes;
}
