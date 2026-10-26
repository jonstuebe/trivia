import { describe, expect, it } from "vitest";
import { loadTopic } from "./load-topic";

// Vitest runs on the fixture Topic set, as the test build does.

describe("loadTopic", () => {
  it("loads one Title's Questions, labelled with the Title and counted as pop culture", async () => {
    const questions = await loadTopic({ kind: "title", category: "movies", slug: "fixture-heist" });
    expect(questions).toHaveLength(10);
    expect(new Set(questions.map((q) => q.titleName))).toEqual(new Set(["Fixture Heist"]));
    expect(new Set(questions.map((q) => q.subject))).toEqual(new Set(["pop culture"]));
  });

  it("loads General with each Question's own Subject and no Title label", async () => {
    const questions = await loadTopic({ kind: "general" });
    expect(questions).toHaveLength(15);
    expect(questions[0]).toMatchObject({ id: "0a2vmvl5", subject: "history" });
    expect(questions.some((q) => q.titleName !== undefined)).toBe(false);
  });

  it("loads every Title in the Category for a Mixed game, each Question keeping its Title", async () => {
    const questions = await loadTopic({ kind: "category", category: "tv" });
    expect(questions.filter((q) => q.titleName === "Fixture Sitcom")).toHaveLength(20);
    expect(questions.filter((q) => q.titleName === "Fixture Drama")).toHaveLength(5);
    expect(questions).toHaveLength(25);
  });

  it("refuses a Title with no file", async () => {
    await expect(loadTopic({ kind: "title", category: "tv", slug: "no-such-show" })).rejects.toThrow(
      "tv/no-such-show.json",
    );
  });
});
