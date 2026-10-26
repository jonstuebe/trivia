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

export const CUES = { lockIn } satisfies Record<string, Cue>;

/** No beds yet: the Tier beds and the menu theme add theirs here. */
export const BEDS = {} satisfies Record<string, Bed>;

export type CueName = keyof typeof CUES;
export type BedName = keyof typeof BEDS;
