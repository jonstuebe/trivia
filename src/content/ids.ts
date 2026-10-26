import type { Random } from "../random/random";
import type { ContentFile } from "./types";

/**
 * Gives every Question without an ID a short random one (issue #3, "Question
 * IDs"). An ID is written once and never changed after, so a Seen question
 * stays seen across content edits. A new ID never matches one already in any
 * Topic file, and a run with nothing to fill in changes nothing.
 */

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const ID_LENGTH = 8;

export interface AssignIdsResult {
  /** Only the files that gained an ID, with their new contents. Empty when every Question has one. */
  changed: ContentFile[];
  /** How many IDs were given out. */
  assigned: number;
}

type QuestionData = Record<string, unknown>;

/**
 * Fills in the missing IDs across every Topic file in the content folder.
 * Pass all the files, so new IDs can't collide with any existing one. Files
 * not shaped like a Topic file are left alone for the content check to report.
 */
export function assignQuestionIds(files: readonly ContentFile[], random: Random): AssignIdsResult {
  const taken = new Set<unknown>(files.flatMap((file) => questionsOf(file).map((question) => question.id)));
  const changed: ContentFile[] = [];
  let assigned = 0;

  for (const file of files) {
    const questions = questionsOf(file);
    if (!questions.some(lacksId)) continue;
    const filled = (file.data as { questions: unknown[] }).questions.map((question) => {
      if (!isQuestion(question) || !lacksId(question)) return question;
      assigned++;
      // The ID goes first, as in the file format's example.
      return { id: unusedId(taken, random), ...question };
    });
    changed.push({ path: file.path, data: { ...(file.data as object), questions: filled } });
  }

  return { changed, assigned };
}

/** The file's Questions that are objects, or none if it has no Questions list. */
function questionsOf(file: ContentFile): QuestionData[] {
  const questions = (file.data as { questions?: unknown } | null | undefined)?.questions;
  return Array.isArray(questions) ? questions.filter(isQuestion) : [];
}

function isQuestion(value: unknown): value is QuestionData {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function lacksId(question: QuestionData): boolean {
  return !("id" in question);
}

function unusedId(taken: Set<unknown>, random: Random): string {
  let id = newId(random);
  while (taken.has(id)) id = newId(random);
  taken.add(id);
  return id;
}

function newId(random: Random): string {
  let id = "";
  for (let i = 0; i < ID_LENGTH; i++) id += ID_ALPHABET[Math.floor(random.next() * ID_ALPHABET.length)];
  return id;
}
