import { createSoundEngine, type SoundState } from "../sound/sound-engine";
import { storage } from "./game-services";

/**
 * The app's one sound engine, shared by every screen, with the mute kept in
 * device storage. Screens play a cue with `sound.play("lockIn")` and start
 * or stop a bed with `sound.startBed(...)` / `sound.stopBed()`; the first
 * tap and the mute are the engine's to deal with.
 */
export const sound = createSoundEngine({
  createContext: () => {
    const AudioContextClass =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    return AudioContextClass ? new AudioContextClass() : undefined;
  },
  remembered: storage,
});

/**
 * The events that count as the player's first tap or key press: the ones
 * browsers let start audio. They're kept after the first, so a context the
 * browser suspended (iOS does, after a call) wakes on the next tap.
 */
const GESTURES = ["keydown", "mousedown", "pointerdown", "pointerup", "touchend"] as const;

/**
 * Starts the sound on the first tap or key press, and shows what's playing
 * on `<html>` as data attributes: `data-sound` ("on" or "off"),
 * `data-sound-cues` (how many cues have played), `data-sound-last-cue` and
 * `data-sound-bed`. The page can't be heard in the e2e journeys, so they
 * check these instead.
 */
export function startSound(): void {
  const unlock = () => sound.unlock();
  for (const type of GESTURES) window.addEventListener(type, unlock, { capture: true, passive: true });
  const show = () => showOn(document.documentElement, sound.state());
  sound.subscribe(show);
  show();
}

function showOn(element: HTMLElement, state: SoundState): void {
  element.dataset.sound = state.muted ? "off" : "on";
  element.dataset.soundCues = String(state.cues);
  if (state.lastCue) element.dataset.soundLastCue = state.lastCue;
  else delete element.dataset.soundLastCue;
  if (state.bed) element.dataset.soundBed = state.bed;
  else delete element.dataset.soundBed;
}
