import type { Bed } from "./cues";

/**
 * A note's frequency from its distance in semitones from A4, as `semitones`
 * in cues.ts. Kept here because cues.ts imports this file for `BEDS`, and
 * a value imported back from it could be read before it's defined.
 */
const semitones = (fromA4: number) => 440 * 2 ** (fromA4 / 12);

/**
 * The menu theme: an original eight-second loop in D minor, in the spirit of
 * a quiz show's opening (a dark string pad, a pulsing bass and a bell
 * motif), never a copy of one. It's rendered once into a buffer that loops
 * with no seam, rather than scheduled note by note, so it needs no timers
 * and costs nothing while it plays.
 */

/** 120 beats a minute, four bars of four: the loop is 8 s. */
const BEAT = 0.5;
const BARS = 4;
export const THEME_SECONDS = BARS * 4 * BEAT;

/** The rate the loop is rendered at: plenty for a soft, filtered pad, and quick to render. */
const RENDER_RATE = 22050;

/** One chord a bar, i–VI–iv–V: Dm, B♭, Gm, A. Pad voices and the bass root, in semitones from A4. */
const CHORDS = [
  { pad: [-19, -16, -12], root: -31 },
  { pad: [-23, -19, -16], root: -35 },
  { pad: [-19, -14, -11], root: -38 },
  { pad: [-20, -17, -12], root: -36 },
];

/** The bell motif over the chords: [bar, beat, length in beats, semitones from A4]. */
const MOTIF: [number, number, number, number][] = [
  [0, 0, 1, 0],
  [0, 1, 1, 5],
  [0, 2, 2, 8],
  [1, 0, 0.5, 8],
  [1, 0.5, 0.5, 7],
  [1, 1, 3, 5],
  [2, 0, 1, 1],
  [2, 1, 1, 5],
  [2, 2, 2, 10],
  [3, 0, 1.5, 7],
  [3, 1.5, 0.5, 4],
  [3, 2, 2, 0],
];

/**
 * Adds one note into the loop at `start` seconds. Anything that runs past
 * the end wraps round to the start, so a note's tail rings on across the
 * loop point and there's no seam.
 */
function addNote(
  samples: Float32Array,
  rate: number,
  start: number,
  seconds: number,
  partials: { frequency: number; gain: number }[],
  envelope: (t: number) => number,
): void {
  const from = Math.round(start * rate);
  const count = Math.round(seconds * rate);
  const levels = new Float32Array(count);
  for (let i = 0; i < count; i++) levels[i] = envelope(i / rate);
  for (const { frequency, gain } of partials) {
    // Each sine by the recurrence sin((n+1)w) = 2cos(w)sin(nw) - sin((n-1)w):
    // the same wave as Math.sin, several times quicker to render.
    const step = (2 * Math.PI * frequency) / rate;
    const k = 2 * Math.cos(step);
    let previous = -Math.sin(step);
    let current = 0;
    for (let i = 0; i < count; i++) {
      samples[(from + i) % samples.length]! += gain * levels[i]! * current;
      const next = k * current - previous;
      previous = current;
      current = next;
    }
  }
}

/** A sawtooth-like string voice: the first few harmonics, at 1/n. */
function stringPartials(frequency: number): { frequency: number; gain: number }[] {
  return [1, 2, 3, 4].map((n) => ({ frequency: frequency * n, gain: 1 / n }));
}

/** Renders the loop, peaking at 0.8. Pure, so it's the same every time. */
export function renderTheme(rate = RENDER_RATE): Float32Array {
  const samples = new Float32Array(Math.round(THEME_SECONDS * rate));
  const bar = 4 * BEAT;

  CHORDS.forEach(({ pad, root }, index) => {
    const start = index * bar;
    // The pad: two voices a note, a few cents apart, swelling in and
    // overlapping the next chord as it fades.
    const padEnvelope = (t: number) => Math.min(t / 0.3, 1) * (t < bar ? 1 : Math.exp(-(t - bar) / 0.15));
    for (const note of pad) {
      for (const cents of [-6, 6]) {
        const frequency = semitones(note) * 2 ** (cents / 1200);
        addNote(samples, rate, start, bar + 0.6, stringPartials(frequency), (t) => 0.05 * padEnvelope(t));
      }
    }
    // The bass: the root on every eighth, the first of each beat a little harder.
    for (let eighth = 0; eighth < 8; eighth++) {
      const accent = eighth % 2 === 0 ? 1 : 0.6;
      const frequency = semitones(root);
      addNote(
        samples,
        rate,
        start + (eighth * BEAT) / 2,
        0.3,
        [
          { frequency, gain: 1 },
          { frequency: frequency * 2, gain: 0.3 },
        ],
        (t) => 0.22 * accent * Math.min(t / 0.005, 1) * Math.exp(-t / 0.1),
      );
    }
  });

  // The bell: a sine with a faint inharmonic partial, ringing on past its beat.
  for (const [barIndex, beat, beats, note] of MOTIF) {
    const frequency = semitones(note);
    const held = beats * BEAT;
    addNote(
      samples,
      rate,
      barIndex * bar + beat * BEAT,
      held + 0.8,
      [
        { frequency, gain: 1 },
        { frequency: frequency * 2.76, gain: 0.15 },
      ],
      (t) => 0.16 * Math.min(t / 0.004, 1) * Math.exp(-t / (held * 0.6 + 0.2)),
    );
  }

  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  if (peak > 0) for (let i = 0; i < samples.length; i++) samples[i]! *= 0.8 / peak;
  return samples;
}

/** Rendered on the first play, then kept: coming back to the Main menu doesn't render it again. */
let rendered: Float32Array | undefined;

/** How loud the theme sits, and how long it takes to come in and to fade out. */
const LEVEL = 0.35;
const FADE_IN = 0.6;
const FADE_OUT = 0.8;

export const theme: Bed = ({ context, destination, now }) => {
  rendered ??= renderTheme();
  const buffer = context.createBuffer(1, rendered.length, RENDER_RATE);
  buffer.getChannelData(0).set(rendered);

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // A gentle low-pass takes the edge off the rendered harmonics.
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 3200;

  const out = context.createGain();
  out.gain.setValueAtTime(0.0001, now);
  out.gain.exponentialRampToValueAtTime(LEVEL, now + FADE_IN);
  source.connect(filter).connect(out).connect(destination);
  source.start(now);

  return {
    stop() {
      const at = context.currentTime;
      out.gain.cancelScheduledValues(at);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), at);
      out.gain.exponentialRampToValueAtTime(0.0001, at + FADE_OUT);
      source.stop(at + FADE_OUT + 0.05);
    },
  };
};
