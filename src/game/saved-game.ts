import * as z from "zod";
import { subjectSchema, tierSchema, TITLE_CATEGORIES } from "../content/schema";
import type { SavedGameFormat } from "../storage";
import { LADDER_LENGTH } from "./ladder";
import type { GameContext, SavedGameSnapshot } from "./machine";
import { FRIENDS, LIFELINES, type Topic } from "./types";

/**
 * The Saved game as device storage keeps it: the Game's `SavedGameSnapshot`,
 * checked on every read. Its Questions are full copies, so they're checked
 * only for shape, never against the current authoring rules: an app update
 * that edits or removes a Question can't break a Game in progress.
 */

const position = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);

const titleCategory = z.enum(TITLE_CATEGORIES);

const topicSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("general") }),
  z.object({ kind: z.literal("category"), category: titleCategory }),
  z.object({ kind: z.literal("title"), category: titleCategory, slug: z.string() }),
]) satisfies z.ZodType<Topic>;
// And the other way: a kind of Topic added without a branch here fails to compile.
true satisfies Topic extends z.infer<typeof topicSchema> ? true : false;

const gameQuestionSchema = z.object({
  id: z.string(),
  tier: tierSchema,
  prompt: z.string(),
  correct: z.string(),
  wrong: z.tuple([z.string(), z.string(), z.string()]),
  source: z.string().optional(),
  subject: subjectSchema,
  titleName: z.string().optional(),
});

const shownQuestionSchema = z.object({
  question: gameQuestionSchema,
  answers: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correct: position,
});

const contextSchema = z.object({
  topic: topicSchema,
  questions: z.array(shownQuestionSchema).length(LADDER_LENGTH),
  rung: z.int().min(1).max(LADDER_LENGTH),
  picked: position.nullable(),
  lifelinesUsed: z.array(z.enum(LIFELINES)),
  removed: z.array(position),
  audience: z.object({ votes: z.tuple([z.number(), z.number(), z.number(), z.number()]) }).nullable(),
  friend: z
    .object({
      friend: z.enum(FRIENDS),
      answer: position,
      confidence: z.number(),
      guessing: z.boolean(),
      line: z.string(),
    })
    .nullable(),
  switchedAway: z.array(gameQuestionSchema),
  // A Game is cleared at Game over, so a Saved game never has a result.
  result: z.null(),
}) satisfies z.ZodType<GameContext>;

/** The steps a Game in progress can be saved in. "Final answer?" is saved as choosing. */
const stepSchema = z.union([
  z.enum(["choosing", "pickingFriend", "confirmingWalkAway"]),
  z.object({ revealing: z.enum(["right", "wrong"]) }),
]);

const snapshotSchema = z.object({
  status: z.literal("active"),
  value: stepSchema,
  context: contextSchema,
  historyValue: z.record(z.string(), z.unknown()).optional(),
  children: z.record(z.string(), z.unknown()),
});

export const savedGameFormat: SavedGameFormat<SavedGameSnapshot> = {
  version: 1,
  // The parsed record is the snapshot XState restores from; zod can't express its internal types.
  schema: snapshotSchema as unknown as z.ZodType<SavedGameSnapshot>,
};
