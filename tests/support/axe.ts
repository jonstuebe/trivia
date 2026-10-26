import { appendFileSync } from "node:fs";
import type { Browser } from "@e2e-dev/web";
import { expect } from "e2e";
import { triageAxeFindings, type AxeFinding } from "./axe-triage";

/**
 * Runs axe on the screen as it is now. Serious and critical violations fail
 * the journey; minor and moderate ones are printed as warnings, and added to
 * the GitHub job summary in CI. Call it after every screen change a journey
 * makes, and with each dialog or Lifeline result showing.
 *
 * axe-core is injected into every page by `initScripts` in e2e.config.ts.
 */
export async function checkA11y(browser: Browser, screenName: string): Promise<void> {
  const findings = await browser.evaluate<AxeFinding[]>(async () => {
    type AxeResult = {
      violations: {
        id: string;
        impact?: AxeFinding["impact"];
        help: string;
        helpUrl: string;
        nodes: { target: unknown[] }[];
      }[];
    };
    const axe = (window as unknown as { axe?: { run: (ctx: Document, opts: object) => Promise<AxeResult> } }).axe;
    if (!axe) throw new Error("axe-core is not loaded: check initScripts in e2e.config.ts");
    const result = await axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
    });
    return result.violations.map((v) => ({
      id: v.id,
      impact: v.impact ?? null,
      help: v.help,
      helpUrl: v.helpUrl,
      targets: v.nodes.map((n) => n.target.map(String).join(" ")),
    }));
  });

  const { failures, warnings } = triageAxeFindings(screenName, findings);
  for (const line of warnings) {
    console.warn(`axe warning on ${line}`);
    const summary = process.env.GITHUB_STEP_SUMMARY;
    if (summary) appendFileSync(summary, `- axe warning on ${line}\n`);
  }
  expect(failures, `serious or critical axe violations on ${screenName}`).toEqual([]);
}
