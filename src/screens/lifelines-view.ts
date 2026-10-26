import { FIRST_SWITCH_RUNG, type GameEvent } from "../game/machine";
import { ANSWER_POSITIONS, FRIENDS, LIFELINES, type Friend, type Lifeline } from "../game/types";
import { keyFor } from "./game-keys";
import { ANSWER_LETTERS, type GameSnapshot } from "./game-view";

/**
 * How an oval looks: `ready` to use (or waiting while a dialog is up),
 * `used` (struck through), or `locked` (Switch, dashed, through question 10
 * or with no Question left to switch to).
 */
export type LifelineState = "ready" | "used" | "locked";

export interface LifelineOval {
  lifeline: Lifeline;
  /** Its accessible name: "Ask the Audience". */
  name: string;
  /** What the oval shows: "50:50" or an emoji. */
  label: string;
  state: LifelineState;
  /** The state in words, for its accessible name: "used", "locked until question 11". */
  status?: string;
  /** Its key, as the list of keys shows it (from `GAME_KEYS`). */
  key: string | undefined;
  event: GameEvent;
  /** Whether pressing it does anything now. */
  enabled: boolean;
}

export interface AudienceBar {
  letter: string;
  percent: number;
  /** "B: 62%". */
  label: string;
}

export interface LifelinesView {
  ovals: LifelineOval[];
  /** "50:50 took away B and D.", once used on this Question. */
  fiftyFifty: string | undefined;
  /** The audience's vote on the answers left, as bars and in words. */
  audience: { bars: AudienceBar[]; text: string } | undefined;
  /** The Pick a friend dialog, while it's open. */
  pickFriend: { title: string; friends: { friend: Friend; name: string }[] } | undefined;
  /** The Friend's line: "Sports fan: “I'm pretty sure it's B, maybe 80%.”" */
  friend: string | undefined;
}

/** The Friends as the player knows them (GLOSSARY: Friend). */
export const FRIEND_NAMES: Record<Friend, string> = {
  history: "History buff",
  science: "Science buff",
  sports: "Sports fan",
  "pop culture": "Pop-culture fan",
};

const OVALS: Record<Lifeline, { name: string; label: string }> = {
  fiftyFifty: { name: "50:50", label: "50:50" },
  askTheAudience: { name: "Ask the Audience", label: "👥" },
  phoneAFriend: { name: "Phone a Friend", label: "📞" },
  switchTheQuestion: { name: "Switch the Question", label: "🔄" },
};

function stateOf(snapshot: GameSnapshot, lifeline: Lifeline): Pick<LifelineOval, "state" | "status"> {
  const { lifelinesUsed, rung } = snapshot.context;
  if (lifelinesUsed.includes(lifeline)) return { state: "used", status: "used" };
  if (lifeline !== "switchTheQuestion") return { state: "ready" };
  if (rung < FIRST_SWITCH_RUNG) return { state: "locked", status: `locked until question ${FIRST_SWITCH_RUNG}` };
  // Past question 10, Switch is locked only when the Tier has nothing left (the step aside).
  if (snapshot.matches("choosing") && !snapshot.can({ type: "switchTheQuestion" })) {
    return { state: "locked", status: "no questions left to switch to" };
  }
  return { state: "ready" };
}

function audienceFor(snapshot: GameSnapshot): LifelinesView["audience"] {
  const { audience, removed } = snapshot.context;
  if (!audience) return undefined;
  const bars = ANSWER_POSITIONS.filter((position) => !removed.includes(position)).map((position) => {
    const letter = ANSWER_LETTERS[position];
    const percent = audience.votes[position];
    return { letter, percent, label: `${letter}: ${percent}%` };
  });
  return { bars, text: `The audience voted ${bars.map((bar) => bar.label).join(", ")}.` };
}

/** The Lifeline ovals and their results, for a Game's snapshot. */
export function lifelinesView(snapshot: GameSnapshot): LifelinesView {
  const { context } = snapshot;
  const gone = context.removed.map((position) => ANSWER_LETTERS[position]);
  return {
    ovals: LIFELINES.map((lifeline) => {
      const event: GameEvent = { type: lifeline };
      return {
        lifeline,
        ...OVALS[lifeline],
        ...stateOf(snapshot, lifeline),
        key: keyFor(lifeline),
        event,
        enabled: snapshot.can(event),
      };
    }),
    fiftyFifty: gone.length === 2 ? `50:50 took away ${gone[0]} and ${gone[1]}.` : undefined,
    audience: audienceFor(snapshot),
    pickFriend: snapshot.matches("pickingFriend")
      ? {
          title: "Who do you call?",
          friends: FRIENDS.map((friend) => ({ friend, name: FRIEND_NAMES[friend] })),
        }
      : undefined,
    friend: context.friend ? `${FRIEND_NAMES[context.friend.friend]}: “${context.friend.line}”` : undefined,
  };
}
