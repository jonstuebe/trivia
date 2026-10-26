import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { checkContent, type ContentCheckResult, type ContentFile } from "./check";
import type { ContentError } from "./schema";

/**
 * Reads every Topic file in a content folder from disk and checks them.
 * For build scripts and tests only: it uses Node's file system, so app code
 * imports the generated topic index instead. Hidden files are skipped; any
 * other file in the wrong place is reported. Throws if the folder is missing.
 */
export async function checkContentDir(dir: string): Promise<ContentCheckResult> {
  const { files, unreadable } = await readContentDir(dir);
  const result = checkContent(files);
  return { index: result.index, errors: [...unreadable, ...result.errors] };
}

/**
 * Reads every file in a content folder, in path order, without checking them.
 * A file that isn't JSON by name comes back with no data, for the check to
 * report; one that won't parse is in `unreadable`. Hidden files are skipped.
 */
export async function readContentDir(dir: string): Promise<{ files: ContentFile[]; unreadable: ContentError[] }> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  const paths = entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join("/"))
    .filter((path) => !path.split("/").some((part) => part.startsWith(".")))
    .sort();

  const files: ContentFile[] = [];
  const unreadable: ContentError[] = [];
  for (const path of paths) {
    if (!path.endsWith(".json")) {
      // Not a Topic file path, so checkContent reports it.
      files.push({ path, data: undefined });
      continue;
    }
    try {
      files.push({ path, data: JSON.parse(await readFile(join(dir, path), "utf8")) });
    } catch (error) {
      unreadable.push({ file: path, message: `not valid JSON: ${(error as Error).message}` });
    }
  }
  return { files, unreadable };
}
