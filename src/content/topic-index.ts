import type { TopicIndex } from "./check";
import generated from "./topic-index.gen.json";

/**
 * Every Topic with its Question count per Tier, for the topic picker. It's
 * generated from the Topic files by `bun run check-content`; never edit the
 * JSON by hand.
 */
export const topicIndex: TopicIndex = generated;
