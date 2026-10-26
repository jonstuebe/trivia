import * as z from "zod";

/**
 * The format every Topic file follows (issue #3). There is one JSON file per
 * Title in a folder per Category, plus `general.json` for General:
 *
 *   content/general.json
 *   content/tv/<title-slug>.json
 *   content/movies/<title-slug>.json
 *
 * The path says which Category a file belongs to and, for a Title, its slug,
 * so the file itself carries only the Topic's details and its Questions.
 */

const text = z.string().trim().min(1, "must not be empty");

/** One of five difficulty grades, each matching three Rungs of the Ladder. */
export const tierSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)], {
  error: "must be 1, 2, 3, 4 or 5",
});
export type Tier = z.infer<typeof tierSchema>;
export const TIERS: readonly Tier[] = [1, 2, 3, 4, 5];

/** The area of general knowledge a General Question belongs to, matching a Friend. */
export const subjectSchema = z.enum(["history", "science", "sports", "pop culture"]);
export type Subject = z.infer<typeof subjectSchema>;

/** A Question ID: a short random ID, written into the file once and never changed. */
export const questionIdSchema = z.string().regex(/^[a-z0-9]{8}$/, "must be 8 lowercase letters or digits");

/** A TV or Movies Question. Every one counts as pop culture, so it has no Subject. */
export const questionSchema = z.strictObject({
  id: questionIdSchema,
  tier: tierSchema,
  prompt: text,
  correct: text,
  wrong: z.tuple([text, text, text], { error: "must be exactly three wrong answers" }),
  /** A fact-checking note that players never see. */
  source: text.optional(),
});
export type Question = z.infer<typeof questionSchema>;

/** A General Question also names its Subject, which picks the Phone a Friend specialist. */
export const generalQuestionSchema = questionSchema.extend({ subject: subjectSchema });
export type GeneralQuestion = z.infer<typeof generalQuestionSchema>;

/** `content/general.json`. */
export const generalFileSchema = z.strictObject({
  questions: z.array(generalQuestionSchema),
});
export type GeneralFile = z.infer<typeof generalFileSchema>;

/** `content/tv/<slug>.json` or `content/movies/<slug>.json`. */
export const titleFileSchema = z.strictObject({
  /** The Title's display name. */
  title: text,
  questions: z.array(questionSchema),
});
export type TitleFile = z.infer<typeof titleFileSchema>;

export type TitleCategory = "tv" | "movies";

/** A checked Topic file, with what its path says about it. */
export type TopicFile =
  | ({ category: "general" } & GeneralFile)
  | ({ category: TitleCategory; slug: string } & TitleFile);

/** One thing wrong with a Topic file. */
export interface ContentError {
  /** The file's path inside the content folder, like `tv/friends.json`. */
  file: string;
  /** The Question at fault, when the error is about one. */
  question?: QuestionRef;
  message: string;
}

/** Which Question in a Topic file: its position, counting from 1, and its ID when it has a usable one. */
export interface QuestionRef {
  id?: string;
  position: number;
}

export type ParseResult = { ok: true; topic: TopicFile } | { ok: false; errors: ContentError[] };

const titlePath = /^(tv|movies)\/([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/;

/**
 * Checks one Topic file against the schema. `path` is the file's path inside
 * the content folder, with `/` separators, like `tv/friends.json`.
 */
export function parseTopicFile(path: string, data: unknown): ParseResult {
  if (path === "general.json") {
    const result = generalFileSchema.safeParse(data);
    if (!result.success) return { ok: false, errors: toContentErrors(path, data, result.error) };
    return { ok: true, topic: { category: "general", ...result.data } };
  }

  const match = titlePath.exec(path);
  if (!match) {
    return {
      ok: false,
      errors: [
        {
          file: path,
          message:
            "not a Topic file path: expected general.json, tv/<slug>.json or movies/<slug>.json, with a lowercase, hyphenated slug",
        },
      ],
    };
  }
  const [, category, slug] = match as unknown as [string, TitleCategory, string];
  const result = titleFileSchema.safeParse(data);
  if (!result.success) return { ok: false, errors: toContentErrors(path, data, result.error) };
  return { ok: true, topic: { category, slug, ...result.data } };
}

function toContentErrors(file: string, data: unknown, error: z.ZodError): ContentError[] {
  return error.issues.map((issue) => {
    const [first, index, ...rest] = issue.path;
    if (first === "questions" && typeof index === "number") {
      const field = rest.length > 0 ? `${rest.join(".")}: ` : "";
      return { file, question: questionAt(data, index), message: `${field}${issue.message}` };
    }
    const field = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return { file, message: `${field}${issue.message}` };
  });
}

/** The Question at `index` in the raw file data, with its ID if it has a usable one. */
function questionAt(data: unknown, index: number): QuestionRef {
  const questions = (data as { questions?: unknown } | null)?.questions;
  const id = Array.isArray(questions) ? (questions[index] as { id?: unknown } | null)?.id : undefined;
  const position = index + 1;
  return typeof id === "string" && id.length > 0 ? { id, position } : { position };
}

/** Names a Question for a person: by its ID and position, like `k3p9x2qa (question 4)`, or by position alone. */
export function describeQuestion({ id, position }: QuestionRef): string {
  return id === undefined ? `question ${position}` : `${id} (question ${position})`;
}

/** One line for a person reading the check's output. */
export function formatContentError({ file, question, message }: ContentError): string {
  return question ? `${file}, ${describeQuestion(question)}: ${message}` : `${file}: ${message}`;
}
