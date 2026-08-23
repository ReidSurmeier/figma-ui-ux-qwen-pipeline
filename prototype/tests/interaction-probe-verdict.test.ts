import { describe, expect, it } from "vitest";

import { classifyInteractionProbe } from "../scripts/classify-interaction-probe.mjs";

describe("generic interaction probe verdicts", () => {
  it.each([
    { visualDown: true },
    { visualSettled: true },
    { stateChanged: true },
    { alreadySelected: true },
  ])("records $visualDown$visualSettled$stateChanged$alreadySelected as evidence without promoting it", (signals) => {
    const result = classifyInteractionProbe(signals);

    expect(result.activityObserved).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.classification).toBe("uncontracted-evidence");
  });

  it("passes only a complete source-approved semantic interaction contract", () => {
    const result = classifyInteractionProbe(
      { visualSettled: true, stateChanged: true },
      {
        realGesture: true,
        expectedRegionChanged: true,
        invariantRegionsStable: true,
        sourceApproved: true,
      },
    );

    expect(result.passed).toBe(true);
    expect(result.classification).toBe("contract-passed");
  });

  it.each([
    "realGesture",
    "expectedRegionChanged",
    "invariantRegionsStable",
    "sourceApproved",
  ] as const)("fails when the semantic contract is missing %s", (missing) => {
    const contract = {
      realGesture: true,
      expectedRegionChanged: true,
      invariantRegionsStable: true,
      sourceApproved: true,
      [missing]: false,
    };

    expect(classifyInteractionProbe({ visualSettled: true }, contract).passed).toBe(false);
  });

  it("keeps the correction runner on real gestures and free of the undefined verdict bug", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const runner = await readFile(resolve("scripts/run-correction-matrix.mjs"), "utf8");
    const desktopSuite = await readFile(resolve("e2e/full-desktop.spec.ts"), "utf8");

    expect(runner).not.toMatch(/if \(!passed\)/);
    expect(runner).not.toContain(".selectOption(");
    expect(runner).not.toContain(".fill(");
    expect(runner).not.toContain("button.click();");
    expect(runner).not.toContain('execFileSync("bash"');
    expect(runner).toContain('spawnSync("bash"');
    expect(runner).toContain("process.exitCode = 1");
    expect(desktopSuite).not.toContain("click({ force: true })");
    expect(desktopSuite).not.toContain("enabled control inventory contains no settled dead buttons");
  });
});
