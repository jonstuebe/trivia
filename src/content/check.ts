import { checkAuthoringRules } from "./authoring-rules";
import { reportContent, type ContentReport } from "./report";
import { countByTier, describeQuestion, parseTopicFile, type ContentError, type TopicFile } from "./schema";
import type { CheckedTopic, ContentFile, TitleEntry, TopicIndex } from "./types";

export interface ContentCheckResult {
  /** Built from the files that passed; a file with errors is left out. */
  index: TopicIndex;
  /** Empty when every file passed. */
  errors: ContentError[];
  /** Warnings and Question counts for the files that passed the schema. */
  report: ContentReport;
}

/**
 * Checks every Topic file against the schema and against each other (Question
 * IDs are unique across all files) and the authoring rules, and builds the
 * topic index and the report from them. Each file is parsed once.
 */
export function checkContent(files: readonly ContentFile[]): ContentCheckResult {
  const errors: ContentError[] = [];
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
    checked.push({ path, topic: result.topic });
  }
  errors.push(...checkAuthoringRules(checked));

  return { index: buildIndex(checked.map(({ topic }) => topic)), errors, report: reportContent(checked) };
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
