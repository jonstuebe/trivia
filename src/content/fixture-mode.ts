/**
 * The test build: the app built on the fixture Topic set in
 * `src/content/fixtures/` instead of the real content, for whole-Game tests
 * and the e2e journeys. Build it with `bun run build:fixtures`, which runs
 * `vite build --mode fixtures` into `dist-fixtures/`.
 *
 * On its own, away from the plugins in `fixture-build.ts` (which use Node),
 * so app code can check `import.meta.env.MODE` against it too.
 */
export const FIXTURE_MODE = "fixtures";

/**
 * The test build's switch for instant reveals: while this localStorage key
 * is "on", the reveal wait is 0 (see `revealWaitHere`), so the e2e journeys
 * that climb the Ladder stay fast. tests/support/engine.ts sets it on every
 * page; `realRevealWait` clears it to time the real wait.
 */
export const INSTANT_REVEAL_KEY = "trivia.fixtures.instantReveal";

/**
 * The test build's sound readout: the `<html>` dataset keys `startSound`
 * sets so the e2e journeys can see what's playing (as `data-sound`,
 * `data-sound-cues`, `data-sound-last-cue` and `data-sound-bed`).
 */
export const SOUND_DATA = {
  muted: "sound",
  cues: "soundCues",
  lastCue: "soundLastCue",
  bed: "soundBed",
} as const;
