export function promotionStatus({
  windowId,
  correctionStatus,
  figmaSynced,
  fidelityStatus,
  benchmarkWindow,
}) {
  if (correctionStatus !== "pass" || fidelityStatus !== "benchmark-pass") return "revision-required";
  if (!figmaSynced) return "figma-pending";
  return windowId === benchmarkWindow ? "quality-benchmark" : "verified";
}
