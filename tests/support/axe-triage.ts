/** One axe violation, reduced to plain data so it can leave the page. */
export interface AxeFinding {
  id: string;
  impact: "minor" | "moderate" | "serious" | "critical" | null;
  help: string;
  helpUrl: string;
  /** A CSS selector per offending node. */
  targets: string[];
}

/**
 * Splits axe's findings on one screen into what fails the journey (serious
 * and critical) and what is only reported as a warning (minor, moderate, and
 * anything axe gives no impact), each as a readable line.
 */
export function triageAxeFindings(
  screenName: string,
  findings: readonly AxeFinding[],
): { failures: string[]; warnings: string[] } {
  const failures: string[] = [];
  const warnings: string[] = [];
  for (const f of findings) {
    const line = `${screenName}: [${f.impact ?? "unknown"}] ${f.id}: ${f.help} (${f.targets.join(", ")})`;
    if (f.impact === "serious" || f.impact === "critical") failures.push(line);
    else warnings.push(`${line} ${f.helpUrl}`);
  }
  return { failures, warnings };
}
