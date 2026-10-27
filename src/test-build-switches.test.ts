import { describe, expect, it } from "vitest";
import { FIXTURE_BEACON_SRC, FIXTURE_TOKEN } from "./analytics/beacon";
import { INSTANT_REVEAL_KEY, SOUND_DATA } from "./content/fixture-mode";
import { checkBuilds, TEST_BUILD_SWITCHES } from "./test-build-switches";

const every = TEST_BUILD_SWITCHES.join(" ");

describe("TEST_BUILD_SWITCHES", () => {
  it("is built from the switches' own constants", () => {
    expect(TEST_BUILD_SWITCHES).toEqual(
      expect.arrayContaining([INSTANT_REVEAL_KEY, FIXTURE_TOKEN, FIXTURE_BEACON_SRC, SOUND_DATA.cues]),
    );
  });
});

describe("checkBuilds", () => {
  it("passes when the test build has every switch and the real build has none", () => {
    const result = checkBuilds({
      real: [{ path: "assets/index.js", text: "const a = 1;" }],
      test: [{ path: "assets/index.js", text: every }],
    });
    expect(result).toEqual({ inRealBuild: [], missingFromTestBuild: [] });
  });

  it("names each real-build file a switch is in", () => {
    const result = checkBuilds({
      real: [
        { path: "assets/game.js", text: `x="${INSTANT_REVEAL_KEY}"` },
        { path: "assets/index.js", text: "clean" },
      ],
      test: [{ path: "assets/index.js", text: every }],
    });
    expect(result.inRealBuild).toEqual([{ path: "assets/game.js", value: INSTANT_REVEAL_KEY }]);
  });

  it("names a switch the test build no longer has, so a renamed switch can't pass unseen", () => {
    const result = checkBuilds({
      real: [{ path: "assets/index.js", text: "clean" }],
      test: [{ path: "assets/index.js", text: every.replace(FIXTURE_TOKEN, "renamed-token") }],
    });
    expect(result.missingFromTestBuild).toEqual([FIXTURE_TOKEN]);
  });

  it("finds a switch in any test-build file", () => {
    const first = TEST_BUILD_SWITCHES.slice(0, 1).join(" ");
    const rest = TEST_BUILD_SWITCHES.slice(1);
    const result = checkBuilds({
      real: [],
      test: [
        { path: "a.js", text: first },
        { path: "b.js", text: rest.join(" ") },
      ],
    });
    expect(result.missingFromTestBuild).toEqual([]);
  });
});
