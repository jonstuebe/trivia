import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Random } from "../random/random";
import { assignQuestionIds } from "./ids";
import { readContentDir } from "./read";
import type { ContentError } from "./schema";

export interface AssignIdsInDirResult {
  /** Files that couldn't be read. When there are any, nothing is written. */
  errors: ContentError[];
  /** How many IDs were written. */
  assigned: number;
  /** The files that were rewritten, by path inside the content folder. */
  changedFiles: string[];
}

/**
 * Gives every Question in a content folder that lacks an ID a new one, and
 * writes it into its Topic file. For scripts and tests only: it uses Node's
 * file system. Only files that gained an ID are rewritten. If any file won't
 * parse, its IDs are unknown, so nothing is written rather than risk a clash.
 */
export async function assignQuestionIdsInDir(dir: string, random: Random): Promise<AssignIdsInDirResult> {
  const { files, unreadable } = await readContentDir(dir);
  if (unreadable.length > 0) return { errors: unreadable, assigned: 0, changedFiles: [] };

  const { changed, assigned } = assignQuestionIds(files, random);
  for (const file of changed) await writeFile(join(dir, file.path), `${formatJson(file.data)}\n`);
  return { errors: [], assigned, changedFiles: changed.map((file) => file.path) };
}

/**
 * JSON with two-space indents, the way Topic files are written by hand: an
 * array of plain values, like a Question's `wrong` answers, stays on one line.
 */
function formatJson(value: unknown, indent = ""): string {
  const inner = `${indent}  `;
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.every((item) => item === null || typeof item !== "object")) {
      return `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
    }
    return `[\n${value.map((item) => inner + formatJson(item, inner)).join(",\n")}\n${indent}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    const lines = entries.map(([key, item]) => `${inner}${JSON.stringify(key)}: ${formatJson(item, inner)}`);
    return `{\n${lines.join(",\n")}\n${indent}}`;
  }
  return JSON.stringify(value);
}
