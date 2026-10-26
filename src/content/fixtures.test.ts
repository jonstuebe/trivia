import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkContentDir } from "./read";
import { generalFileSchema } from "./schema";

/**
 * The fixture Topic set: Topic files with known answers that the test build
 * plays instead of the real content. Every correct answer is
 * "Right answer", so a test or an e2e journey can always pick it.
 */
const fixtures = join(import.meta.dirname, "fixtures");

const each = (count: number) => ({ 1: count, 2: count, 3: count, 4: count, 5: count });

describe("the fixture Topic set", () => {
  it("passes every content check and builds into a topic index", async () => {
    expect(await checkContentDir(fixtures)).toMatchObject({
      errors: [],
      report: { warnings: [] },
      index: {
        // Exactly one Game's worth: 3 per Tier.
        general: { questionCounts: each(3) },
        tv: [
          // Thin: can't fill a Game alone, so a Topic running out can be tested.
          { name: "Fixture Drama", slug: "fixture-drama", questionCounts: each(1) },
          // Full: a Game plus a spare in every Tier for Switch the Question.
          { name: "Fixture Sitcom", slug: "fixture-sitcom", questionCounts: each(4) },
        ],
        // Two listed Titles, so the Topic picker offers "All Movies (mixed)".
        movies: [
          { name: "Fixture Heist", slug: "fixture-heist", questionCounts: each(4) },
          { name: "Fixture Saga", slug: "fixture-saga", questionCounts: each(4) },
        ],
      },
    });
  });

  it("covers all four Subjects in General", async () => {
    const general = generalFileSchema.parse(JSON.parse(await readFile(join(fixtures, "general.json"), "utf8")));
    expect(new Set(general.questions.map((question) => question.subject))).toEqual(
      new Set(["history", "science", "sports", "pop culture"]),
    );
  });
});
