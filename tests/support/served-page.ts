import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "vite";

const root = join(import.meta.dirname, "../..");

/**
 * `index.html` as the app's Vite config serves it in dev, with every
 * plugin's tags added, for unit tests of what the page's `<head>` carries.
 * Give the calling test a 30-second timeout: starting Vite is slow.
 */
export async function servedIndexHtml(): Promise<string> {
  const server = await createServer({
    root,
    configFile: join(root, "vite.config.ts"),
    logLevel: "silent",
    appType: "custom",
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  });
  try {
    return await server.transformIndexHtml("/", readFileSync(join(root, "index.html"), "utf8"));
  } finally {
    await server.close();
  }
}
