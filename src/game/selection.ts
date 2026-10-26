import { TIERS, type Tier } from "../content/schema";
import { type Random, shuffle } from "../random/random";
import type { GameQuestion, SeenQuestions } from "./types";

/** How many Questions a Game asks from each Tier. */
export const QUESTIONS_PER_TIER = 3;

/**
 * Draws a Game's 15 Questions from a Topic's loaded Questions, in Rung order:
 * 3 from each Tier, Tier 1 first. Throws if a Tier has fewer than 3.
 */
export function drawGame(questions: readonly GameQuestion[], seen: SeenQuestions, random: Random): GameQuestion[] {
  return TIERS.flatMap((tier) => {
    const inTier = questions.filter((q) => q.tier === tier);
    if (inTier.length < QUESTIONS_PER_TIER) throw new RangeError(notEnough(tier, inTier.length));
    return drawOrder(inTier, seen, random).slice(0, QUESTIONS_PER_TIER);
  });
}

/** The order to draw from: unseen Questions first, at random, then repeats oldest-seen first. */
function drawOrder(candidates: readonly GameQuestion[], seen: SeenQuestions, random: Random): GameQuestion[] {
  const unseen = candidates.filter((q) => seen[q.id] === undefined);
  const repeats = candidates
    .filter((q) => seen[q.id] !== undefined)
    .sort((a, b) => seen[a.id]! - seen[b.id]!);
  return [...shuffle(unseen, random), ...repeats];
}

function notEnough(tier: Tier, count: number): string {
  return `Tier ${tier} has ${count} Questions, a Game needs ${QUESTIONS_PER_TIER}`;
}
