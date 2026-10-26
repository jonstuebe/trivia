import { describeQuestion, type ContentError } from "./schema";
import type { CheckedTopic } from "./types";

/**
 * The Question authoring rules that fail the build, run on Topic files that
 * already passed the schema.
 */

/** Checks the authoring rules across every Topic file, in the order given. */
export function checkAuthoringRules(topics: readonly CheckedTopic[]): ContentError[] {
  const errors: ContentError[] = [];
  const firstPrompt = new Map<string, string>();

  for (const { path, topic } of topics) {
    const title = topic.category === "general" ? null : topic.title;
    const namesTitle = title === null ? null : wholePhrase(title);

    topic.questions.forEach(({ id, prompt, correct, wrong }, i) => {
      const position = i + 1;
      const fail = (message: string) => errors.push({ file: path, question: { id, position }, message });

      const key = normalize(prompt);
      const earlier = firstPrompt.get(key);
      if (earlier) fail(`the prompt repeats the one in ${earlier}`);
      else firstPrompt.set(key, `${path}, ${describeQuestion({ position })}`);

      if (namesTitle?.test(prompt)) fail(`the prompt names its own Title, "${title}"`);

      const promptLength = characters(prompt);
      if (promptLength > MAX_PROMPT) fail(`the prompt is ${promptLength} characters, over the limit of ${MAX_PROMPT}`);

      const seenAnswers = new Map<string, string>();
      for (const answer of [correct, ...wrong]) {
        const length = characters(answer);
        if (length > MAX_ANSWER) fail(`the answer "${answer}" is ${length} characters, over the limit of ${MAX_ANSWER}`);

        const same = seenAnswers.get(normalize(answer));
        if (same !== undefined) fail(`the answers must all be different: "${answer}" repeats "${same}"`);
        else seenAnswers.set(normalize(answer), answer);
      }
    });
  }

  return errors;
}

/** The longest a prompt may be, in characters. */
export const MAX_PROMPT = 120;
/** The longest any answer may be, in characters. */
export const MAX_ANSWER = 40;

const graphemes = new Intl.Segmenter("en", { granularity: "grapheme" });

/** Characters as a player sees them, so an emoji or accented letter counts as one. */
export function characters(text: string): number {
  let count = 0;
  for (const _ of graphemes.segment(text)) count++;
  return count;
}

/**
 * Matches `phrase` as whole words, with the same capitals: a Title's name is
 * a proper noun, so "friends" in ordinary lowercase prose isn't the Title.
 */
function wholePhrase(phrase: string): RegExp {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u");
}

/** Lowercase, with punctuation and symbols dropped and spaces collapsed. */
function normalize(text: string): string {
  return text
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
