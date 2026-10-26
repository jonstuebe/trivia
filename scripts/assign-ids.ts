/**
 * Gives every Question without an ID a short random one, written into its
 * Topic file. Existing IDs are never changed, a new one never matches any
 * other, and a second run changes nothing.
 *
 *   bun run assign-ids [--content <dir>]
 *
 * Defaults to `content/`. Write new Questions without an `id`, run this, then
 * run `bun run check-content` and commit the files with their new IDs.
 */
import { parseArgs } from "node:util";
import { createUnseededRandom } from "../src/random/random";
import { formatContentError, plural } from "../src/content/schema";
import { assignQuestionIdsInDir } from "../src/content/write-ids";

const { values } = parseArgs({
  options: {
    content: { type: "string", default: "content" },
  },
});

const { errors, assigned, changedFiles } = await assignQuestionIdsInDir(values.content, createUnseededRandom());

if (errors.length > 0) {
  for (const error of errors) console.error(formatContentError(error));
  console.error("\nNo IDs written: fix the files above first, so new IDs can be checked against theirs.");
  process.exit(1);
}

if (assigned === 0) {
  console.log("Every Question already has an ID. Nothing changed.");
} else {
  console.log(`Wrote ${plural(assigned, "new ID")} into ${changedFiles.join(", ")}.`);
}
