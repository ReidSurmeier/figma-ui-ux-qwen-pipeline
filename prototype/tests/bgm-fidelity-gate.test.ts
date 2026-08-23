import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  evaluateAgainstBgmBenchmark,
  loadBgmFidelityContract,
} from "../scripts/bgm-fidelity-gate.mjs";

describe("BGM and Effect canonical fidelity gate", () => {
  it("rejects a locally obvious defect even when whole-window average error looks acceptable", async () => {
    const contract = await loadBgmFidelityContract(resolve(".."));

    expect(contract.benchmarkWindow).toBe("options");
    expect(contract.requiredWindows).toHaveLength(15);
    expect(contract.qualityDimensions).toEqual(expect.arrayContaining([
      "source-relative-visual",
      "largest-local-defect",
      "complete-visual-ownership",
      "full-surface-hit-map",
      "reversible-interaction",
    ]));

    const verdict = evaluateAgainstBgmBenchmark({
      windowId: "card",
      normalizedMae: contract.visual.maximumNormalizedMae - 0.001,
      highErrorPixelRate: contract.visual.maximumHighErrorPixelRate - 0.001,
      largestHighErrorComponentRate: contract.visual.maximumLargestComponentRate + 0.001,
      controls: 4,
      controlsWithVisualAuthority: 4,
      hitMapFailures: 0,
      irreversibleInteractions: 0,
    }, contract);

    expect(verdict.status).toBe("revision-required");
    expect(verdict.failures).toContain("largest-local-defect");
  });

  it("does not preserve historical verified status for windows below BGM fidelity", async () => {
    const contract = await loadBgmFidelityContract(resolve(".."));
    const registry = JSON.parse(await readFile(resolve("..", "prototype/qa/window-verification.json"), "utf8")) as {
      windows: Array<{ id: string; status: string }>;
    };

    for (const id of contract.requiredWindows.filter((windowId) => windowId !== contract.benchmarkWindow)) {
      expect(registry.windows.find((window) => window.id === id)?.status).not.toBe("verified");
    }
  });
});
