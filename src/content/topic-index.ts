import type { TopicIndex } from "./types";
import generated from "./topic-index.gen.json";

/**
 * Every Topic with its Question count per Tier, for the topic picker. It's
 * generated from the Topic files by `bun run check-content`; never edit the
 * JSON by hand. The test build (`bun run build:fixtures`) swaps in the
 * fixture Topic set's index instead; see `fixture-build.ts`.
 */
export const topicIndex: TopicIndex = generated;
