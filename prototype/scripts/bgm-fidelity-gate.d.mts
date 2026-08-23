export type BgmFidelityContract = {
  benchmarkWindow: string;
  requiredWindows: string[];
  qualityDimensions: string[];
  visual: {
    maximumNormalizedMae: number;
    maximumHighErrorPixelRate: number;
    maximumLargestComponentRate: number;
  };
  interaction: {
    minimumVisualAuthorityCoverage: number;
    maximumHitMapFailures: number;
    maximumIrreversibleInteractions: number;
  };
};

export type BgmFidelityMetrics = {
  windowId: string;
  normalizedMae: number;
  highErrorPixelRate: number;
  largestHighErrorComponentRate: number;
  controls: number;
  controlsWithVisualAuthority: number;
  hitMapFailures: number;
  irreversibleInteractions: number | null;
  visualGeometryMismatches?: number;
};

export function loadBgmFidelityContract(repoDir: string): Promise<BgmFidelityContract>;
export function evaluateAgainstBgmBenchmark(
  metrics: BgmFidelityMetrics,
  contract: BgmFidelityContract,
): {
  windowId: string;
  status: "benchmark-pass" | "revision-required";
  failures: string[];
  metrics: BgmFidelityMetrics & { visualAuthorityCoverage: number };
};

export function runBgmFidelityGate(options: {
  repoDir: string;
  url?: string;
  outputPath?: string;
}): Promise<Record<string, unknown>>;
