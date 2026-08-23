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
});
