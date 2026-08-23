export type InteractionSignals = Partial<{
  visualDown: boolean;
  visualSettled: boolean;
  stateChanged: boolean;
  alreadySelected: boolean;
}>;

export type SemanticInteractionContract = {
  realGesture: boolean;
  expectedRegionChanged: boolean;
  invariantRegionsStable: boolean;
  sourceApproved: boolean;
};

export type InteractionProbeClassification = {
  activityObserved: boolean;
  passed: boolean;
  classification: "uncontracted-evidence" | "contract-passed" | "contract-failed";
  missingRequirements: string[];
};

export function classifyInteractionProbe(
  signals: InteractionSignals,
  contract?: SemanticInteractionContract | null,
): InteractionProbeClassification;
