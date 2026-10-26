import { describe, expect, it } from "vitest";
import { reportContent } from "./report";

let nextId = 0;
function question(tier: number, extra: Record<string, unknown> = {}) {
  nextId++;
  return {
    id: `r${String(nextId).padStart(7, "0")}`,
    tier,
    prompt: `Question ${nextId}?`,
    correct: "Right",
    wrong: ["Wrong A", "Wrong B", "Wrong C"],
    ...extra,
  };
}

function title(questions: unknown[]) {
  return [{ path: "tv/friends.json", data: { title: "Friends", questions } }];
}

describe("the long-answer warning", () => {
  it("warns when the right answer is 1.5 times and 5 characters longer than the longest wrong one", () => {
    const q = question(1, { correct: "Central Perk Coffee", wrong: ["Monica's", "The Pub", "Joey's Bar"] });
    expect(reportContent(title([q])).warnings).toEqual([
      {
        file: "tv/friends.json",
        question: `${q.id} (question 1)`,
        message: "the right answer (19 characters) is much longer than the longest wrong one (10), which gives it away",
      },
    ]);
  });

  it("doesn't warn when the right answer is just under 1.5 times the longest wrong one", () => {
    // 14 characters against 10: 5+ longer, but under 1.5 times.
    const q = question(1, { correct: "Central Perk 1", wrong: ["Monica's", "The Pub", "Joey's Bar"] });
    expect(reportContent(title([q])).warnings).toEqual([]);
  });

  it("warns at exactly 1.5 times and 5 characters longer", () => {
    // 15 characters against 10.
    const q = question(1, { correct: "Central Perk 12", wrong: ["Monica's", "The Pub", "Joey's Bar"] });
    expect(reportContent(title([q])).warnings).toHaveLength(1);
  });

  it("doesn't warn about short answers that differ by fewer than 5 characters", () => {
    // 6 characters against 2: three times as long, but only 4 more.
    const q = question(1, { correct: "Rachel", wrong: ["Al", "Bo", "Cy"] });
    expect(reportContent(title([q])).warnings).toEqual([]);
  });

  it("skips files that fail the schema, which the check reports", () => {
    const broken = { path: "tv/friends.json", data: { questions: [question(1, { correct: "A very long right answer" })] } };
    expect(reportContent([broken]).warnings).toEqual([]);
  });
});
