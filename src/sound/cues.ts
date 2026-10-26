/**
 * Every sound the game makes, generated with Web Audio (no audio files), and
 * original: in the spirit of a quiz show, never a copy of one's music.
 *
 * A cue is a one-shot (a sting); a bed is a loop that runs until it's
 * stopped (a Tier bed, the menu theme). Both only build and start nodes on
 * the output they're given: the sound engine decides whether they play at
 * all (the first tap, the mute), so a cue never checks either. Add a sound
 * by adding it to `CUES` or `BEDS`.
 */

import { theme } from "./theme";

/** Where a cue plays: the engine's AudioContext, the node to connect to (the mute sits after it), and the time to start at. */
export interface SoundOutput {
  context: BaseAudioContext;
  destination: AudioNode;
  now: number;
}

/** A one-shot sound. It schedules its nodes from `now` and lets them end on their own. */
export type Cue = (out: SoundOutput) => void;

/** A looping sound. It starts at `now` and plays until `stop`, which should fade it out rather than cut it. */
export type Bed = (out: SoundOutput) => { stop(): void };

/** A note's frequency, from its distance in semitones from A4 (440 Hz). */
export function semitones(fromA4: number): number {
  return 440 * 2 ** (fromA4 / 12);
}

/**
 * The lock-in sting on "Final answer": a low thud under a dark, filtered
 * minor chord with a held second for tension, over in under a second.
 */
const lockIn: Cue = ({ context, destination, now }) => {
  const out = context.createGain();
  out.gain.setValueAtTime(0.0001, now);
  out.gain.exponentialRampToValueAtTime(0.5, now + 0.02);
  out.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
  out.connect(destination);

  // The thud: a sine falling from E2 to about B0.
  const thud = context.createOscillator();
  thud.frequency.setValueAtTime(semitones(-29), now);
  thud.frequency.exponentialRampToValueAtTime(semitones(-46), now + 0.25);
  const thudGain = context.createGain();
  thudGain.gain.setValueAtTime(0.9, now);
  thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  thud.connect(thudGain).connect(out);
  thud.start(now);
  thud.stop(now + 0.4);

  // The chord: D3, F3, A3 and E4, sawtooths through a closing low-pass.
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 4;
  filter.frequency.setValueAtTime(2400, now);
  filter.frequency.exponentialRampToValueAtTime(300, now + 0.8);
  filter.connect(out);
  for (const note of [-19, -16, -12, -5]) {
    const voice = context.createOscillator();
    voice.type = "sawtooth";
    voice.frequency.value = semitones(note);
    const voiceGain = context.createGain();
    voiceGain.gain.value = 0.12;
    voice.connect(voiceGain).connect(filter);
    voice.start(now);
    voice.stop(now + 0.9);
  }
};

export const CUES = { lockIn } satisfies Record<string, Cue>;

/**
 * How tense each Tier's bed is, Tier 1 first. Each Tier sits a semitone
 * higher, pulses faster, opens its filter further and stacks a darker
 * chord, and from Tier 3 a high tremolo note hangs over it.
 */
const TIER_TENSION = [
  { key: 0, pulse: 1.0, cutoff: 500, chord: [0, 7, 12], shimmer: 0, tremolo: 4 },
  { key: 1, pulse: 1.25, cutoff: 700, chord: [0, 7, 15], shimmer: 0, tremolo: 4.5 },
  { key: 2, pulse: 1.5, cutoff: 950, chord: [0, 3, 7, 15], shimmer: 0.015, tremolo: 5 },
  { key: 3, pulse: 1.85, cutoff: 1250, chord: [0, 3, 7, 14], shimmer: 0.025, tremolo: 6.5 },
  { key: 4, pulse: 2.2, cutoff: 1600, chord: [0, 1, 7, 13], shimmer: 0.035, tremolo: 8 },
] as const;

type Tension = (typeof TIER_TENSION)[number];

/** The bed's level: well under the stings, so they cut through it. */
const BED_LEVEL = 0.14;

/** The root of every bed: D2, a semitone higher each Tier. */
const BED_ROOT = -31;

/**
 * Builds a bed: a fade-in to `BED_LEVEL` on its own gain, and a `stop` that
 * fades it out over about half a second and then stops every source. The
 * sources loop until then (an oscillator plays until it's stopped), so a
 * bed lasts as long as it's needed.
 */
function bed(
  { context, destination, now }: SoundOutput,
  build: (out: GainNode) => AudioScheduledSourceNode[],
  { fadeIn = 1.2 } = {},
): { stop(): void } {
  const out = context.createGain();
  out.gain.setValueAtTime(0.0001, now);
  out.gain.exponentialRampToValueAtTime(BED_LEVEL, now + fadeIn);
  out.connect(destination);
  const sources = build(out);
  for (const source of sources) source.start(now);
  let stopped = false;
  return {
    stop() {
      if (stopped) return;
      stopped = true;
      const at = context.currentTime;
      out.gain.cancelScheduledValues(at);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), at);
      out.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
      for (const source of sources) source.stop(at + 0.55);
    },
  };
}

