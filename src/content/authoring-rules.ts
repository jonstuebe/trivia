import type { ContentError, TopicFile } from "./schema";

/**
 * The Question authoring rules that fail the build (issue #9, "Build
 * checks"), run on Topic files that already passed the schema.
 */

/** A Topic file that passed the schema, with its path inside the content folder. */
export interface CheckedTopic {
  path: string;
  topic: TopicFile;
}

/** Checks the authoring rules across every Topic file, in the order given. */
export function checkAuthoringRules(topics: readonly CheckedTopic[]): ContentError[] {
  const errors: ContentError[] = [];
  const firstPrompt = new Map<string, string>();

  for (const { path, topic } of topics) {
    topic.questions.forEach(({ id, prompt, correct, wrong }, i) => {
      const fail = (message: string) => errors.push({ file: path, question: `${id} (question ${i + 1})`, message });

      const key = normalize(prompt);
      const earlier = firstPrompt.get(key);
      if (earlier) fail(`the prompt repeats the one in ${earlier}`);
      else firstPrompt.set(key, `${path}, question ${i + 1}`);

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
function characters(text: string): number {
  let count = 0;
  for (const _ of graphemes.segment(text)) count++;
  return count;
}

/** Lowercase, with punctuation and symbols dropped and spaces collapsed. */
function normalize(text: string): string {
  return text
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
