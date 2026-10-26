import type { GameEvent } from "../game/machine";

/**
 * One Game keyboard shortcut. The table below is the one place shortcuts are
 * listed: `gameKeyEvent` reads it, and the `?` key list can show it. Add a
 * row to add a key.
 */
export interface GameKey {
  /** `KeyboardEvent.key` values; letters match in either case. */
  keys: readonly string[];
  event: GameEvent;
  /** What the key does, for the list of keys. */
  description: string;
}

export const GAME_KEYS: readonly GameKey[] = [
  { keys: ["a", "1"], event: { type: "pick", answer: 0 }, description: "Pick answer A" },
  { keys: ["b", "2"], event: { type: "pick", answer: 1 }, description: "Pick answer B" },
  { keys: ["c", "3"], event: { type: "pick", answer: 2 }, description: "Pick answer C" },
  { keys: ["d", "4"], event: { type: "pick", answer: 3 }, description: "Pick answer D" },
  { keys: ["Enter"], event: { type: "finalAnswer" }, description: "Final answer" },
  { keys: ["Escape"], event: { type: "cancel" }, description: "Cancel" },
  { keys: ["w"], event: { type: "walkAway" }, description: "Walk away (still asks to confirm)" },
  { keys: ["f"], event: { type: "fiftyFifty" }, description: "50:50" },
  { keys: ["q"], event: { type: "askTheAudience" }, description: "Ask the Audience" },
  { keys: ["p"], event: { type: "phoneAFriend" }, description: "Phone a Friend" },
  { keys: ["s"], event: { type: "switchTheQuestion" }, description: "Switch the Question" },
];

/** The key that shows the list of keys. It isn't a Game move, so it has its own listener. */
export const SHOW_KEYS_KEY = "?";

/** One row of the list of keys: "A or 1" · "Pick answer A". */
export interface KeyListRow {
  keys: string;
  description: string;
}

const KEY_NAMES: Record<string, string> = { Escape: "Esc" };

/** Every Game key as it's pressed, then `?` itself, for the list of keys. */
export function keyList(keys: readonly GameKey[] = GAME_KEYS): KeyListRow[] {
  return [
    ...keys.map((shortcut) => ({
      keys: shortcut.keys.map((key) => KEY_NAMES[key] ?? (key.length === 1 ? key.toUpperCase() : key)).join(" or "),
      description: shortcut.description,
    })),
    { keys: SHOW_KEYS_KEY, description: "Show the keys" },
  ];
}

/** The parts of a `KeyboardEvent` that pick a shortcut. */
export interface KeyPress {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

/**
 * The Game move a key press asks for, or undefined to leave it to the
 * browser. Ctrl, Cmd and Alt combinations are always the browser's. Whether
 * the move fits the Game's current step is for `snapshot.can` to say.
 */
export function gameKeyEvent(press: KeyPress, keys: readonly GameKey[] = GAME_KEYS): GameEvent | undefined {
  if (press.ctrlKey || press.metaKey || press.altKey) return undefined;
  const key = press.key.length === 1 ? press.key.toLowerCase() : press.key;
  return keys.find((shortcut) => shortcut.keys.includes(key))?.event;
}
