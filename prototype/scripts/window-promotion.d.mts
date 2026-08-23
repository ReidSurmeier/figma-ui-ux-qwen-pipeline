export function promotionStatus(options: {
  windowId: string;
  correctionStatus: string;
  figmaSynced: boolean;
  fidelityStatus: string;
  benchmarkWindow: string;
}): "quality-benchmark" | "verified" | "figma-pending" | "revision-required";
