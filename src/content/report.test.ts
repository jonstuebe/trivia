import { describe, expect, it } from "vitest";
import { formatReport, reportContent, type ContentReport } from "./report";

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

describe("the per-Tier and per-Subject report", () => {
  function inTiers(countsByTier: number[], extra: Record<string, unknown> = {}) {
    return countsByTier.flatMap((count, i) => Array.from({ length: count }, () => question(i + 1, extra)));
  }

  it("counts every Topic's Questions per Tier, General first, then TV and Movies by name", () => {
    const { topics } = reportContent([
      { path: "movies/pixar.json", data: { title: "Pixar", questions: inTiers([0, 0, 0, 0, 1]) } },
      { path: "tv/the-big-bang-theory.json", data: { title: "The Big Bang Theory", questions: inTiers([1, 0, 2]) } },
      { path: "tv/friends.json", data: { title: "Friends", questions: inTiers([3, 3, 3, 4, 5]) } },
      { path: "general.json", data: { questions: inTiers([1], { subject: "sports" }) } },
    ]);
    expect(topics.map(({ file, name, tiers }) => ({ file, name, tiers }))).toEqual([
      { file: "general.json", name: "General", tiers: { 1: 1, 2: 0, 3: 0, 4: 0, 5: 0 } },
      { file: "tv/friends.json", name: "Friends", tiers: { 1: 3, 2: 3, 3: 3, 4: 4, 5: 5 } },
      { file: "tv/the-big-bang-theory.json", name: "The Big Bang Theory", tiers: { 1: 1, 2: 0, 3: 2, 4: 0, 5: 0 } },
      { file: "movies/pixar.json", name: "Pixar", tiers: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 } },
    ]);
  });

  it("counts General's Questions per Subject and Tier, listing every Subject even with none", () => {
    const { topics } = reportContent([
      {
        path: "general.json",
        data: {
          questions: [
            ...inTiers([2, 0, 1], { subject: "history" }),
            ...inTiers([0, 1, 0, 0, 3], { subject: "science" }),
            ...inTiers([1], { subject: "pop culture" }),
          ],
        },
      },
    ]);
    expect(topics[0]?.subjects).toEqual({
      history: { 1: 2, 2: 0, 3: 1, 4: 0, 5: 0 },
      science: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 3 },
      sports: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      "pop culture": { 1: 1, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  });

  it("gives a Title no Subjects, since its Questions are all pop culture", () => {
    expect(reportContent(title([question(1)])).topics[0]?.subjects).toBeUndefined();
  });

  it("leaves out files that fail the schema", () => {
    expect(reportContent([{ path: "tv/friends.json", data: { questions: [] } }]).topics).toEqual([]);
  });
});

describe("printing the report", () => {
  it("prints a table of Questions per Tier, with General's Subjects under it, then the warnings", () => {
    const counts = (t1: number, t2: number, t3: number, t4: number, t5: number) => ({ 1: t1, 2: t2, 3: t3, 4: t4, 5: t5 });
    const report: ContentReport = {
      topics: [
        {
          file: "general.json",
          name: "General",
          tiers: counts(12, 3, 0, 0, 0),
          subjects: {
            history: counts(10, 0, 0, 0, 0),
            science: counts(2, 3, 0, 0, 0),
            sports: counts(0, 0, 0, 0, 0),
            "pop culture": counts(0, 0, 0, 0, 0),
          },
        },
        { file: "tv/the-big-bang-theory.json", name: "The Big Bang Theory", tiers: counts(1, 0, 2, 0, 0) },
      ],
      warnings: [{ file: "tv/the-big-bang-theory.json", question: "abcd1234 (question 2)", message: "too long" }],
    };
    expect(formatReport(report)).toBe(
      [
        "Questions per Tier       T1  T2  T3  T4  T5  Total",
        "General                  12   3   0   0   0     15",
        "  history                10   0   0   0   0     10",
        "  science                 2   3   0   0   0      5",
        "  sports                  0   0   0   0   0      0",
        "  pop culture             0   0   0   0   0      0",
        "The Big Bang Theory       1   0   2   0   0      3",
        "",
        "Warning: tv/the-big-bang-theory.json, abcd1234 (question 2): too long",
        "1 warning. Warnings don't fail the check.",
      ].join("\n"),
    );
  });

  it("says so when there are no Topics or warnings", () => {
    expect(formatReport({ topics: [], warnings: [] })).toBe("No Topic files to report on.\n\nNo warnings.");
  });
});
