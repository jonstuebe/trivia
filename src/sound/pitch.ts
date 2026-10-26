/** A note's frequency, from its distance in semitones from A4 (440 Hz). */
export function semitones(fromA4: number): number {
  return 440 * 2 ** (fromA4 / 12);
}
