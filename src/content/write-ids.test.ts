import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assignQuestionIdsInDir } from "./write-ids";

/** Rolls that always spell `aaaaaaaa`, then `bbbbbbbb` once that's taken, and so on. */
function countingRandom() {
  let calls = 0;
  return { next: () => Math.floor(calls++ / 8) / 36 };
}

describe("assigning Question IDs in a content folder", () => {
  let dir: string;
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function contentFolder(files: Record<string, string>) {
    dir = await mkdtemp(join(tmpdir(), "trivia-ids-"));
    for (const [path, contents] of Object.entries(files)) {
      await mkdir(join(dir, path, ".."), { recursive: true });
      await writeFile(join(dir, path), contents);
    }
    return dir;
  }

  const withoutId = `{
  "title": "Friends",
  "questions": [
    {
      "tier": 2,
      "prompt": "What is Ross's job?",
      "correct": "Palaeontologist",
      "wrong": ["Chef", "Actor", "Masseur"],
      "source": "S1E1"
    }
  ]
}
`;

  it("writes the new ID into the Topic file, first in its Question, keeping the file's layout", async () => {
    await contentFolder({ "tv/friends.json": withoutId });
    const result = await assignQuestionIdsInDir(dir, countingRandom());

    expect(result).toEqual({ errors: [], assigned: 1, changedFiles: ["tv/friends.json"] });
    expect(await readFile(join(dir, "tv/friends.json"), "utf8")).toBe(`{
  "title": "Friends",
  "questions": [
    {
      "id": "aaaaaaaa",
      "tier": 2,
      "prompt": "What is Ross's job?",
      "correct": "Palaeontologist",
      "wrong": ["Chef", "Actor", "Masseur"],
      "source": "S1E1"
    }
  ]
}
`);
  });

  it("changes nothing on a second run", async () => {
    await contentFolder({ "tv/friends.json": withoutId });
    await assignQuestionIdsInDir(dir, countingRandom());
    const afterFirst = await readFile(join(dir, "tv/friends.json"), "utf8");

    expect(await assignQuestionIdsInDir(dir, countingRandom())).toEqual({ errors: [], assigned: 0, changedFiles: [] });
    expect(await readFile(join(dir, "tv/friends.json"), "utf8")).toBe(afterFirst);
  });

  it("writes nothing when a file isn't valid JSON, since its IDs can't be checked for collisions", async () => {
    await contentFolder({ "tv/friends.json": withoutId, "movies/pixar.json": '{ "title": ' });
    const result = await assignQuestionIdsInDir(dir, countingRandom());

    expect(result).toEqual({
      errors: [{ file: "movies/pixar.json", message: expect.stringMatching(/^not valid JSON: /) }],
      assigned: 0,
      changedFiles: [],
    });
    expect(await readFile(join(dir, "tv/friends.json"), "utf8")).toBe(withoutId);
  });
});
