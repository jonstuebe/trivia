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
        question: { id: again.id, position: 1 },
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
        question: { id: again.id, position: 2 },
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
      { file: "tv/friends.json", question: { id: repeated.id, position: 1 }, message: 'the answers must all be different: "ross." repeats "Ross"' },
    ]);
  });

  it("rejects two wrong answers that match each other", () => {
    const repeated = question({ correct: "Ross", wrong: ["Joey", "Chandler", "JOEY"] });
    const { errors } = checkContent([{ path: "tv/friends.json", data: { title: "Friends", questions: [repeated] } }]);
    expect(errors).toEqual([
      { file: "tv/friends.json", question: { id: repeated.id, position: 1 }, message: 'the answers must all be different: "JOEY" repeats "Joey"' },
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
      { file: "tv/friends.json", question: { id: long.id, position: 1 }, message: "the prompt is 121 characters, over the limit of 120" },
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

describe("no Title name in a TV or Movies prompt", () => {
  it("rejects a prompt that names its own Title", () => {
    const named = question({ prompt: "In the first Star Wars film, who is Luke's father?" });
    const { errors } = checkContent([{ path: "movies/star-wars.json", data: { title: "Star Wars", questions: [named] } }]);
    expect(errors).toEqual([
      { file: "movies/star-wars.json", question: { id: named.id, position: 1 }, message: 'the prompt names its own Title, "Star Wars"' },
    ]);
  });

  it("rejects the Title name followed by punctuation, like a possessive", () => {
    const named = question({ prompt: "Who sings the Friends' theme song?" });
    const { errors } = checkContent([{ path: "tv/friends.json", data: { title: "Friends", questions: [named] } }]);
    expect(errors.map((error) => error.message)).toEqual(['the prompt names its own Title, "Friends"']);
  });

  it("accepts the Title's words used as ordinary lowercase words", () => {
    const ordinary = question({ prompt: "Which of Ross's friends was a chef?" });
    expect(checkContent([{ path: "tv/friends.json", data: { title: "Friends", questions: [ordinary] } }]).errors).toEqual([]);
  });

  it("accepts the Title name inside a longer word", () => {
    const longer = question({ prompt: "Who are Woody's Pixarian friends?" });
    expect(checkContent([{ path: "movies/pixar.json", data: { title: "Pixar", questions: [longer] } }]).errors).toEqual([]);
  });

  it("accepts a General prompt that names any Title", () => {
    const general = question({ prompt: "Which year did Friends first air?", subject: "pop culture" });
    expect(checkContent([{ path: "general.json", data: { questions: [general] } }]).errors).toEqual([]);
  });
});
