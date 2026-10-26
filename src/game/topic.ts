import { TIERS, type QuestionCounts, type TitleCategory } from "../content/schema";
import { topicIndex } from "../content/topic-index";
import type { TitleEntry, TopicIndex } from "../content/types";
import { QUESTIONS_PER_TIER } from "./selection";
import type { Topic } from "./types";

/** A Title is listed in the Topic picker once it has this many Questions ("about 20"). */
export const LISTED_TITLE_QUESTIONS = 20;

/** Whether the counts can fill one Game: 3 in every Tier. */
function fillsAGame(counts: QuestionCounts): boolean {
  return TIERS.every((tier) => counts[tier] >= QUESTIONS_PER_TIER);
}

/**
 * The Titles the Topic picker lists in a Category, in the index's order: each
 * with 20 or more Questions and enough in every Tier to fill a Game. Only these
 * can be played on their own.
 */
export function listedTitles(category: TitleCategory, index: TopicIndex = topicIndex): TitleEntry[] {
  return index[category].filter((title) => {
    const total = TIERS.reduce((sum, tier) => sum + title.questionCounts[tier], 0);
    return total >= LISTED_TITLE_QUESTIONS && fillsAGame(title.questionCounts);
  });
}

/** Whether the Topic picker offers "All … (mixed)": the Category has 2 or more listed Titles. */
export function offersMixedGame(category: TitleCategory, index: TopicIndex = topicIndex): boolean {
  return listedTitles(category, index).length >= 2;
}

function isCategory(segment: string | undefined): segment is TitleCategory {
  return segment === "tv" || segment === "movies";
}

/**
 * The Topic at a URL path (`/general`, `/tv`, `/movies/<slug>`, the reverse of
 * `topicPath`), or undefined when the path isn't a Topic the picker offers: an
 * unknown or unlisted Title, a Mixed game the Category doesn't offer, or a
 * General with no Questions to fill a Game.
 */
export function topicFromPath(path: string, index: TopicIndex = topicIndex): Topic | undefined {
  const [first, slug, ...rest] = path.replace(/^\//, "").split("/");
  if (rest.length > 0) return undefined;
  if (first === "general" && slug === undefined) {
    return index.general && fillsAGame(index.general.questionCounts) ? { kind: "general" } : undefined;
  }
  if (!isCategory(first)) return undefined;
  if (slug === undefined) return offersMixedGame(first, index) ? { kind: "category", category: first } : undefined;
  return listedTitles(first, index).some((title) => title.slug === slug)
    ? { kind: "title", category: first, slug }
    : undefined;
}

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
