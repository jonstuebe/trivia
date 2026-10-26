import type { GameEvent } from "../game/machine";

/**
 * One Game keyboard shortcut. The table below is the one place shortcuts are
 * listed: `useGameKeys` sends the `event` of a row that has one, and the `?`
 * key list shows every row. Add a row to add a key.
 */
export type GameKey = {
  /** `KeyboardEvent.key` values; letters match in either case. */
  keys: readonly string[];
  /** What the key does, for the list of keys. */
  description: string;
} & (
  | {
      /** The Game move `useGameKeys` sends for it. */
      event: GameEvent;
    }
  | {
      /**
       * A key the open dialog answers itself (Enter presses its focused
       * button, Esc cancels it), so `useGameKeys` never sends anything for
       * it. Listed so the player knows it.
       */
      answeredBy: "dialog";
    }
);

export const GAME_KEYS: readonly GameKey[] = [
  { keys: ["a", "1"], event: { type: "pick", answer: 0 }, description: "Pick answer A" },
  { keys: ["b", "2"], event: { type: "pick", answer: 1 }, description: "Pick answer B" },
  { keys: ["c", "3"], event: { type: "pick", answer: 2 }, description: "Pick answer C" },
  { keys: ["d", "4"], event: { type: "pick", answer: 3 }, description: "Pick answer D" },
  { keys: ["Enter"], answeredBy: "dialog", description: "Final answer" },
  { keys: ["Escape"], answeredBy: "dialog", description: "Cancel" },
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

/** A key as the player sees it: "A", "Enter", "Esc". */
function keyName(key: string): string {
  return KEY_NAMES[key] ?? (key.length === 1 ? key.toUpperCase() : key);
}

/** Every Game key as it's pressed, then `?` itself, for the list of keys. */
export function keyList(): KeyListRow[] {
  return [
    ...GAME_KEYS.map((shortcut) => ({ keys: shortcut.keys.map(keyName).join(" or "), description: shortcut.description })),
    { keys: SHOW_KEYS_KEY, description: "Show the keys" },
  ];
}

/** The first key that sends `type`, as the player sees it ("F"), for showing beside its button. */
export function keyFor(type: GameEvent["type"]): string | undefined {
  const shortcut = GAME_KEYS.find((row) => "event" in row && row.event.type === type);
  return shortcut && keyName(shortcut.keys[0]!);
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
 * browser or the open dialog. Ctrl, Cmd and Alt combinations are always the
 * browser's. Whether the move fits the Game's current step is for
 * `snapshot.can` to say.
 */
export function gameKeyEvent(press: KeyPress): GameEvent | undefined {
  if (press.ctrlKey || press.metaKey || press.altKey) return undefined;
  const key = press.key.length === 1 ? press.key.toLowerCase() : press.key;
  const shortcut = GAME_KEYS.find((row) => row.keys.includes(key));
  return shortcut && "event" in shortcut ? shortcut.event : undefined;
}
