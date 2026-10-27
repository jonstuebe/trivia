/**
 * The real build is what deploys, so none of the test build's switches may
 * be in it (see `src/test-build-switches.ts`). Checks the real build in
 * `dist/` has none, and the test build in `dist-fixtures/` has every one, so
 * a renamed switch fails here instead of passing unseen.
 *
 *   bun run check-real-build [--real <dir>] [--test <dir>]
 *
 * Run it after `bun run build` and `bun run build:fixtures`.
 */
import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { parseArgs } from "node:util";
import { checkBuilds, type BuiltFile } from "../src/test-build-switches";

const { values } = parseArgs({
  options: {
    real: { type: "string", default: "dist" },
    test: { type: "string", default: "dist-fixtures" },
  },
});

async function readBuild(dir: string): Promise<BuiltFile[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  const files: BuiltFile[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const full = join(entry.parentPath, entry.name);
    files.push({ path: relative(dir, full).split(sep).join("/"), text: await readFile(full, "latin1") });
  }
  return files;
}

const { inRealBuild, missingFromTestBuild } = checkBuilds({
  real: await readBuild(values.real),
  test: await readBuild(values.test),
});

for (const { path, value } of inRealBuild) {
  console.error(`::error::A test-build switch is in the real build: "${value}" in ${values.real}/${path}`);
}
for (const value of missingFromTestBuild) {
  console.error(
    `::error::The test build in ${values.test}/ has no "${value}": the switch was renamed or moved, so this check can't see it.`,
  );
}
if (inRealBuild.length > 0 || missingFromTestBuild.length > 0) process.exit(1);
console.log(`The real build has none of the test build's switches, and the test build has them all.`);
