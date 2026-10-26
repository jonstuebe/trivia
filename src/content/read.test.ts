import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkContentDir, readContentDir } from "./read";
import { reportContent } from "./report";

/** One small Title file. */
const title = {
  title: "Fixture Title",
  questions: [
    {
      id: "fx1a2b3c",
      tier: 1,
      prompt: "What colour is the couch in the main apartment?",
      correct: "Orange",
      wrong: ["Blue", "Green", "Grey"],
    },
    {
      id: "fx4d5e6f",
      tier: 1,
      prompt: "Which city is the story set in?",
      correct: "Springfield",
      wrong: ["Shelbyville", "Capital City", "Ogdenville"],
      source: "S1E1",
    },
    {
      id: "fx7g8h9i",
      tier: 3,
      prompt: "What is the name of the coffee shop the friends meet in?",
      correct: "The Daily Grind",
      wrong: ["Bean There", "Brew Haven", "Cup of Joe"],
    },
  ],
};

describe("checking a content folder", () => {
  describe("on disk", () => {
    let dir: string;
    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    async function contentFolder(files: Record<string, string>) {
      dir = await mkdtemp(join(tmpdir(), "trivia-content-"));
      for (const [path, contents] of Object.entries(files)) {
        await mkdir(join(dir, path, ".."), { recursive: true });
        await writeFile(join(dir, path), contents);
      }
      return dir;
    }

    it("builds the topic index from the Topic files in it", async () => {
      expect(await checkContentDir(await contentFolder({ "tv/fixture-title.json": JSON.stringify(title) }))).toEqual({
        errors: [],
        index: {
          general: null,
          tv: [{ name: "Fixture Title", slug: "fixture-title", questionCounts: { 1: 2, 2: 0, 3: 1, 4: 0, 5: 0 } }],
          movies: [],
        },
      });
    });

    it("reads the Topic files for the report", async () => {
      const { files, unreadable } = await readContentDir(
        await contentFolder({ "tv/fixture-title.json": JSON.stringify(title) }),
      );
      expect(unreadable).toEqual([]);
      expect(reportContent(files)).toEqual({
        topics: [{ file: "tv/fixture-title.json", name: "Fixture Title", tiers: { 1: 2, 2: 0, 3: 1, 4: 0, 5: 0 } }],
        // "The Daily Grind" is 15 characters against "Brew Haven"'s 10.
        warnings: [
          {
            file: "tv/fixture-title.json",
            question: "fx7g8h9i (question 3)",
            message: "the right answer (15 characters) is much longer than the longest wrong one (10), which gives it away",
          },
        ],
      });
    });

    it("reports a file that isn't valid JSON, by its path in the folder", async () => {
      const { errors } = await checkContentDir(await contentFolder({ "movies/pixar.json": '{ "title": ' }));
      expect(errors).toEqual([{ file: "movies/pixar.json", message: expect.stringMatching(/^not valid JSON: /) }]);
    });

    it("reports a file in the wrong place, and ignores hidden files", async () => {
      const { errors } = await checkContentDir(
        await contentFolder({ "books/dune.json": "{}", "tv/notes.txt": "", ".gitkeep": "", "tv/.DS_Store": "" }),
      );
      expect(errors.map((error) => error.file)).toEqual(["books/dune.json", "tv/notes.txt"]);
    });

    it("reports a missing content folder", async () => {
      dir = join(tmpdir(), "trivia-content-missing");
      await expect(checkContentDir(dir)).rejects.toThrow();
    });
  });
});
