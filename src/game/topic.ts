import type { TitleCategory } from "../content/schema";
import { topicIndex } from "../content/topic-index";
import type { TopicIndex } from "../content/types";
import type { Topic } from "./types";

/**
 * A Topic as one string: `general`, the Category (`tv`, `movies`), or
 * `<category>/<slug>` for a Title. It's the Personal best key, the Topic's
 * URL path without its leading `/`, and its Topic file's path without `.json`.
 */
export function topicKey(topic: Topic): string {
  switch (topic.kind) {
    case "general":
      return "general";
    case "category":
      return topic.category;
    case "title":
      return `${topic.category}/${topic.slug}`;
  }
}

const CATEGORY_NAMES: Record<TitleCategory, string> = { tv: "TV Shows", movies: "Movies" };

/**
 * The Topic as shown to the player, as in the Share result's first line:
 * "General", "TV Shows", "Movies", or the Title's name from the topic index
 * (the app's own unless `index` is given). A Title the index no longer lists,
 * as in a Game resumed after an update removed it, falls back to its slug.
 */
export function topicName(topic: Topic, index: TopicIndex = topicIndex): string {
  switch (topic.kind) {
    case "general":
      return "General";
    case "category":
      return CATEGORY_NAMES[topic.category];
    case "title":
      return index[topic.category].find((title) => title.slug === topic.slug)?.name ?? topic.slug;
  }
}
