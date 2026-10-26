import type { E2EConfig } from "e2e";
import { chromium } from "./tests/support/engine";

/**
 * The e2e journeys (`tests/*.e2e.ts`): exact steps only, so there is no
 * agent, no model and no API key. Chromium only, against the fixture build
 * that `bun run build:fixtures` puts in dist-fixtures/.
 */

export default {
  targets: [
    {
      name: "chromium",
      engine: chromium,
      app: {
        // Port 0: the runner picks a free port and fills in {port}.
        url: "http://127.0.0.1:0",
        command: {
          executable: "bun",
          // `--mode fixtures` makes vite preview serve dist-fixtures/.
          args: ["x", "vite", "preview", "--mode", "fixtures", "--host", "127.0.0.1", "--port", "{port}", "--strictPort"],
          log: ".e2e/logs/app.log",
        },
      },
    },
  ],
  // No `agents` key: every step is exact, and an `agent` call would fail.
  reporters: ["list", "junit"],
} satisfies E2EConfig;
