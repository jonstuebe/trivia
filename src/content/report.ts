import type { ContentFile, QuestionCounts } from "./check";
import {
  TIERS,
  parseTopicFile,
  subjectSchema,
  type ContentError,
  type Question,
  type Subject,
  type TopicFile,
} from "./schema";

/**
 * The content checks that inform rather than fail (issue #9, "Build checks"):
 * a warning when a right answer gives itself away by its length, and a report
 * of how each Topic's Questions spread across Tiers and, for General, Subjects.
 */

/** Something an author should look at that doesn't fail the check. Same shape as an error. */
export type ContentWarning = ContentError;

/**
 * The right answer is "much longer" than the wrong ones when it is at least
 * this many times as long as the longest wrong answer...
 */
export const LONG_ANSWER_RATIO = 1.5;
/** ...and at least this many characters longer, so short answers like "Rachel" and "Al" don't warn. */
export const LONG_ANSWER_MIN_EXTRA = 5;

/** How one Topic's Questions spread, so authors can see which Tiers still need some. */
export interface TopicSummary {
  /** The Topic file's path, like `tv/friends.json`. */
  file: string;
  /** "General", or the Title's name. */
  name: string;
  tiers: QuestionCounts;
  /** General only: its Questions per Subject, then per Tier. Every Subject is listed. */
  subjects?: Record<Subject, QuestionCounts>;
}

export interface ContentReport {
  /** Empty when nothing needs a look. */
  warnings: ContentWarning[];
  /** General first, then TV and then Movies Titles, each by name. */
  topics: TopicSummary[];
}

/**
 * Warns and reports on every Topic file that passes the schema. A file that
 * fails it is skipped: `checkContent` reports its errors.
 */
export function reportContent(files: readonly ContentFile[]): ContentReport {
  const warnings: ContentWarning[] = [];
  const topics: { order: number; summary: TopicSummary }[] = [];
  for (const { path, data } of files) {
    const result = parseTopicFile(path, data);
    if (!result.ok) continue;
    warnings.push(...longAnswerWarnings(path, result.topic));
    topics.push({ order: CATEGORY_ORDER[result.topic.category], summary: summarize(path, result.topic) });
  }
  topics.sort(
    (a, b) =>
      a.order - b.order ||
      a.summary.name.localeCompare(b.summary.name, "en") ||
      a.summary.file.localeCompare(b.summary.file, "en"),
  );
  return { warnings, topics: topics.map(({ summary }) => summary) };
}

function longAnswerWarnings(file: string, topic: TopicFile): ContentWarning[] {
  const questions: readonly Question[] = topic.questions;
  return questions.flatMap(({ id, correct, wrong }, i) => {
    const longestWrong = Math.max(...wrong.map((answer) => answer.length));
    const givesItAway =
      correct.length >= longestWrong * LONG_ANSWER_RATIO && correct.length - longestWrong >= LONG_ANSWER_MIN_EXTRA;
    if (!givesItAway) return [];
    return [
      {
        file,
        question: `${id} (question ${i + 1})`,
        message: `the right answer (${correct.length} characters) is much longer than the longest wrong one (${longestWrong}), which gives it away`,
      },
    ];
  });
}

const CATEGORY_ORDER = { general: 0, tv: 1, movies: 2 } as const;

function summarize(file: string, topic: TopicFile): TopicSummary {
  const tiers = countByTier(topic.questions);
  if (topic.category !== "general") return { file, name: topic.title, tiers };
  const subjects = Object.fromEntries(
    subjectSchema.options.map((subject) => [subject, countByTier(topic.questions.filter((q) => q.subject === subject))]),
  ) as Record<Subject, QuestionCounts>;
  return { file, name: "General", tiers, subjects };
}

function countByTier(questions: readonly Question[]): QuestionCounts {
  const counts = Object.fromEntries(TIERS.map((tier) => [tier, 0])) as QuestionCounts;
  for (const { tier } of questions) counts[tier]++;
  return counts;
}
