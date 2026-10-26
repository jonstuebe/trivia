import { describe, expect, it } from "vitest";
import { formatContentError, parseTopicFile } from "./schema";

function question(overrides: Record<string, unknown> = {}) {
  return {
    id: "k3p9x2qa",
    tier: 2,
    prompt: "What is Dwight's middle name?",
    correct: "Kurt",
    wrong: ["Karl", "Klaus", "Kevin"],
    ...overrides,
  };
}

describe("parsing a TV or Movies Topic file", () => {
  it("accepts a Title with its Questions, taking the Category and slug from the path", () => {
    const result = parseTopicFile("tv/the-office.json", {
      title: "The Office",
      questions: [question({ source: "S7E4" })],
    });
    expect(result).toEqual({
      ok: true,
      topic: {
        category: "tv",
        slug: "the-office",
        title: "The Office",
        questions: [
          {
            id: "k3p9x2qa",
            tier: 2,
            prompt: "What is Dwight's middle name?",
            correct: "Kurt",
            wrong: ["Karl", "Klaus", "Kevin"],
            source: "S7E4",
          },
        ],
      },
    });
  });

  it("doesn't need a source", () => {
    expect(parseTopicFile("movies/pixar.json", { title: "Pixar", questions: [question()] }).ok).toBe(true);
  });
});

describe("rejecting a broken Question", () => {
  function errorsFor(overrides: Record<string, unknown>) {
    const result = parseTopicFile("movies/jurassic-park.json", {
      title: "Jurassic Park",
      questions: [question({ id: "aaaa1111" }), question(overrides)],
    });
    if (result.ok) throw new Error("expected the file to be rejected");
    return result.errors;
  }

  it.each([
    ["two wrong answers", { wrong: ["Karl", "Klaus"] }],
    ["four wrong answers", { wrong: ["Karl", "Klaus", "Kevin", "Kyle"] }],
    ["a Tier of 0", { tier: 0 }],
    ["a Tier of 6", { tier: 6 }],
    ["a Tier that isn't a whole number", { tier: 2.5 }],
    ["a Tier given as text", { tier: "2" }],
    ["an empty prompt", { prompt: " " }],
    ["no correct answer", { correct: undefined }],
    ["two correct answers", { correct: ["Kurt", "Karl"] }],
    ["an empty wrong answer", { wrong: ["Karl", "", "Kevin"] }],
    ["an empty source", { source: "" }],
    ["a misspelled field", { wrongs: ["Karl", "Klaus", "Kevin"] }],
    ["a malformed ID", { id: "K3P9" }],
  ])("rejects %s, naming the file and the Question", (_, overrides) => {
    const errors = errorsFor(overrides);
    expect(errors.length).toBeGreaterThan(0);
    for (const error of errors) {
      expect(error.file).toBe("movies/jurassic-park.json");
      expect(error.question?.position).toBe(2);
    }
  });

  it("names the Question by its ID when it has one", () => {
    expect(errorsFor({ tier: 9 })).toEqual([
      { file: "movies/jurassic-park.json", question: { id: "k3p9x2qa", position: 2 }, message: "tier: must be 1, 2, 3, 4 or 5" },
    ]);
  });

  it("names the Question by position when its ID is missing", () => {
    expect(errorsFor({ id: undefined }).map((e) => e.question)).toEqual([{ position: 2 }]);
  });

  it("says which field is wrong", () => {
    expect(errorsFor({ wrong: ["Karl"] })[0]!.message).toMatch(/^wrong: /);
  });
});

describe("General Questions and Subjects", () => {
  it("accepts General Questions with a Subject", () => {
    const subjects = ["history", "science", "sports", "pop culture"];
    const result = parseTopicFile("general.json", {
      questions: subjects.map((subject, i) => question({ id: `gen0000${i}`, subject })),
    });
    if (!result.ok || result.topic.category !== "general") throw new Error("expected a General file");
    expect(result.topic.questions.map((q) => q.subject)).toEqual(subjects);
  });

  it("requires a Subject on every General Question", () => {
    expect(parseTopicFile("general.json", { questions: [question()] })).toEqual({
      ok: false,
      errors: [
        { file: "general.json", question: { id: "k3p9x2qa", position: 1 }, message: expect.stringMatching(/^subject: /) },
      ],
    });
  });

  it("rejects a Subject outside the four", () => {
    expect(parseTopicFile("general.json", { questions: [question({ subject: "geography" })] }).ok).toBe(false);
  });

  it("doesn't need a Subject on TV and Movies Questions", () => {
    expect(parseTopicFile("tv/friends.json", { title: "Friends", questions: [question()] }).ok).toBe(true);
  });
});

describe("Topic file details and paths", () => {
  it("requires a Title name in a TV or Movies file", () => {
    expect(parseTopicFile("tv/friends.json", { questions: [question()] })).toEqual({
      ok: false,
      errors: [{ file: "tv/friends.json", message: expect.stringMatching(/^title: /) }],
    });
  });

  it("rejects a file that isn't an object of Questions", () => {
    expect(parseTopicFile("tv/friends.json", [question()]).ok).toBe(false);
    expect(parseTopicFile("general.json", null).ok).toBe(false);
  });

  it.each([
    "tv/Friends.json",
    "tv/friends_show.json",
    "books/dune.json",
    "tv/drama/friends.json",
    "general.yaml",
    "friends.json",
  ])("rejects a file at %s", (path) => {
    const result = parseTopicFile(path, { title: "Friends", questions: [question()] });
    expect(result).toMatchObject({ ok: false, errors: [{ file: path }] });
  });
});

describe("formatting an error", () => {
  it("names the file and the Question in one line", () => {
    expect(
      formatContentError({ file: "tv/friends.json", question: { id: "k3p9x2qa", position: 4 }, message: "tier: bad" }),
    ).toBe("tv/friends.json, k3p9x2qa (question 4): tier: bad");
    expect(formatContentError({ file: "tv/friends.json", question: { position: 2 }, message: "id: missing" })).toBe(
      "tv/friends.json, question 2: id: missing",
    );
    expect(formatContentError({ file: "tv/friends.json", message: "title: missing" })).toBe(
      "tv/friends.json: title: missing",
    );
  });
});
