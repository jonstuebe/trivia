import { LIFELINES, type GameResult, type Lifeline, type QuestionOutcome, type Topic } from "./types";

/** The Share result: the copyable text summary of a finished Game. */

const SITE = "trivia.jonstuebe.com";

const OUTCOME_EMOJI: Record<QuestionOutcome, string> = { right: "✅", miss: "❌", walkedAway: "🚶" };

const LIFELINE_EMOJI: Record<Lifeline, string> = {
  fiftyFifty: "✂️",
  askTheAudience: "👥",
  phoneAFriend: "📞",
  switchTheQuestion: "🔄",
};

/** Questions per group on the outcome line, so each break falls on a Safe level. */
const GROUP = 5;

/** The Topic's own path: `/general`, `/tv`, `/movies`, `/tv/<slug>` or `/movies/<slug>`. */
export function topicPath(topic: Topic): string {
  switch (topic.kind) {
    case "general":
      return "/general";
    case "category":
      return `/${topic.category}`;
    case "title":
      return `/${topic.category}/${topic.slug}`;
  }
}

/**
 * The five-line Share result for a finished Game. `topicName` is the Topic as
 * shown to the player (like "Movies" or "Friends"), since a Title's name comes
 * from the content, not the Game.
 */
export function shareResult(result: GameResult, topicName: string): string {
  const winnings = `$${result.winnings.toLocaleString("en-US")}${result.ending === "won" ? " 🏆" : ""}`;

  const groups: string[] = [];
  for (let i = 0; i < result.reached.length; i += GROUP) {
    groups.push(
      result.reached
        .slice(i, i + GROUP)
        .map((outcome) => OUTCOME_EMOJI[outcome])
        .join(""),
    );
  }

  const used = LIFELINES.filter((lifeline) => result.lifelinesUsed.includes(lifeline));
  const lifelines = used.length === 0 ? "No lifelines" : used.map((lifeline) => LIFELINE_EMOJI[lifeline]).join(" ");

  return [`Trivia · ${topicName}`, winnings, groups.join(" "), lifelines, `${SITE}${topicPath(result.topic)}`].join(
    "\n",
  );
}
