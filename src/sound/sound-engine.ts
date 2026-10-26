import { BEDS, CUES, type Bed, type BedName, type Cue, type CueName } from "./cues";

/** The sounds an engine can play: the game's own (`CUES` and `BEDS`), or a test's. */
export interface SoundLibrary<C extends string, B extends string> {
  cues: Record<C, Cue>;
  beds: Record<B, Bed>;
}

export interface SoundEngineOptions<C extends string, B extends string> {
  /**
   * Makes the AudioContext, on the first tap or key press. Undefined, or a
   * throw, means there's no Web Audio: then nothing plays, and nothing fails.
   */
  createContext: () => AudioContext | undefined;
  /** Where the mute is remembered: device storage in the app. */
  remembered: { muted(): boolean; setMuted(muted: boolean): void };
  /** The sounds to play. The game's own by default. */
  sounds?: SoundLibrary<C, B>;
}

/** What the engine is doing, for the page to show (and the e2e journeys to check, since they can't hear). */
export interface SoundState<C extends string = CueName, B extends string = BedName> {
  /** Whether the first tap or key press has happened. */
  unlocked: boolean;
  muted: boolean;
  /** How many cues have actually played. */
  cues: number;
  /** The cue that played last. */
  lastCue: C | undefined;
  /** The bed playing now. */
  bed: B | undefined;
}

/**
 * The game's sound. Sound is on by default, and nothing plays before the
 * player's first tap or key press (`unlock`), because browsers block audio
 * until then; the AudioContext is only made at that point. While muted,
 * nothing plays at all. Cues and beds never deal with either rule: they
 * just ask to `play` or `startBed`, and the engine decides.
 *
 * One bed plays at a time. A bed asked for before the first tap, or while
 * muted, is remembered and starts when it can: so the menu theme can be
 * asked for on page load and begins on the first tap.
 *
 * Every sound goes through one master gain, which the mute closes too, so
 * a sound already ringing out goes quiet straight away.
 */
export function createSoundEngine<C extends string = CueName, B extends string = BedName>({
  createContext,
  remembered,
  sounds = { cues: CUES, beds: BEDS } as unknown as SoundLibrary<C, B>,
}: SoundEngineOptions<C, B>) {
  let unlocked = false;
  let muted = remembered.muted();
  let audio: { context: AudioContext; master: GainNode } | undefined;
  /** The bed asked for, playing or waiting for the first tap or the mute to come off. */
  let wantedBed: B | undefined;
  let playing: { name: B; stop(): void } | undefined;
  let state: SoundState<C, B> = { unlocked, muted, cues: 0, lastCue: undefined, bed: undefined };
  const listeners = new Set<() => void>();

  function update(change: Partial<SoundState<C, B>>) {
    state = { ...state, ...change };
    for (const listener of listeners) listener();
  }

  function output() {
    if (!audio || muted) return undefined;
    return { context: audio.context, destination: audio.master, now: audio.context.currentTime };
  }

  /** Starts or stops the bed so what's playing matches what's wanted and allowed. */
  function syncBed() {
    if (playing && (playing.name !== wantedBed || muted)) {
      try {
        playing.stop();
      } catch {
        // A bed that fails to stop is left to the master gain.
      }
      playing = undefined;
    }
    const out = output();
    if (!playing && wantedBed !== undefined && out) {
      try {
        playing = { name: wantedBed, ...sounds.beds[wantedBed](out) };
      } catch {
        playing = undefined;
      }
    }
    if (state.bed !== playing?.name) update({ bed: playing?.name });
  }

  function setMasterGain() {
    if (!audio) return;
    try {
      const { gain } = audio.master;
      gain.cancelScheduledValues(audio.context.currentTime);
      gain.setValueAtTime(muted ? 0 : 1, audio.context.currentTime);
    } catch {
      // Nothing to do: the cues and beds check the mute themselves too.
    }
  }

  /** Mutes or unmutes, and remembers it on the device. */
  function setMuted(value: boolean): void {
    if (value === muted) return;
    muted = value;
    remembered.setMuted(value);
    setMasterGain();
    update({ muted });
    syncBed();
  }

  return {
    /**
     * The first tap or key press: makes the AudioContext and starts a bed
     * that's waiting. Call it on every one; after the first it only wakes a
     * suspended context (as iOS does after a call or a lock).
     */
    unlock(): void {
      if (audio) {
        if (audio.context.state === "suspended") void audio.context.resume().catch(() => {});
        return;
      }
      if (unlocked) return;
      unlocked = true;
      try {
        const context = createContext();
        if (context) {
          const master = context.createGain();
          master.connect(context.destination);
          audio = { context, master };
          setMasterGain();
          if (context.state === "suspended") void context.resume().catch(() => {});
        }
      } catch {
        audio = undefined;
      }
      update({ unlocked });
      syncBed();
    },

    /** Plays a cue once, unless it's before the first tap or muted. */
    play(name: C): void {
      const out = output();
      if (!out) return;
      try {
        sounds.cues[name](out);
      } catch {
        return;
      }
      update({ cues: state.cues + 1, lastCue: name });
    },

    /** Plays a bed on a loop, stopping any other. It waits for the first tap, and the mute. */
    startBed(name: B): void {
      wantedBed = name;
      syncBed();
    },

    /**
     * Stops the bed playing, and forgets it. Given `only`, it does so only
     * if that's the bed asked for, so it can't stop one a screen has just
     * started.
     */
    stopBed(only?: B): void {
      if (only !== undefined && wantedBed !== only) return;
      wantedBed = undefined;
      syncBed();
    },

    muted(): boolean {
      return muted;
    },

    setMuted,

    toggleMuted(): void {
      setMuted(!muted);
    },

    /** What's playing; the same object until something changes, for `useSyncExternalStore`. */
    state(): SoundState<C, B> {
      return state;
    },

    /** Calls `listener` after every change to `state()`. Returns the unsubscribe. */
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type SoundEngine = ReturnType<typeof createSoundEngine<CueName, BedName>>;
