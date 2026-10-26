import type { QuestionCounts } from "./schema";

/** Shapes shared by the content check, the report, the ID tool and the app's topic index. */

/** A Topic file as read from disk: its path inside the content folder and its parsed JSON. */
export interface ContentFile {
  /** Like `tv/friends.json`, with `/` separators. */
  path: string;
  data: unknown;
}

/** One Title in the topic index. */
export interface TitleEntry {
  name: string;
  slug: string;
  questionCounts: QuestionCounts;
}

/**
 * What the topic picker reads to list Topics, without loading every Topic
 * file. It's generated from the files by the content check, never by hand.
 */
export interface TopicIndex {
  /** Null when there's no `general.json`. */
  general: { questionCounts: QuestionCounts } | null;
  /** Sorted by name. */
  tv: TitleEntry[];
  /** Sorted by name. */
  movies: TitleEntry[];
}
