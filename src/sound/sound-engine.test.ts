import { describe, expect, it } from "vitest";
import { createFakeAudio } from "./fake-audio";
import { createSoundEngine } from "./sound-engine";

/** The mute as the device remembers it: device storage in the app. */
function rememberedMute(muted = false) {
  return {
    value: muted,
    muted() {
      return this.value;
    },
    setMuted(value: boolean) {
      this.value = value;
    },
  };
}

function engine(options: { muted?: boolean } = {}) {
  const audio = createFakeAudio();
  const remembered = rememberedMute(options.muted);
  const sound = createSoundEngine({ createContext: audio.createContext, remembered });
  return { audio, remembered, sound };
}

describe("before the first tap or key press", () => {
  it("plays nothing, and makes no AudioContext", () => {
    const { audio, sound } = engine();
    sound.play("lockIn");
    expect(audio.contexts).toBe(0);
    expect(audio.started).toEqual([]);
  });
});

describe("after the first tap or key press", () => {
  it("plays the lock-in sting", () => {
    const { audio, sound } = engine();
    sound.unlock();
    sound.play("lockIn");
    expect(audio.started.length).toBeGreaterThan(0);
  });

  it("makes one AudioContext however many taps there are", () => {
    const { audio, sound } = engine();
    sound.unlock();
    sound.unlock();
    sound.play("lockIn");
    expect(audio.contexts).toBe(1);
  });
});

describe("the mute", () => {
  it("is off by default, so sound is on", () => {
    expect(engine().sound.muted()).toBe(false);
  });

  it("plays nothing while muted", () => {
    const { audio, sound } = engine();
    sound.unlock();
    sound.setMuted(true);
    sound.play("lockIn");
    expect(audio.started).toEqual([]);
  });

  it("plays nothing when the device remembers it muted", () => {
    const { audio, sound } = engine({ muted: true });
    expect(sound.muted()).toBe(true);
    sound.unlock();
    sound.play("lockIn");
    expect(audio.started).toEqual([]);
  });

  it("is remembered on the device, and turning it off plays again", () => {
    const { audio, remembered, sound } = engine();
    sound.unlock();
    sound.toggleMuted();
    expect(remembered.value).toBe(true);
    sound.toggleMuted();
    expect(remembered.value).toBe(false);
    sound.play("lockIn");
    expect(audio.started.length).toBeGreaterThan(0);
  });

  it("tells subscribers when it changes", () => {
    const { sound } = engine();
    const seen: boolean[] = [];
    sound.subscribe(() => seen.push(sound.muted()));
    sound.setMuted(true);
    sound.setMuted(false);
    expect(seen).toEqual([true, false]);
  });
});

describe("a looping bed", () => {
  /** A bed that records when it starts and stops, in place of the real ones. */
  function withBeds() {
    const log: string[] = [];
    const bed = (name: string) => () => {
      log.push(`start ${name}`);
      return { stop: () => void log.push(`stop ${name}`) };
    };
    const audio = createFakeAudio();
    const remembered = rememberedMute();
    const sound = createSoundEngine({
      createContext: audio.createContext,
      remembered,
      sounds: { cues: {}, beds: { theme: bed("theme"), tier1: bed("tier1") } },
    });
    return { log, sound };
  }

  it("asked for before the first tap starts on it", () => {
    const { log, sound } = withBeds();
    sound.startBed("theme");
    expect(log).toEqual([]);
    sound.unlock();
    expect(log).toEqual(["start theme"]);
    sound.unlock();
    expect(log).toEqual(["start theme"]);
  });

  it("plays one at a time: a new one stops the last", () => {
    const { log, sound } = withBeds();
    sound.unlock();
    sound.startBed("theme");
    sound.startBed("theme");
    sound.startBed("tier1");
    expect(log).toEqual(["start theme", "stop theme", "start tier1"]);
  });

  it("stops when asked, and when muted, and comes back when the mute is turned off", () => {
    const { log, sound } = withBeds();
    sound.unlock();
    sound.startBed("tier1");
    sound.setMuted(true);
    expect(log).toEqual(["start tier1", "stop tier1"]);
    sound.setMuted(false);
    expect(log).toEqual(["start tier1", "stop tier1", "start tier1"]);
    sound.stopBed();
    sound.setMuted(true);
    sound.setMuted(false);
    expect(log).toEqual(["start tier1", "stop tier1", "start tier1", "stop tier1"]);
  });

  it("never starts while muted", () => {
    const { log, sound } = withBeds();
    sound.setMuted(true);
    sound.unlock();
    sound.startBed("theme");
    expect(log).toEqual([]);
  });
});

describe("what's playing, for the page to show", () => {
  it("counts each cue that plays, and names the bed", () => {
    const { sound } = engine();
    expect(sound.state()).toEqual({ unlocked: false, muted: false, cues: 0, lastCue: undefined, bed: undefined });
    sound.play("lockIn");
    expect(sound.state().cues).toBe(0);
    sound.unlock();
    sound.play("lockIn");
    expect(sound.state()).toMatchObject({ unlocked: true, cues: 1, lastCue: "lockIn" });
    sound.setMuted(true);
    sound.play("lockIn");
    expect(sound.state()).toMatchObject({ muted: true, cues: 1 });
  });
});

describe("without Web Audio", () => {
  it("plays nothing and fails nothing when there's no AudioContext", () => {
    const sound = createSoundEngine({ createContext: () => undefined, remembered: rememberedMute() });
    expect(() => {
      sound.unlock();
      sound.play("lockIn");
      sound.setMuted(true);
      sound.setMuted(false);
    }).not.toThrow();
  });

  it("plays nothing and fails nothing when making one throws", () => {
    const sound = createSoundEngine({
      createContext: () => {
        throw new Error("NotSupportedError");
      },
      remembered: rememberedMute(),
    });
    expect(() => {
      sound.unlock();
      sound.play("lockIn");
    }).not.toThrow();
  });
});
