import { describe, expect, it } from "vitest";
import { renderTheme, THEME_SECONDS } from "./theme";

describe("the menu theme's loop", () => {
  it("is short, and makes sound without clipping", () => {
    const samples = renderTheme(8000);
    expect(THEME_SECONDS).toBe(8);
    expect(samples.length).toBe(8 * 8000);
    const peak = samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
    expect(peak).toBeCloseTo(0.8);
  });

  it("joins up at the loop point, with no click", () => {
    const samples = renderTheme(8000);
    expect(Math.abs(samples[0]! - samples.at(-1)!)).toBeLessThan(0.2);
  });
});
