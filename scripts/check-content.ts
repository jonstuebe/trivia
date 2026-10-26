/**
 * The content check: checks every Topic file in the content folder and writes
 * the topic index the app imports. Any error fails it, naming the file and
 * the Question, and leaves the index as it was.
 *
 *   bun run check-content [--content <dir>] [--out <file>]
 *
 * Defaults to `content/` and `src/content/topic-index.gen.json`. Run it after
 * changing a Topic file and commit the index with it; CI fails if it's stale.
 */
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { checkContentDir } from "../src/content/read";
import { formatContentError } from "../src/content/schema";

const { values } = parseArgs({
  options: {
    content: { type: "string", default: "content" },
    out: { type: "string", default: "src/content/topic-index.gen.json" },
  },
});

const { index, errors } = await checkContentDir(values.content);

if (errors.length > 0) {
  for (const error of errors) console.error(formatContentError(error));
  console.error(`\nContent check failed: ${errors.length} error${errors.length === 1 ? "" : "s"}.`);
  process.exit(1);
}

await writeFile(values.out, `${JSON.stringify(index, null, 2)}\n`);
const titles = index.tv.length + index.movies.length;
console.log(`Content check passed. Wrote ${values.out} (${titles} Title${titles === 1 ? "" : "s"}${index.general ? " and General" : ""}).`);
