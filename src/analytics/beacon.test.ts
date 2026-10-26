import { describe, expect, it } from "vitest";
import { beaconScript } from "./beacon";

const noSignals = { globalPrivacyControl: false, doNotTrack: null, onLine: true };

describe("beaconScript", () => {
  it("loads the Cloudflare beacon with the site token when the browser sends no privacy signal", () => {
    expect(beaconScript("abc123", noSignals)).toEqual({
      src: "https://static.cloudflareinsights.com/beacon.min.js",
      dataCfBeacon: '{"token":"abc123"}',
    });
  });

  it("never loads without a site token", () => {
    expect(beaconScript("", noSignals)).toBeUndefined();
  });

  it("doesn't load when Global Privacy Control is on", () => {
    expect(beaconScript("abc123", { ...noSignals, globalPrivacyControl: true })).toBeUndefined();
  });

  it("doesn't load when Do Not Track is set", () => {
    expect(beaconScript("abc123", { ...noSignals, doNotTrack: "1" })).toBeUndefined();
    // Older Firefox said "yes".
    expect(beaconScript("abc123", { ...noSignals, doNotTrack: "yes" })).toBeUndefined();
  });

  it("loads when Do Not Track is unset or explicitly off", () => {
    expect(beaconScript("abc123", { ...noSignals, doNotTrack: "0" })).toBeDefined();
    expect(beaconScript("abc123", { onLine: true })).toBeDefined();
  });

  it("doesn't load offline, so offline visits aren't counted or queued", () => {
    expect(beaconScript("abc123", { ...noSignals, onLine: false })).toBeUndefined();
  });

  it("takes the beacon's address from the caller, for the test build's stand-in", () => {
    expect(beaconScript("fixture-token", noSignals, "/fixture-beacon.js")?.src).toBe("/fixture-beacon.js");
  });
});
