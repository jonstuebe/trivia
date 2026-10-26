import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkContentDir } from "./read";

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
      const show = {
        title: "Fixture Show",
        questions: [
          { id: "fx1a2b3c", tier: 1, prompt: "What colour is the couch?", correct: "Orange", wrong: ["Blue", "Green", "Grey"] },
          { id: "fx7g8h9i", tier: 3, prompt: "Which city is it set in?", correct: "Springfield", wrong: ["Paris", "Rome", "Oslo"] },
        ],
      };
      expect(await checkContentDir(await contentFolder({ "tv/fixture-show.json": JSON.stringify(show) }))).toEqual({
        errors: [],
        index: {
          general: null,
          tv: [{ name: "Fixture Show", slug: "fixture-show", questionCounts: { 1: 1, 2: 0, 3: 1, 4: 0, 5: 0 } }],
          movies: [],
        },
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
