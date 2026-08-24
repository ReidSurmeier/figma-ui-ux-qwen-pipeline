import { describe, expect, it } from "vitest";

import { correctionMatrixOutputConfig, registeredCorrectionMatrixWindows, selectedCorrectionMatrixWindows } from "../scripts/correction-matrix-config.mjs";

describe("correction matrix output isolation", () => {
  const repoDir = "/workspace/repo";
  const prototypeDir = "/workspace/repo/prototype";

  it("keeps the explicit production replay paths backwards compatible", () => {
    expect(correctionMatrixOutputConfig({ repoDir, prototypeDir, env: {} })).toEqual({
      evidenceRoot: "/workspace/repo/artifacts/qa/correction-matrix-v003",
      reportRoot: "/workspace/repo/artifacts/qa",
      registryOutputPath: "/workspace/repo/prototype/qa/window-verification.json",
    });
  });

  it("places every mutable output under an isolated run root", () => {
    expect(correctionMatrixOutputConfig({
      repoDir,
      prototypeDir,
      env: { CORRECTION_MATRIX_RUN_ROOT: "/tmp/japanese-ui-audit" },
    })).toEqual({
      evidenceRoot: "/tmp/japanese-ui-audit/correction-matrix-v003",
      reportRoot: "/tmp/japanese-ui-audit/reports",
      registryOutputPath: "/tmp/japanese-ui-audit/window-verification.json",
    });
  });
});

describe("correction matrix window selection", () => {
  const windows = [{ id: "card" }, { id: "skills" }, { id: "options" }];

  it("keeps the full manifest by default", () => {
    expect(selectedCorrectionMatrixWindows(windows)).toBe(windows);
  });

  it("runs an explicit fast subset in requested order", () => {
    expect(selectedCorrectionMatrixWindows(windows, "options, card,options")).toEqual([
      { id: "options" },
      { id: "card" },
    ]);
  });

  it("fails closed for unknown window ids", () => {
    expect(() => selectedCorrectionMatrixWindows(windows, "card,missing")).toThrow("Unknown correction-matrix windows: missing");
  });

  it("keeps inferred hidden destinations out of the source-window replay", () => {
    expect(registeredCorrectionMatrixWindows(
      [...windows, { id: "map" }],
      windows,
    )).toEqual(windows);
  });
});
