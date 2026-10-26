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

/** An envelope: rises from silence to `peak` over `attack`, then falls back to silence by `end` (seconds after `at`). */
function envelope(context: BaseAudioContext, at: number, peak: number, attack: number, end: number): GainNode {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + end);
  return gain;
}

interface Note {
  /** Semitones from A4. */
  pitch: number;
  at: number;
  /** Seconds until it has faded out. */
  length: number;
  peak: number;
  type?: OscillatorType;
  attack?: number;
}

/** One oscillator note into `to`, shaped by an envelope, stopping once it's faded. */
function note(context: BaseAudioContext, to: AudioNode, { pitch, at, length, peak, type = "sine", attack = 0.01 }: Note): void {
  const voice = context.createOscillator();
  voice.type = type;
  voice.frequency.value = semitones(pitch);
  voice.connect(envelope(context, at, peak, attack, length)).connect(to);
  voice.start(at);
  voice.stop(at + length + 0.05);
}

/** A low-pass filter into `to`, its cutoff moving from `from` to `toHz` between `at` and `by`. */
function sweep(context: BaseAudioContext, to: AudioNode, from: number, toHz: number, at: number, by: number): BiquadFilterNode {
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(from, at);
  filter.frequency.exponentialRampToValueAtTime(toHz, by);
  filter.connect(to);
  return filter;
}

/**
 * The right answer: a quick climb up a bright major arpeggio, C5 to C6, that
 * rings on as a chord with a high shimmer on top.
 */
const right: Cue = ({ context, destination, now }) => {
  const bright = sweep(context, destination, 1800, 6000, now, now + 0.4);
  [3, 7, 10, 15].forEach((pitch, i) => {
    note(context, bright, { pitch, at: now + i * 0.07, length: 1.3 - i * 0.07, peak: 0.16, type: "triangle" });
  });
  note(context, bright, { pitch: 27, at: now + 0.28, length: 1, peak: 0.05 });
};

/**
 * A wrong answer: a low, buzzing pair falling a semitone (E3 to E♭3) over a
 * thud, darkening as it fades.
 */
const wrong: Cue = ({ context, destination, now }) => {
  const dark = sweep(context, destination, 1400, 220, now, now + 1.3);
  for (const [pitch, at, length] of [
    [-17, 0, 0.35],
    [-18, 0.3, 1.1],
  ] as const) {
    // Two voices a little apart, for the buzz.
    for (const detune of [-8, 8]) {
      const voice = context.createOscillator();
      voice.type = "sawtooth";
      voice.frequency.value = semitones(pitch);
      voice.detune.value = detune;
      voice.connect(envelope(context, now + at, 0.12, 0.02, length)).connect(dark);
      voice.start(now + at);
      voice.stop(now + at + length + 0.05);
    }
  }
  note(context, destination, { pitch: -36, at: now, length: 0.5, peak: 0.5 });
};

/**
 * Walk away: a soft, warm close, an F major chord settling onto C major, the
 * sound of keeping what's been won.
 */
const walkAway: Cue = ({ context, destination, now }) => {
  const warm = sweep(context, destination, 2400, 900, now, now + 1.8);
  for (const pitch of [-16, -4, 0, 3]) {
    note(context, warm, { pitch, at: now, length: 0.7, peak: 0.09, type: "triangle", attack: 0.06 });
  }
  for (const pitch of [-21, -9, -5, -2, 3]) {
    note(context, warm, { pitch, at: now + 0.55, length: 1.5, peak: 0.08, type: "triangle", attack: 0.08 });
  }
};

/**
 * The million: a fanfare. A climb from G4 to G5, then a full C major chord
 * that opens up and holds, with a twinkle of high notes over it and a boom
 * under it. About three seconds.
 */
const million: Cue = ({ context, destination, now }) => {
  const climb = sweep(context, destination, 2500, 5000, now, now + 0.5);
  [-2, 3, 7, 10].forEach((pitch, i) => {
    note(context, climb, { pitch, at: now + i * 0.11, length: 0.3, peak: 0.15, type: "triangle" });
  });
  const hold = now + 0.45;
  const chord = sweep(context, destination, 600, 4500, hold, hold + 0.8);
  for (const pitch of [-21, -9, -5, -2, 3, 7]) {
    note(context, chord, { pitch, at: hold, length: 2.6, peak: 0.07, type: "sawtooth", attack: 0.05 });
    note(context, chord, { pitch: pitch + 12, at: hold, length: 2.4, peak: 0.04, type: "triangle", attack: 0.05 });
  }
  [22, 27, 31, 34, 39, 34, 31, 27].forEach((pitch, i) => {
    note(context, destination, { pitch, at: hold + 0.3 + i * 0.12, length: 0.5, peak: 0.03 });
  });
  note(context, destination, { pitch: -45, at: hold, length: 1.2, peak: 0.45 });
};

/**
 * The audience voting: a murmur of filtered noise under a patter of keypad
 * blips that comes quicker as the votes go in, then a chime as the vote is
 * counted. About a second and a half.
 */
const audienceVote: Cue = ({ context, destination, now }) => {
  const length = 1.3;
  const noise = context.createBuffer(1, Math.ceil(context.sampleRate * length), context.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  const murmur = context.createBufferSource();
  murmur.buffer = noise;
  const band = context.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 500;
  band.Q.value = 0.8;
  murmur.connect(band).connect(envelope(context, now, 0.18, 0.4, length)).connect(destination);
  murmur.start(now);
  murmur.stop(now + length);

  // The blips: closer together as they go, on a little run up and down.
  let at = now + 0.05;
  [15, 19, 17, 22, 20, 15, 24, 19, 22, 17, 20, 24].forEach((pitch, i) => {
    note(context, destination, { pitch, at, length: 0.06, peak: 0.07, type: "square", attack: 0.003 });
    at += 0.11 - i * 0.006;
  });
  note(context, destination, { pitch: 27, at: now + 1.15, length: 0.5, peak: 0.1 });
  note(context, destination, { pitch: 34, at: now + 1.15, length: 0.5, peak: 0.05 });
};

/**
 * The phone ringing for Phone a Friend: two trilling rings, a pair of bell
 * tones shaken on and off twenty times a second. Over in about a second, well
 * inside `CALL_WAIT` (the "Calling …" line).
 */
const phoneRing: Cue = ({ context, destination, now }) => {
  for (const ring of [0, 0.55]) {
    const start = now + ring;
    const out = envelope(context, start, 0.14, 0.01, 0.4);
    out.connect(destination);
    // The trill: a square wave opening and closing the bell's gain.
    const bell = context.createGain();
    bell.gain.value = 0.5;
    const depth = context.createGain();
    depth.gain.value = 0.5;
    const trill = context.createOscillator();
    trill.type = "square";
    trill.frequency.value = 20;
    trill.connect(depth);
    depth.connect(bell.gain);
    bell.connect(out);
    for (const pitch of [17, 21]) {
      const tone = context.createOscillator();
      tone.frequency.value = semitones(pitch);
      tone.connect(bell);
      tone.start(start);
      tone.stop(start + 0.45);
    }
    trill.start(start);
    trill.stop(start + 0.45);
  }
};

export const CUES = { lockIn, right, wrong, walkAway, million, audienceVote, phoneRing } satisfies Record<string, Cue>;

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
 * of the Game. The menu theme adds its bed here too.
 */
export const BEDS = {
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
