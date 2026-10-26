import { useEffect, useRef } from "react";
import type { PlayingGame } from "../game/game-controller";
import { GAME_KEYS, gameKeyEvent, SHOW_KEYS_KEY, type GameKey } from "./game-keys";

const CONTROLS = "button, a[href], input, select, textarea, summary";

/**
 * Plays the Game from the keyboard: a key in `keys` sends its move when the
 * Game's current step accepts it (`snapshot.can`). Keys are left alone:
 * - inside an open dialog, whose own buttons and Esc answer it;
 * - Enter and Space on a focused control, which presses that control;
 * - with Ctrl, Cmd or Alt held, and on key repeat.
 */
export function useGameKeys(game: PlayingGame, keys: readonly GameKey[] = GAME_KEYS): void {
  useEffect(() => {
    function onKeyDown(press: KeyboardEvent) {
      if (press.defaultPrevented || press.repeat) return;
      const target = press.target instanceof Element ? press.target : null;
      if (target?.closest("dialog[open]")) return;
      if ((press.key === "Enter" || press.key === " ") && target?.closest(CONTROLS)) return;
      const event = gameKeyEvent(press, keys);
      if (!event || !game.snapshot().can(event)) return;
      press.preventDefault();
      game.send(event);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [game, keys]);
}

/**
 * Calls `onShow` when `?` is pressed outside a dialog, to show the list of
 * keys. It's not a Game move, so it works on every step of the Game.
 */
export function useShowKeysKey(onShow: () => void): void {
  const show = useRef(onShow);
  useEffect(() => {
    show.current = onShow;
  });
  useEffect(() => {
    function onKeyDown(press: KeyboardEvent) {
      if (press.defaultPrevented || press.repeat || press.key !== SHOW_KEYS_KEY) return;
      if (press.ctrlKey || press.metaKey || press.altKey) return;
      const target = press.target instanceof Element ? press.target : null;
      if (target?.closest("dialog[open], input, textarea, select")) return;
      press.preventDefault();
      show.current();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
