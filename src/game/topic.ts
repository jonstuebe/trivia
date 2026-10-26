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
