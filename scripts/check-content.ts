/**
 * The content check: checks every Topic file in the content folder and writes
 * the topic index the app imports. Any error fails it, naming the file and
 * the Question, and leaves the index as it was.
 *
 * Every run, pass or fail, first prints the report of Questions per Tier (and
 * per Subject for General) and any warnings, for the files that passed the
 * schema. Warnings never fail the check.
 *
 *   bun run check-content [--content <dir>] [--out <file>]
 *
 * Defaults to `content/` and `src/content/topic-index.gen.json`. Run it after
 * changing a Topic file and commit the index with it; CI fails if it's stale.
 */
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { checkContent } from "../src/content/check";
import { readContentDir } from "../src/content/read";
import { formatReport, reportContent } from "../src/content/report";
import { formatContentError, plural } from "../src/content/schema";

const { values } = parseArgs({
  options: {
    content: { type: "string", default: "content" },
    out: { type: "string", default: "src/content/topic-index.gen.json" },
  },
});

const { files, unreadable } = await readContentDir(values.content);
const checked = checkContent(files);
const { index } = checked;
const errors = [...unreadable, ...checked.errors];

console.log(`${formatReport(reportContent(files))}\n`);

if (errors.length > 0) {
  for (const error of errors) console.error(formatContentError(error));
  console.error(`\nContent check failed: ${plural(errors.length, "error")}.`);
  process.exit(1);
}

await writeFile(values.out, `${JSON.stringify(index, null, 2)}\n`);
const titles = index.tv.length + index.movies.length;
console.log(`Content check passed. Wrote ${values.out} (${plural(titles, "Title")}${index.general ? " and General" : ""}).`);
