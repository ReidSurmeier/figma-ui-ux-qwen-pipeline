const semanticRequirements = [
  "realGesture",
  "expectedRegionChanged",
  "invariantRegionsStable",
  "sourceApproved",
];

export function classifyInteractionProbe(signals, contract = null) {
  const activityObserved = Boolean(
    signals.visualDown
    || signals.visualSettled
    || signals.stateChanged
    || signals.alreadySelected,
  );

  if (!contract) {
    return {
      activityObserved,
      passed: false,
      classification: "uncontracted-evidence",
      missingRequirements: semanticRequirements,
    };
  }

  const missingRequirements = semanticRequirements.filter((requirement) => contract[requirement] !== true);
  const passed = activityObserved && missingRequirements.length === 0;
  return {
    activityObserved,
    passed,
    classification: passed ? "contract-passed" : "contract-failed",
    missingRequirements,
  };
}
