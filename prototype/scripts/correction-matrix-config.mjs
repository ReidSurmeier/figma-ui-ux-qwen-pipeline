import { resolve } from "node:path";

export function correctionMatrixOutputConfig({ repoDir, prototypeDir, env = process.env }) {
  if (env.CORRECTION_MATRIX_RUN_ROOT) {
    const runRoot = resolve(repoDir, env.CORRECTION_MATRIX_RUN_ROOT);
    return {
      evidenceRoot: resolve(runRoot, "correction-matrix-v003"),
      reportRoot: resolve(runRoot, "reports"),
      registryOutputPath: resolve(runRoot, "window-verification.json"),
    };
  }

  return {
    evidenceRoot: resolve(repoDir, "artifacts/qa/correction-matrix-v003"),
    reportRoot: resolve(repoDir, "artifacts/qa"),
    registryOutputPath: resolve(prototypeDir, "qa/window-verification.json"),
  };
}

export function selectedCorrectionMatrixWindows(windows, requestedIds) {
  if (!requestedIds?.trim()) return windows;
  const ids = [...new Set(requestedIds.split(",").map((id) => id.trim()).filter(Boolean))];
  const byId = new Map(windows.map((window) => [window.id, window]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length) throw new Error(`Unknown correction-matrix windows: ${missing.join(", ")}`);
  return ids.map((id) => byId.get(id));
}