/** A held chord of detuned sawtooths on `root`, through a low-pass, into `into`. */
function pad(context: BaseAudioContext, into: AudioNode, root: number, chord: readonly number[], cutoff: number) {
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 1.5;
  filter.frequency.value = cutoff;
  filter.connect(into);
  const voices = chord.flatMap((interval) =>
    [-6, 6].map((cents) => {
      const voice = context.createOscillator();
      voice.type = "sawtooth";
      voice.frequency.value = semitones(root + interval);
      voice.detune.value = cents;
      const gain = context.createGain();
      gain.gain.value = 0.22 / chord.length;
      voice.connect(gain).connect(filter);
      return voice;
    }),
  );
  return { filter, voices };
}

/**
 * A note whose level swings with an LFO at `rate` Hz, between silent and
 * twice `depth`: the bed's pulse, or its high tremolo.
 */
function throb(
  context: BaseAudioContext,
  into: AudioNode,
  { note, rate, depth, type }: { note: number; rate: number; depth: number; type: OscillatorType },
): AudioScheduledSourceNode[] {
  const tone = context.createOscillator();
  tone.type = type;
  tone.frequency.value = semitones(note);
  const level = context.createGain();
  level.gain.value = depth;
  tone.connect(level).connect(into);
  const lfo = context.createOscillator();
  lfo.frequency.value = rate;
  const swing = context.createGain();
  swing.gain.value = depth;
  lfo.connect(swing);
  swing.connect(level.gain);
  return [tone, lfo];
}

/** The high tremolo note: a minor third over the root, three octaves up. */
const SHIMMER = 36 + 3;

/**
 * The bed under a Question: a low pulse like a heartbeat under a dark,
 * held chord, tenser at each Tier (`TIER_TENSION`).
 */
function tierBed(tension: Tension): Bed {
  return (output) =>
    bed(output, (out) => {
      const { context } = output;
      const root = BED_ROOT + tension.key;
      const { voices } = pad(context, out, root, tension.chord, tension.cutoff);
      const sources = [...voices, ...throb(context, out, { note: root - 12, rate: tension.pulse, depth: 0.35, type: "sine" })];
      if (tension.shimmer > 0) {
        sources.push(
          ...throb(context, out, { note: root + SHIMMER, rate: tension.tremolo, depth: tension.shimmer, type: "triangle" }),
        );
      }
      return sources;
    });
}

/**
 * The bed through the reveal wait, after "Final answer": the pulse stops,
 * and the Tier's chord swells and opens out over a low drone and a fast
 * high tremolo, as if holding its breath. The swell keeps building however
 * long the wait is (it eases toward its peak and holds there), and the
 * reveal's sting takes over when it ends.
 */
function lockedInBed(tension: Tension): Bed {
  return (output) =>
    bed(
      output,
      (out) => {
        const { context, now } = output;
        const root = BED_ROOT + tension.key;
        const { filter, voices } = pad(context, out, root, tension.chord, tension.cutoff);
        filter.frequency.setValueAtTime(tension.cutoff * 0.6, now);
        filter.frequency.setTargetAtTime(tension.cutoff * 3, now, 1.5);
        const drone = context.createOscillator();
        drone.frequency.value = semitones(root - 12);
        const droneGain = context.createGain();
        droneGain.gain.value = 0.3;
        drone.connect(droneGain).connect(out);
        const tremolo = { note: root + SHIMMER, rate: tension.tremolo + 4, depth: 0.02 + tension.shimmer, type: "triangle" as const };
        return [...voices, drone, ...throb(context, out, tremolo)];
      },
      { fadeIn: 0.3 },
    );
}

/**
 * The Tier beds (`tier1` to `tier5`) and their reveal-wait versions
 * (`tier1LockedIn` to `tier5LockedIn`). `gameBed` picks one for each step
 * of the Game, and the menu theme (`theme`, from theme.ts).
 */
export const BEDS = {
  theme,
  tier1: tierBed(TIER_TENSION[0]),
  tier2: tierBed(TIER_TENSION[1]),
  tier3: tierBed(TIER_TENSION[2]),
  tier4: tierBed(TIER_TENSION[3]),
  tier5: tierBed(TIER_TENSION[4]),
  tier1LockedIn: lockedInBed(TIER_TENSION[0]),
  tier2LockedIn: lockedInBed(TIER_TENSION[1]),
  tier3LockedIn: lockedInBed(TIER_TENSION[2]),
  tier4LockedIn: lockedInBed(TIER_TENSION[3]),
  tier5LockedIn: lockedInBed(TIER_TENSION[4]),
} satisfies Record<string, Bed>;

export type CueName = keyof typeof CUES;
export type BedName = keyof typeof BEDS;
