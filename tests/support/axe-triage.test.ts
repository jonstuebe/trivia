import { describe, expect, it } from "vitest";
import { triageAxeFindings, type AxeFinding } from "./axe-triage";

function finding(id: string, impact: AxeFinding["impact"]): AxeFinding {
  return {
    id,
    impact,
    help: `${id} help`,
    helpUrl: `https://dequeuniversity.com/rules/axe/4.14/${id}`,
    targets: ["main > button"],
  };
}

describe("triageAxeFindings", () => {
  it("fails on serious and critical findings and warns on minor and moderate ones", () => {
    const { failures, warnings } = triageAxeFindings("Main menu", [
      finding("color-contrast", "serious"),
      finding("region", "moderate"),
      finding("button-name", "critical"),
      finding("landmark-unique", "minor"),
    ]);

    expect(failures).toEqual([
      "Main menu: [serious] color-contrast: color-contrast help (main > button)",
      "Main menu: [critical] button-name: button-name help (main > button)",
    ]);
    expect(warnings).toEqual([
      "Main menu: [moderate] region: region help (main > button) https://dequeuniversity.com/rules/axe/4.14/region",
      "Main menu: [minor] landmark-unique: landmark-unique help (main > button) https://dequeuniversity.com/rules/axe/4.14/landmark-unique",
    ]);
  });

  it("warns on a finding axe gives no impact, rather than dropping it", () => {
    const { failures, warnings } = triageAxeFindings("Main menu", [finding("odd-rule", null)]);

    expect(failures).toEqual([]);
    expect(warnings).toEqual([
      "Main menu: [unknown] odd-rule: odd-rule help (main > button) https://dequeuniversity.com/rules/axe/4.14/odd-rule",
    ]);
  });

  it("finds nothing to report on a clean page", () => {
    expect(triageAxeFindings("Main menu", [])).toEqual({ failures: [], warnings: [] });
  });
});
