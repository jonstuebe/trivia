import { formatContentError, parseTopicFile } from "../content/schema";
import { topicFiles } from "../content/topic-files";
import { topicKey } from "./topic";
import type { GameQuestion, Topic } from "./types";

/**
 * Loads the Questions a Topic plays from: `general.json` for General, one
 * Title's file, or every Title file in a Category for a Mixed game. Only those
 * files are fetched. Each TV or Movies Question keeps its Title's name for the
 * label and counts as pop culture. Throws if the Topic has no file.
 */
export async function loadTopic(topic: Topic): Promise<GameQuestion[]> {
  const loaded = await Promise.all(pathsFor(topic).map(loadFile));
  return loaded.flat();
}

function pathsFor(topic: Topic): string[] {
  if (topic.kind !== "category") return [`${topicKey(topic)}.json`];
  return Object.keys(topicFiles)
    .filter((path) => path.startsWith(`${topicKey(topic)}/`))
    .sort();
}

async function loadFile(path: string): Promise<GameQuestion[]> {
  const load = topicFiles[path];
  if (!load) throw new Error(`No Topic file ${path}`);
  const result = parseTopicFile(path, await load());
  if (!result.ok) throw new Error(result.errors.map(formatContentError).join("\n"));
  const { topic } = result;
  if (topic.category === "general") return topic.questions;
  return topic.questions.map((question) => ({ ...question, subject: "pop culture", titleName: topic.title }));
}
