import { checkAuthoringRules, type CheckedTopic } from "./authoring-rules";
import { TIERS, describeQuestion, parseTopicFile, type ContentError, type Question, type Tier, type TopicFile } from "./schema";

/** A Topic file as read from disk: its path inside the content folder and its parsed JSON. */
export interface ContentFile {
  /** Like `tv/friends.json`, with `/` separators. */
  path: string;
  data: unknown;
}

/** How many Questions a Topic has in each Tier. */
export type QuestionCounts = Record<Tier, number>;

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

export interface ContentCheckResult {
  /** Built from the files that passed; a file with errors is left out. */
  index: TopicIndex;
  /** Empty when every file passed. */
  errors: ContentError[];
}

/**
 * Checks every Topic file against the schema and against each other (Question
 * IDs are unique across all files) and the authoring rules, and builds the topic index from them.
 */
export function checkContent(files: readonly ContentFile[]): ContentCheckResult {
  const errors: ContentError[] = [];
  const topics: TopicFile[] = [];
  const checked: CheckedTopic[] = [];
  const firstUse = new Map<string, string>();

  for (const { path, data } of files) {
    const result = parseTopicFile(path, data);
    if (!result.ok) {
      errors.push(...result.errors);
      continue;
    }
    result.topic.questions.forEach(({ id }, i) => {
      const position = i + 1;
      const where = `${path}, ${describeQuestion({ position })}`;
      const earlier = firstUse.get(id);
      if (earlier) {
        errors.push({ file: path, question: { id, position }, message: `ID ${id} is already used in ${earlier}` });
      } else {
        firstUse.set(id, where);
      }
    });
    topics.push(result.topic);
    checked.push({ path, topic: result.topic });
  }
  errors.push(...checkAuthoringRules(checked));

  return { index: buildIndex(topics), errors };
}

function buildIndex(topics: readonly TopicFile[]): TopicIndex {
  const index: TopicIndex = { general: null, tv: [], movies: [] };
  for (const topic of topics) {
    const questionCounts = countByTier(topic.questions);
    if (topic.category === "general") {
      index.general = { questionCounts };
    } else {
      index[topic.category].push({ name: topic.title, slug: topic.slug, questionCounts });
    }
  }
  const byName = (a: TitleEntry, b: TitleEntry) => a.name.localeCompare(b.name, "en") || a.slug.localeCompare(b.slug, "en");
  index.tv.sort(byName);
  index.movies.sort(byName);
  return index;
}

function countByTier(questions: readonly Question[]): QuestionCounts {
  const counts = Object.fromEntries(TIERS.map((tier) => [tier, 0])) as QuestionCounts;
  for (const { tier } of questions) counts[tier]++;
  return counts;
}
