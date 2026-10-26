import { topicIndex } from "../content/topic-index";
import type { TopicIndex } from "../content/types";
import { topicName } from "../game/topic";
import type { Topic } from "../game/types";
import { formatMoney } from "../ui/money";

/** What the Main menu shows. */
export interface MainMenuView {
  /** "Resume: Friends, question 7", only when a Game is saved. */
  resume?: string;
  /** One line per Topic with a Personal best, like "Friends: $32,000". Empty when none yet. */
  personalBests: string[];
}

/** Every Topic that can have a Personal best, in the order the Main menu lists them. */
function everyTopic(index: TopicIndex): Topic[] {
  const topics: Topic[] = [{ kind: "general" }];
  for (const category of ["tv", "movies"] as const) {
    topics.push({ kind: "category", category });
    for (const title of index[category]) topics.push({ kind: "title", category, slug: title.slug });
  }
  return topics;
}

/**
 * The Main menu for the Saved game (its Topic and the Rung it's at) and the
 * Personal bests: General first, then each Category's Mixed game before its
 * Titles, leaving out Topics with no finished Game.
 */
export function mainMenuView(
  {
    saved,
    personalBest,
  }: { saved: { topic: Topic; rung: number } | undefined; personalBest: (topic: Topic) => number | undefined },
  index: TopicIndex = topicIndex,
): MainMenuView {
  const personalBests = everyTopic(index).flatMap((topic) => {
    const best = personalBest(topic);
    return best === undefined ? [] : [`${topicName(topic, index)}: ${formatMoney(best)}`];
  });
  return {
    resume: saved && `Resume: ${topicName(saved.topic, index)}, question ${saved.rung}`,
    personalBests,
  };
}
