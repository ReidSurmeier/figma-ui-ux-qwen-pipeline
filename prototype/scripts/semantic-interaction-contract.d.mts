export interface SemanticContractEvidence {
  playwrightReport: unknown;
  testFileSha256: string;
  sourceSha256: string;
}

export interface SemanticContractEvaluation {
  id: string;
  windowId: string;
  controlLabels: string[];
  browserPassed: boolean;
  testLocked: boolean;
  sourceLocked: boolean;
  requirements: {
    realGesture: boolean;
    expectedRegionChanged: boolean;
    invariantRegionsStable: boolean;
    sourceApproved: boolean;
  };
  passed: boolean;
}

export function evaluateSemanticInteractionContract(
  contract: Record<string, any>,
  evidence: SemanticContractEvidence,
): SemanticContractEvaluation;

export function executeSemanticInteractionContracts(options: {
  contracts: Array<Record<string, any>>;
  prototypeDir: string;
  repoDir: string;
}): {
  status: number;
  error?: string;
  report: unknown;
  evaluations: SemanticContractEvaluation[];
  command: string[];
};
