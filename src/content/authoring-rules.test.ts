import { describe, expect, it } from "vitest";
import { checkContent } from "./check";

let nextId = 0;
function question(extra: Record<string, unknown> = {}) {
  nextId++;
  return {
    id: `r${String(nextId).padStart(7, "0")}`,
    tier: 1,
    prompt: `Question ${nextId}?`,
    correct: "Right",
    wrong: ["Wrong A", "Wrong B", "Wrong C"],
    ...extra,
  };
}

describe("no duplicate prompts", () => {
  it("rejects a prompt that repeats one in another file, ignoring case and punctuation", () => {
    const first = question({ prompt: "Who played the Doctor in 2010?" });
    const again = question({ prompt: "who played the doctor in 2010" });
    const { errors } = checkContent([
      { path: "tv/friends.json", data: { title: "Friends", questions: [question(), first] } },
      { path: "movies/pixar.json", data: { title: "Pixar", questions: [again] } },
    ]);
    expect(errors).toEqual([
      {
        file: "movies/pixar.json",
        question: `${again.id} (question 1)`,
        message: "the prompt repeats the one in tv/friends.json, question 2",
      },
    ]);
  });

  it("rejects a prompt repeated in the same file", () => {
    const first = question({ prompt: "What's Ross's job?" });
    const again = question({ prompt: "Whats Ross’s   job!" });
    const { errors } = checkContent([
      { path: "tv/friends.json", data: { title: "Friends", questions: [first, again] } },
    ]);
    expect(errors).toEqual([
      {
        file: "tv/friends.json",
        question: `${again.id} (question 2)`,
        message: "the prompt repeats the one in tv/friends.json, question 1",
      },
    ]);
  });

  it("accepts prompts that differ by more than case and punctuation", () => {
    const { errors } = checkContent([
      {
        path: "tv/friends.json",
        data: { title: "Friends", questions: [question({ prompt: "What's Ross's job?" }), question({ prompt: "What's Rachel's job?" })] },
      },
    ]);
    expect(errors).toEqual([]);
  });
});

describe("the four answers are all different", () => {
  it("rejects a wrong answer that matches the right one, ignoring case and punctuation", () => {
    const repeated = question({ correct: "Ross", wrong: ["Joey", "ross.", "Chandler"] });
    const { errors } = checkContent([{ path: "tv/friends.json", data: { title: "Friends", questions: [repeated] } }]);
    expect(errors).toEqual([
      { file: "tv/friends.json", question: `${repeated.id} (question 1)`, message: 'the answers must all be different: "ross." repeats "Ross"' },
    ]);
  });

  it("rejects two wrong answers that match each other", () => {
    const repeated = question({ correct: "Ross", wrong: ["Joey", "Chandler", "JOEY"] });
    const { errors } = checkContent([{ path: "tv/friends.json", data: { title: "Friends", questions: [repeated] } }]);
    expect(errors).toEqual([
      { file: "tv/friends.json", question: `${repeated.id} (question 1)`, message: 'the answers must all be different: "JOEY" repeats "Joey"' },
    ]);
  });
});

describe("length limits", () => {
  it("accepts a prompt of exactly 120 characters and answers of exactly 40", () => {
    const atLimit = question({ prompt: `${"a".repeat(119)}?`, correct: "b".repeat(40) });
    expect(checkContent([{ path: "tv/friends.json", data: { title: "Friends", questions: [atLimit] } }]).errors).toEqual([]);
  });

  it("rejects a prompt over 120 characters", () => {
    const long = question({ prompt: `${"a".repeat(120)}?` });
    const { errors } = checkContent([{ path: "tv/friends.json", data: { title: "Friends", questions: [long] } }]);
    expect(errors).toEqual([
      { file: "tv/friends.json", question: `${long.id} (question 1)`, message: "the prompt is 121 characters, over the limit of 120" },
    ]);
  });

  it("rejects each answer over 40 characters, right or wrong", () => {
    const long = question({ correct: "c".repeat(41), wrong: ["Short", "w".repeat(45), "Fine"] });
    const { errors } = checkContent([{ path: "tv/friends.json", data: { title: "Friends", questions: [long] } }]);
    expect(errors.map((error) => error.message)).toEqual([
      `the answer "${"c".repeat(41)}" is 41 characters, over the limit of 40`,
      `the answer "${"w".repeat(45)}" is 45 characters, over the limit of 40`,
    ]);
  });

  it("counts an emoji or accented letter as one character", () => {
    const atLimit = question({ correct: `${"é".repeat(39)}🎬` });
    expect(checkContent([{ path: "tv/friends.json", data: { title: "Friends", questions: [atLimit] } }]).errors).toEqual([]);
  });
});
