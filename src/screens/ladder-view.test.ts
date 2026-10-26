import { describe, expect, it } from "vitest";
import { ladderView } from "./ladder-view";

describe("the Ladder", () => {
  it("lists all 15 Rungs from question 1, with full and short amounts", () => {
    const rows = ladderView(1);
    expect(rows.map((row) => row.short)).toEqual([
      "$100", "$200", "$300", "$500", "$1K", "$2K", "$4K", "$8K", "$16K", "$32K", "$64K", "$125K", "$250K", "$500K", "$1M",
    ]);
    expect(rows[14]).toMatchObject({ rung: 15, prize: "$1,000,000" });
  });

  it("marks Rungs 5 and 10 as the Safe levels, and no others", () => {
    expect(
      ladderView(1)
        .filter((row) => row.safe)
        .map((row) => row.rung),
    ).toEqual([5, 10]);
  });

  it("marks the Rungs passed as done and the one being played as current", () => {
    const rows = ladderView(4);
    expect(rows.slice(0, 5).map((row) => row.state)).toEqual(["done", "done", "done", "current", "ahead"]);
  });
});
