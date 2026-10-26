import type { Plugin } from "vite";

/**
 * The test build's stand-in for Cloudflare's beacon: an empty script at
 * `/fixture-beacon.js` (`FIXTURE_BEACON_SRC` in `beacon.ts`), so e2e
 * journeys can see whether the beacon was requested without any request
 * leaving the machine.
 */
export function fixtureBeacon(): Plugin {
  return {
    name: "trivia:fixture-beacon",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "fixture-beacon.js",
        source: "// The test build's stand-in for the Cloudflare Web Analytics beacon. It does nothing.\n",
      });
    },
  };
}
