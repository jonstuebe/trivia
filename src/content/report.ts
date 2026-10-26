import { characters } from "./authoring-rules";
import {
  TIERS,
  countByTier,
  formatContentError,
  plural,
  parseTopicFile,
  subjectSchema,
  type ContentError,
  type Question,
  type QuestionCounts,
  type Subject,
  type TopicFile,
} from "./schema";
import type { ContentFile } from "./types";

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

/** The report as text for a person reading the content check's output. */
export function formatReport({ topics, warnings }: ContentReport): string {
  const table = topics.length > 0 ? formatTable(topics) : ["No Topic files to report on."];
  const warningLines =
    warnings.length > 0
      ? [
          ...warnings.map((warning) => `Warning: ${formatContentError(warning)}`),
          `${plural(warnings.length, "warning")}. Warnings don't fail the check.`,
        ]
      : ["No warnings."];
  return [...table, "", ...warningLines].join("\n");
}

function formatTable(topics: readonly TopicSummary[]): string[] {
  const rows: [string, QuestionCounts][] = topics.flatMap((topic) => [
    [topic.name, topic.tiers] as [string, QuestionCounts],
    ...Object.entries(topic.subjects ?? {}).map(([subject, counts]) => [`  ${subject}`, counts] as [string, QuestionCounts]),
  ]);
  const heading = "Questions per Tier";
  const width = Math.max(heading.length, ...rows.map(([label]) => label.length)) + 4;
  const line = (label: string, cells: (string | number)[], total: string | number) =>
    label.padEnd(width) + cells.map((cell) => String(cell).padStart(4)).join("") + String(total).padStart(7);
  return [
    line(
      heading,
      TIERS.map((tier) => `T${tier}`),
      "Total",
    ),
    ...rows.map(([label, counts]) =>
      line(
        label,
        TIERS.map((tier) => counts[tier]),
        TIERS.reduce((sum, tier) => sum + counts[tier], 0),
      ),
    ),
  ];
}

function longAnswerWarnings(file: string, topic: TopicFile): ContentWarning[] {
  const questions: readonly Question[] = topic.questions;
  return questions.flatMap(({ id, correct, wrong }, i) => {
    const length = characters(correct);
    const longestWrong = Math.max(...wrong.map(characters));
    const givesItAway = length >= longestWrong * LONG_ANSWER_RATIO && length - longestWrong >= LONG_ANSWER_MIN_EXTRA;
    if (!givesItAway) return [];
    return [
      {
        file,
        question: { id, position: i + 1 },
        message: `the right answer (${length} characters) is much longer than the longest wrong one (${longestWrong}), which gives it away`,
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
