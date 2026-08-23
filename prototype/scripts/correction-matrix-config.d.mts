export interface CorrectionMatrixOutputConfigOptions {
  repoDir: string;
  prototypeDir: string;
  env?: Record<string, string | undefined>;
}

export interface CorrectionMatrixOutputConfig {
  evidenceRoot: string;
  reportRoot: string;
  registryOutputPath: string;
}

export function correctionMatrixOutputConfig(
  options: CorrectionMatrixOutputConfigOptions,
): CorrectionMatrixOutputConfig;

export function selectedCorrectionMatrixWindows<T extends { id: string }>(
  windows: T[],
  requestedIds?: string,
): T[];
