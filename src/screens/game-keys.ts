import type { GameEvent } from "../game/machine";

/**
 * One Game keyboard shortcut. The table below is the one place shortcuts are
 * listed: `gameKeyEvent` reads it, and the `?` key list can show it. Add a
 * row to add a key (Lifelines add F, Q, P and S).
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
];

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
