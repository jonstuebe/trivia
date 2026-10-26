import { describe, expect, it } from "vitest";
import { createSeededRandom } from "../random/random";
import type { ContentFile } from "./types";
import { assignQuestionIds } from "./ids";
import { questionIdSchema } from "./schema";

function question(fields: Record<string, unknown> = {}) {
  return { tier: 1, prompt: "Who?", correct: "A", wrong: ["B", "C", "D"], ...fields };
}

function titleFile(path: string, questions: unknown[]): ContentFile {
  return { path, data: { title: "Some Title", questions } };
}

function ids(file: ContentFile | undefined): unknown[] {
  if (!file) throw new Error("expected a changed file");
  return (file.data as { questions: { id?: unknown }[] }).questions.map((q) => q.id);
}

describe("assigning Question IDs", () => {
  it("gives a Question without an ID a short random one", () => {
    const { changed } = assignQuestionIds([titleFile("tv/friends.json", [question()])], createSeededRandom(1));
    expect(changed.map((file) => file.path)).toEqual(["tv/friends.json"]);
    const [id] = ids(changed[0]);
    expect(questionIdSchema.safeParse(id).success).toBe(true);
  });

  it("never changes an existing ID, and leaves a file with every ID alone", () => {
    const { changed } = assignQuestionIds(
      [
        titleFile("tv/friends.json", [question({ id: "k3p9x2qa" }), question()]),
        titleFile("movies/pixar.json", [question({ id: "aaaa1111" })]),
      ],
      createSeededRandom(1),
    );
    expect(changed.map((file) => file.path)).toEqual(["tv/friends.json"]);
    expect(ids(changed[0])[0]).toBe("k3p9x2qa");
  });

  it("never creates an ID that's already in any Topic file or was just given out", () => {
    // Each run of eight equal rolls spells one candidate ID: a, b and c repeated.
    const a = 0;
    const b = 1 / 36;
    const c = 2 / 36;
    const rolls = [...Array(16).fill(a), ...Array(8).fill(b), ...Array(8).fill(a), ...Array(8).fill(b), ...Array(8).fill(c)];
    const random = { next: () => rolls.shift() ?? 0.99 };

    const { changed } = assignQuestionIds(
      [
        titleFile("movies/pixar.json", [question(), question()]),
        titleFile("tv/friends.json", [question({ id: "aaaaaaaa" })]),
      ],
      random,
    );
    expect(ids(changed[0])).toEqual(["bbbbbbbb", "cccccccc"]);
  });

  it("leaves files that aren't shaped like a Topic file for the content check to report", () => {
    const { changed } = assignQuestionIds(
      [
        { path: "tv/notes.txt", data: undefined },
        { path: "tv/broken.json", data: { title: "Broken", questions: "none" } },
        titleFile("tv/odd.json", [null, "a question", question({ id: "k3p9x2qa" })]),
      ],
      createSeededRandom(1),
    );
    expect(changed).toEqual([]);
  });

  it("running it again on its own output changes nothing", () => {
    const files = [
      titleFile("tv/friends.json", [question(), question({ id: "k3p9x2qa" })]),
      { path: "general.json", data: { questions: [question({ subject: "history" })] } },
    ];
    const first = assignQuestionIds(files, createSeededRandom(5));
    expect(first.changed).toHaveLength(2);
    expect(assignQuestionIds(first.changed, createSeededRandom(5)).changed).toEqual([]);
  });
});
