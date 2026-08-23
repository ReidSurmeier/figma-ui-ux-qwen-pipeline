import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function findSpec(suites, file, title) {
  for (const suite of suites ?? []) {
    if (suite.title === file || suite.file?.endsWith(file)) {
      const spec = suite.specs?.find((candidate) => candidate.title === title);
      if (spec) return spec;
    }
    const nested = findSpec(suite.suites, file, title);
    if (nested) return nested;
  }
  return null;
}

export function semanticContractForControl(evaluations, windowId, label) {
  const matches = evaluations.filter((evaluation) => evaluation.windowId === windowId && (
    evaluation.controlLabels?.includes(label)
    || evaluation.controlLabelPatterns?.some((pattern) => new RegExp(pattern, "u").test(label))
  ));
  if (matches.length > 1) throw new Error(`Duplicate semantic interaction contract for ${windowId}::${label}`);
  return matches[0] ?? null;
}

export function evaluateSemanticInteractionContract(contract, evidence) {
  const spec = findSpec(evidence.playwrightReport?.suites, contract.test.file.split("/").at(-1), contract.test.title);
  const results = spec?.tests?.flatMap((test) => test.results ?? []) ?? [];
  const browserPassed = spec?.ok === true && results.some(({ status }) => status === "passed")
    && results.every(({ status }) => status === "passed" || status === "skipped");
  const testLocked = evidence.testFileSha256 === contract.test.sha256;
  const sourceLocked = evidence.sourceSha256 === contract.source.sha256;
  const behaviorApproved = !contract.behavior_authority
    || contract.behavior_authority.approval === "user-authorized-inferred";
  const executableEvidence = browserPassed && testLocked;
  const requirements = {
    realGesture: executableEvidence && /pointer|keyboard/.test(contract.gesture),
    expectedRegionChanged: executableEvidence && contract.expected_region_changes?.length > 0,
    invariantRegionsStable: executableEvidence && contract.invariant_regions?.length > 0,
    sourceApproved: sourceLocked && contract.source.approval === "immutable-user-owned-source" && behaviorApproved,
  };

  return {
    id: contract.id,
    windowId: contract.window_id,
    controlLabels: contract.control_labels,
    controlLabelPatterns: contract.control_label_patterns ?? [],
    test: contract.test,
    source: contract.source,
    browserPassed,
    testLocked,
    sourceLocked,
    behaviorAuthority: contract.behavior_authority ?? { approval: "source-visible" },
    behaviorApproved,
    requirements,
    passed: Object.values(requirements).every(Boolean),
  };
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const fileSha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

export function executeSemanticInteractionContracts({ contracts, prototypeDir, repoDir }) {
  if (contracts.length === 0) return { status: 0, report: { suites: [] }, evaluations: [], command: [] };
  const files = [...new Set(contracts.map(({ test }) => test.file))];
  const titles = [...new Set(contracts.map(({ test }) => test.title))];
  const grep = `(?:${titles.map(escapeRegex).join("|")})`;
  const executable = resolve(prototypeDir, "node_modules/.bin/playwright");
  const args = ["test", ...files, "--grep", grep, "--reporter=json"];
  const outcome = spawnSync(executable, args, {
    cwd: prototypeDir,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  let report = { suites: [] };
  try {
    report = JSON.parse(outcome.stdout || "{}");
  } catch {
    report = { suites: [] };
  }
  const evaluations = contracts.map((contract) => evaluateSemanticInteractionContract(contract, {
    playwrightReport: report,
    testFileSha256: fileSha256(resolve(prototypeDir, contract.test.file)),
    sourceSha256: fileSha256(resolve(repoDir, contract.source.path)),
  }));
  return {
    status: outcome.status ?? 1,
    error: outcome.stderr.trim(),
    report,
    evaluations,
    command: [executable, ...args],
  };
}
