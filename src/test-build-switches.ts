import { FIXTURE_BEACON_SRC, FIXTURE_TOKEN } from "./analytics/beacon";
import { INSTANT_REVEAL_KEY, SOUND_DATA } from "./content/fixture-mode";

/**
 * The test build's switches, as they appear in its bundle: the instant-reveal
 * key, the sound readout's dataset keys, and the stand-in analytics token and
 * script. Each sits behind a mode check that the real build folds away, so
 * none may be in the real build. Taken from the switches' own constants, so
 * renaming one renames it here too. (The plain `sound` key is left out: the
 * word is everywhere.)
 */
export const TEST_BUILD_SWITCHES: readonly string[] = [
  INSTANT_REVEAL_KEY,
  SOUND_DATA.cues,
  SOUND_DATA.lastCue,
  SOUND_DATA.bed,
  FIXTURE_TOKEN,
  FIXTURE_BEACON_SRC,
];

/** A built file: its path in the build folder and its text. */
export interface BuiltFile {
  path: string;
  text: string;
}

export interface BuildsCheck {
  /** Each real-build file a switch is in, and the switch. Must be empty. */
  inRealBuild: { path: string; value: string }[];
  /**
   * Switches the test build doesn't have. Must be empty: a switch missing
   * there means the string here no longer matches what the app emits, so its
   * absence from the real build proves nothing.
   */
  missingFromTestBuild: string[];
}

/** Checks the real build has none of the switches and the test build has every one. */
export function checkBuilds(
  builds: { real: BuiltFile[]; test: BuiltFile[] },
  switches: readonly string[] = TEST_BUILD_SWITCHES,
): BuildsCheck {
  const inRealBuild = builds.real.flatMap((file) =>
    switches.filter((value) => file.text.includes(value)).map((value) => ({ path: file.path, value })),
  );
  const missingFromTestBuild = switches.filter((value) => !builds.test.some((file) => file.text.includes(value)));
  return { inRealBuild, missingFromTestBuild };
}
