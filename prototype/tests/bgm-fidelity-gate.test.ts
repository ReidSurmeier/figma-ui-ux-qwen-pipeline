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

  it("permits verified siblings only after the BGM floor and correction replay pass", async () => {
    const contract = await loadBgmFidelityContract(resolve(".."));
    const registry = JSON.parse(await readFile(resolve("..", "prototype/qa/window-verification.json"), "utf8")) as {
      windows: Array<{
        id: string;
        status: string;
        deterministic_gates: string;
        correction_replay: { status: string };
        bgm_fidelity: { status: string };
      }>;
    };

    for (const id of contract.requiredWindows.filter((windowId) => windowId !== contract.benchmarkWindow)) {
      const window = registry.windows.find((entry) => entry.id === id);
      expect(window).toBeDefined();
      if (window?.status === "verified") {
        expect(window.deterministic_gates).toBe("pass");
        expect(window.correction_replay.status).toBe("pass");
        expect(window.bgm_fidelity.status).toBe("benchmark-pass");
      } else {
        expect(window?.status).toBe("revision-required");
      }
    }
  });
});
