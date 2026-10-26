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
