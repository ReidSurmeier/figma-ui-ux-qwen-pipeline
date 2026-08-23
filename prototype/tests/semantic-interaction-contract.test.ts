import { describe, expect, it } from "vitest";

import { evaluateSemanticInteractionContract, semanticContractForControl } from "../scripts/semantic-interaction-contract.mjs";

const contract = {
  id: "bottom-bar-real-drag",
  window_id: "bottom-bar",
  control_labels: ["クイックスロット位置"],
  test: {
    file: "e2e/remaining-source-windows.spec.ts",
    title: "Bottom Bar slider owns its complete visible thumb and reaches both endpoints by drag",
    sha256: "test-sha",
  },
  source: {
    path: "benchmarks/japanese-rpg-options-v001/reference.png",
    sha256: "source-sha",
    approval: "immutable-user-owned-source",
  },
  gesture: "pointer-drag",
  expected_region_changes: [{ component_id: "bottom-bar-thumb" }],
  invariant_regions: [{ component_ids: ["bottom-bar-title-text", "bottom-bar-previous", "bottom-bar-next"] }],
};

const passedReport = {
  suites: [{
    title: "remaining-source-windows.spec.ts",
    specs: [{ title: contract.test.title, ok: true, tests: [{ results: [{ status: "passed" }] }] }],
  }],
};

describe("semantic interaction contracts", () => {
  it("matches one locked semantic contract to a dynamic control-label family", () => {
    const dynamic = {
      windowId: "inventory",
      controlLabels: [],
      controlLabelPatterns: ["^item item \\d+$"],
      passed: true,
    };
    expect(semanticContractForControl([dynamic], "inventory", "item item 21")).toBe(dynamic);
    expect(semanticContractForControl([dynamic], "inventory", "equip item 1")).toBeNull();
    expect(semanticContractForControl([dynamic], "status", "item item 21")).toBeNull();
  });

  it("derives all classifier requirements only from locked passing evidence", () => {
    expect(evaluateSemanticInteractionContract(contract, {
      playwrightReport: passedReport,
      testFileSha256: "test-sha",
      sourceSha256: "source-sha",
    }).requirements).toEqual({
      realGesture: true,
      expectedRegionChanged: true,
      invariantRegionsStable: true,
      sourceApproved: true,
    });
  });

  it.each([
    ["changed test code", { testFileSha256: "changed" }],
    ["changed source", { sourceSha256: "changed" }],
    ["failed browser test", { playwrightReport: { suites: [] } }],
  ])("fails closed for %s", (_name, override) => {
    const evaluation = evaluateSemanticInteractionContract(contract, {
      playwrightReport: passedReport,
      testFileSha256: "test-sha",
      sourceSha256: "source-sha",
      ...override,
    });
    expect(Object.values(evaluation.requirements).every(Boolean)).toBe(false);
    expect(evaluation.passed).toBe(false);
  });

  it("accepts a source-locked interaction whose unseen behavior is explicitly user-authorized", () => {
    const inferred = {
      ...contract,
      behavior_authority: {
        approval: "user-authorized-inferred",
        scope: ["map destination"],
      },
    };
    expect(evaluateSemanticInteractionContract(inferred, {
      playwrightReport: passedReport,
      testFileSha256: "test-sha",
      sourceSha256: "source-sha",
    }).requirements.sourceApproved).toBe(true);
  });

  it("rejects an inferred behavior without a recognized user-authorization label", () => {
    const inferred = {
      ...contract,
      behavior_authority: {
        approval: "model-inferred",
        scope: ["map destination"],
      },
    };
    expect(evaluateSemanticInteractionContract(inferred, {
      playwrightReport: passedReport,
      testFileSha256: "test-sha",
      sourceSha256: "source-sha",
    }).requirements.sourceApproved).toBe(false);
  });
});
