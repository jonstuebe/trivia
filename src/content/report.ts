import type { ContentFile } from "./check";
import { parseTopicFile, type ContentError, type Question, type TopicFile } from "./schema";

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
/** ...and at least this many characters longer, so short answers like "Ross" and "Al" don't warn. */
export const LONG_ANSWER_MIN_EXTRA = 5;

export interface ContentReport {
  /** Empty when nothing needs a look. */
  warnings: ContentWarning[];
}

/**
 * Warns and reports on every Topic file that passes the schema. A file that
 * fails it is skipped: `checkContent` reports its errors.
 */
export function reportContent(files: readonly ContentFile[]): ContentReport {
  const warnings: ContentWarning[] = [];
  for (const { path, data } of files) {
    const result = parseTopicFile(path, data);
    if (!result.ok) continue;
    warnings.push(...longAnswerWarnings(path, result.topic));
  }
  return { warnings };
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
