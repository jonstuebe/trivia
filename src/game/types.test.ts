import { describe, expect, it } from "vitest";
import { tierForRung } from "./types";

describe("tierForRung", () => {
  it("gives each Tier three Rungs", () => {
    expect([1, 3, 4, 6, 7, 9, 10, 12, 13, 15].map(tierForRung)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it("rejects a Rung off the Ladder", () => {
    expect(() => tierForRung(0)).toThrow(RangeError);
    expect(() => tierForRung(16)).toThrow(RangeError);
  });
});
