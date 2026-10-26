import { describe, expect, it } from "vitest";
import { TIERS } from "../content/schema";
import { revealWait } from "./reveal-wait";

describe("the reveal wait", () => {
  it("grows from about 1s at Tier 1 to about 5s at Tier 5", () => {
    expect(TIERS.map((tier) => revealWait(tier, { reducedMotion: false }))).toEqual([1_000, 2_000, 3_000, 4_000, 5_000]);
  });

  it("is about 1s at every Tier with reduced motion", () => {
    expect(TIERS.map((tier) => revealWait(tier, { reducedMotion: true }))).toEqual([1_000, 1_000, 1_000, 1_000, 1_000]);
  });
});
