import { describe, expect, it } from "vitest";
import { createFakeAudio } from "./fake-audio";
import { menuThemePlays, syncMenuTheme } from "./menu-theme";
import { createSoundEngine } from "./sound-engine";

function engine() {
  const audio = createFakeAudio();
  let muted = false;
  const sound = createSoundEngine({
    createContext: audio.createContext,
    remembered: { muted: () => muted, setMuted: (value) => void (muted = value) },
  });
  sound.unlock();
  return { audio, sound };
}

describe("which screens play the menu theme", () => {
  it.each([
    ["the Main menu", "/"],
    ["Pick a topic", "/topics"],
    ["Ready to play for General", "/general"],
    ["Ready to play for a Category", "/tv"],
    ["Ready to play for a Title", "/movies/star-wars"],
    ["the privacy note", "/privacy"],
  ])("%s plays it", (_screen, path) => {
    expect(menuThemePlays(path)).toBe(true);
  });

  it("the Game and Game over don't", () => {
    expect(menuThemePlays("/game")).toBe(false);
  });
});

describe("the menu theme as the player moves between screens", () => {
  it("plays on the Main menu and keeps playing, not restarting, through to Ready to play", () => {
    const { audio, sound } = engine();
    syncMenuTheme(sound, "/");
    expect(sound.state().bed).toBe("theme");
    const started = audio.started.length;
    expect(started).toBeGreaterThan(0);

    syncMenuTheme(sound, "/topics");
    syncMenuTheme(sound, "/tv/friends");
    syncMenuTheme(sound, "/topics");
    syncMenuTheme(sound, "/");
    expect(sound.state().bed).toBe("theme");
    expect(audio.started.length).toBe(started);
    expect(audio.stopped).toBe(0);
  });

  it("stops when a Game starts, and comes back on the Main menu", () => {
    const { sound } = engine();
    syncMenuTheme(sound, "/tv/friends");
    syncMenuTheme(sound, "/game");
    expect(sound.state().bed).toBeUndefined();
    syncMenuTheme(sound, "/");
    expect(sound.state().bed).toBe("theme");
  });

  it("leaves a Game's own bed alone when it's already started", () => {
    const sound = createSoundEngine({
      createContext: createFakeAudio().createContext,
      remembered: { muted: () => false, setMuted: () => {} },
      sounds: {
        cues: {},
        beds: { theme: () => ({ stop() {} }), tier1: () => ({ stop() {} }) },
      },
    });
    sound.unlock();
    syncMenuTheme(sound, "/");
    sound.startBed("tier1");
    syncMenuTheme(sound, "/game");
    expect(sound.state().bed).toBe("tier1");
  });

  it("respects the mute, and comes back where the screen wants it when the mute's off", () => {
    const { sound } = engine();
    sound.setMuted(true);
    syncMenuTheme(sound, "/");
    expect(sound.state().bed).toBeUndefined();
    sound.setMuted(false);
    expect(sound.state().bed).toBe("theme");
  });
});
