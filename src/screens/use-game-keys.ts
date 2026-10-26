import { useEffect, useRef } from "react";
import { sound } from "../app/sound";
import type { PlayingGame } from "../game/game-controller";
import { gameKeyEvent, isMuteKey, SHOW_KEYS_KEY, type KeyPress } from "./game-keys";

/**
 * Plays the Game from the keyboard: a key in `GAME_KEYS` sends its move when the
 * Game's current step accepts it (`snapshot.can`). Keys are left alone:
 * - inside an open dialog, whose own buttons and Esc answer it (and Enter
 *   and Esc are only ever the dialog's: see `answeredBy` in `GAME_KEYS`);
 * - with Ctrl, Cmd or Alt held, and on key repeat.
 */
export function useGameKeys(game: PlayingGame): void {
  useEffect(() => {
    function onKeyDown(press: KeyboardEvent) {
      if (press.defaultPrevented || press.repeat) return;
      const target = press.target instanceof Element ? press.target : null;
      if (target?.closest("dialog[open]")) return;
      const event = gameKeyEvent(press);
      if (!event || !game.snapshot().can(event)) return;
      press.preventDefault();
      game.send(event);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [game]);
}

/**
 * Calls `onPress` when a key that `matches` is pressed outside a dialog or a
 * text field, and not on key repeat. For the keys that aren't Game moves, so
 * they work on every step of the Game.
 */
function useKeyOutsideDialogs(matches: (press: KeyPress) => boolean, onPress: () => void): void {
  const pressed = useRef(onPress);
  useEffect(() => {
    pressed.current = onPress;
  });
  useEffect(() => {
    function onKeyDown(press: KeyboardEvent) {
      if (press.defaultPrevented || press.repeat || !matches(press)) return;
      const target = press.target instanceof Element ? press.target : null;
      if (target?.closest("dialog[open], input, textarea, select")) return;
      press.preventDefault();
      pressed.current();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [matches]);
}

/** Turns the sound on or off when M is pressed outside a dialog. */
export function useMuteKey(): void {
  useKeyOutsideDialogs(isMuteKey, () => sound.toggleMuted());
}

/** Whether `press` is `?` with no Ctrl, Cmd or Alt held. */
function isShowKeysKey(press: KeyPress): boolean {
  return press.key === SHOW_KEYS_KEY && !press.ctrlKey && !press.metaKey && !press.altKey;
}

/** Calls `onShow` when `?` is pressed outside a dialog, to show the list of keys. */
export function useShowKeysKey(onShow: () => void): void {
  useKeyOutsideDialogs(isShowKeysKey, onShow);
}
