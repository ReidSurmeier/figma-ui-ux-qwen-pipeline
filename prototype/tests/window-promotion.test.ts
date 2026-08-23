import { describe, expect, it } from "vitest";

import { promotionStatus } from "../scripts/window-promotion.mjs";

describe("window promotion through the BGM fidelity floor", () => {
  it("cannot promote a correction-green window that is below BGM fidelity", () => {
    expect(promotionStatus({
      windowId: "card",
      correctionStatus: "pass",
      figmaSynced: true,
      fidelityStatus: "revision-required",
      benchmarkWindow: "options",
    })).toBe("revision-required");
  });

  it("retains Options as the named benchmark and promotes only a complete sibling", () => {
    expect(promotionStatus({
      windowId: "options",
      correctionStatus: "pass",
      figmaSynced: true,
      fidelityStatus: "benchmark-pass",
      benchmarkWindow: "options",
    })).toBe("quality-benchmark");

    expect(promotionStatus({
      windowId: "card",
      correctionStatus: "pass",
      figmaSynced: true,
      fidelityStatus: "benchmark-pass",
      benchmarkWindow: "options",
    })).toBe("verified");
  });
});
