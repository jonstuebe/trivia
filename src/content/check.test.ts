import { describe, expect, it } from "vitest";
import { checkContent } from "./check";

let nextId = 0;
function question(tier: number, extra: Record<string, unknown> = {}) {
  nextId++;
  return {
    id: `q${String(nextId).padStart(7, "0")}`,
    tier,
    prompt: `Question ${nextId}?`,
    correct: "Right",
    wrong: ["Wrong A", "Wrong B", "Wrong C"],
    ...extra,
  };
}

function questions(countsByTier: number[], extra: Record<string, unknown> = {}) {
  return countsByTier.flatMap((count, i) => Array.from({ length: count }, () => question(i + 1, extra)));
}

describe("building the topic index", () => {
  it("lists each Title's name, slug and Question count per Tier, by Category", () => {
    const { index, errors } = checkContent([
      { path: "tv/the-big-bang-theory.json", data: { title: "The Big Bang Theory", questions: questions([1, 0, 2, 0, 0]) } },
      { path: "tv/friends.json", data: { title: "Friends", questions: questions([3, 3, 3, 4, 5]) } },
      { path: "movies/star-wars.json", data: { title: "Star Wars", questions: questions([0, 0, 0, 0, 1]) } },
      { path: "general.json", data: { questions: questions([2, 1, 0, 0, 0], { subject: "science" }) } },
    ]);
    expect(errors).toEqual([]);
    expect(index).toEqual({
      general: { questionCounts: { 1: 2, 2: 1, 3: 0, 4: 0, 5: 0 } },
      tv: [
        { name: "Friends", slug: "friends", questionCounts: { 1: 3, 2: 3, 3: 3, 4: 4, 5: 5 } },
        { name: "The Big Bang Theory", slug: "the-big-bang-theory", questionCounts: { 1: 1, 2: 0, 3: 2, 4: 0, 5: 0 } },
      ],
      movies: [{ name: "Star Wars", slug: "star-wars", questionCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 } }],
    });
  });

  it("gives an empty index when there are no Topic files", () => {
    expect(checkContent([])).toEqual({ index: { general: null, tv: [], movies: [] }, errors: [] });
  });

  it("lists the same index whatever order the files are read in", () => {
    const files = [
      { path: "movies/pixar.json", data: { title: "Pixar", questions: questions([1]) } },
      { path: "movies/harry-potter.json", data: { title: "Harry Potter", questions: questions([1]) } },
    ];
    expect(checkContent(files).index).toEqual(checkContent([...files].reverse()).index);
    expect(checkContent(files).index.movies.map((title) => title.slug)).toEqual(["harry-potter", "pixar"]);
  });
});

describe("checking across Topic files", () => {
  it("rejects a Question ID used in two files, naming both", () => {
    const shared = question(1);
    const { errors } = checkContent([
      { path: "tv/friends.json", data: { title: "Friends", questions: [shared] } },
      { path: "movies/pixar.json", data: { title: "Pixar", questions: [question(1), { ...shared, prompt: "A different prompt?" }] } },
    ]);
    expect(errors).toEqual([
      {
        file: "movies/pixar.json",
        question: `${shared.id} (question 2)`,
        message: `ID ${shared.id} is already used in tv/friends.json, question 1`,
      },
    ]);
  });

  it("rejects a Question ID used twice in one file", () => {
    const shared = question(2);
    const { errors } = checkContent([
      { path: "tv/friends.json", data: { title: "Friends", questions: [shared, question(1), { ...shared, prompt: "A different prompt?" }] } },
    ]);
    expect(errors).toEqual([
      {
        file: "tv/friends.json",
        question: `${shared.id} (question 3)`,
        message: `ID ${shared.id} is already used in tv/friends.json, question 1`,
      },
    ]);
  });

  it("collects every file's schema errors, and leaves broken files out of the index", () => {
    const { index, errors } = checkContent([
      { path: "tv/friends.json", data: { title: "Friends", questions: [question(9)] } },
      { path: "tv/modern-family.json", data: { questions: [question(1)] } },
      { path: "movies/pixar.json", data: { title: "Pixar", questions: [question(1)] } },
    ]);
    expect(errors.map((error) => error.file)).toEqual(["tv/friends.json", "tv/modern-family.json"]);
    expect(index.tv).toEqual([]);
    expect(index.movies.map((title) => title.slug)).toEqual(["pixar"]);
  });
});
