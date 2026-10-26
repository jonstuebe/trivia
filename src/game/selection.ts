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

/**
 * Switch the Question: draws a replacement from `tier`, never one already in
 * this Game. `inGame` is every Question the Game has drawn, including any
 * switched away from. Unseen first, at random, then oldest-seen. Undefined
 * when the Tier has nothing left.
 */
export function drawSwitch(
  questions: readonly GameQuestion[],
  tier: Tier,
  inGame: readonly GameQuestion[],
  seen: SeenQuestions,
  random: Random,
): GameQuestion | undefined {
  const used = new Set(inGame.map((q) => q.id));
  const candidates = questions.filter((q) => q.tier === tier && !used.has(q.id));
  return drawOrder(candidates, seen, random)[0];
}

/** The order to draw from: unseen Questions first, at random, then repeats oldest-seen first. */
function drawOrder(candidates: readonly GameQuestion[], seen: SeenQuestions, random: Random): GameQuestion[] {
  const unseen = candidates.filter((q) => seen[q.id] === undefined);
  const repeats = candidates
    .filter((q) => seen[q.id] !== undefined)
    .sort((a, b) => seen[a.id]! - seen[b.id]!);
  return [...shuffle(unseen, random), ...repeats];
}

/**
 * The run-out check: whether a Topic can fill a whole Game with unseen
 * Questions, 3 in every Tier. When it can't, the player is told and offered a
 * reset; repeats are still allowed. Seen IDs not in `questions` are ignored.
 */
export function canFillGame(questions: readonly GameQuestion[], seen: SeenQuestions): boolean {
  return TIERS.every(
    (tier) => questions.filter((q) => q.tier === tier && seen[q.id] === undefined).length >= QUESTIONS_PER_TIER,
  );
}

function notEnough(tier: Tier, count: number): string {
  return `Tier ${tier} has ${count} Questions, a Game needs ${QUESTIONS_PER_TIER}`;
}
