import { useSyncExternalStore } from "react";
import { sound } from "../app/sound";

/**
 * The Sound switch, on the Main menu, Ready to play, the Game and Game over:
 * a switch named "Sound" that reads "Sound: on" or "Sound: off". Screen
 * readers hear its name and whether it's on. The device remembers it, so it
 * holds on every screen and after a reload.
 */
export function SoundSwitch() {
  const { muted } = useSyncExternalStore(sound.subscribe, sound.state);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!muted}
      className="link-quiet"
      onClick={() => sound.toggleMuted()}
    >
      Sound<span aria-hidden="true">: {muted ? "off" : "on"}</span>
    </button>
  );
}
