import { describe, expect, it } from "vitest";

import taxonomy from "../qa/failure-taxonomy.json";
import correctionReplay from "../qa/correction-replay.json";
import windowVerification from "../qa/window-verification.json";

describe("autonomous reconstruction failure taxonomy", () => {
  it("turns every observed human correction into a machine-routable gate", () => {
    const required = [
      "reference-underlay",
      "background-contamination",
      "boundary-ring",
      "overcropped-window-edge",
      "text-overlap",
      "hit-map-overlap",
      "slider-endpoint-inset",
      "insufficient-motion-samples",
      "cropped-generated-state",
      "dead-control",
      "drag-cutoff",
      "figma-coordinate-drift",
      "runtime-figma-drift",
      "provider-model-drift",
    ];
    expect(taxonomy.failures.map(({ id }) => id)).toEqual(expect.arrayContaining(required));
    for (const failure of taxonomy.failures) {
      expect(failure.detectors.length).toBeGreaterThan(0);
      expect(failure.remediation).not.toHaveLength(0);
      expect(failure.acceptance_gate).not.toHaveLength(0);
      expect(["source", "asset", "runtime", "figma", "cross-layer"]).toContain(failure.authority);
    }
  });
});

describe("human-correction replay after deterministic verification", () => {
  it("preserves every recurring correction as a scoped exploratory prompt", () => {
    const required = [
      "no-reference-underlay",
      "independent-elements",
      "preserve-japanese-source-style",
      "no-pink-donor-pixels",
      "pixel-rounded-window-edges",
      "checkbox-anchor-and-stray-pixel",
      "checkbox-label-overlap",
      "title-placement-and-white-box",
      "generated-minimize-endpoint",
      "tab-boundary-mapping",
      "slider-full-endpoint-and-grey-block",
      "continuous-motion-not-four-frames",
      "settled-button-effects",
      "drag-cutoff-and-z-order",
      "text-overlap-and-pixel-aesthetic",
      "figma-link-and-page-parity",
      "complete-user-flow-not-screenshot-only",
    ];
    expect(correctionReplay.prompts.map(({ id }) => id)).toEqual(expect.arrayContaining(required));
    for (const prompt of correctionReplay.prompts) {
      expect(prompt.source_correction).not.toHaveLength(0);
      expect(prompt.review_prompt).not.toHaveLength(0);
      expect(prompt.applies_to.length).toBeGreaterThan(0);
      expect(prompt.required_evidence.length).toBeGreaterThan(0);
      expect(prompt.promotion_rule).toContain("reproducible");
    }
  });

  it("never calls a window verified before the correction replay is green", () => {
    for (const window of windowVerification.windows.filter(({ status }) => status === "verified")) {
      expect(window.deterministic_gates).toBe("pass");
      expect(window.correction_replay.status).toBe("pass");
      expect(window.correction_replay.report).toMatch(/\.json$/);
    }
  });

  it("invalidates verification when a newly recorded applicable correction is absent from its report", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    for (const window of windowVerification.windows.filter(({ status }) => status === "verified")) {
      const report = JSON.parse(await readFile(resolve("..", window.correction_replay.report), "utf8")) as { results: Array<{ prompt_id: string }> };
      const present = new Set(report.results.map(({ prompt_id }) => prompt_id));
      const required = correctionReplay.prompts
        .filter(({ applies_to }) => applies_to.includes("*") || applies_to.includes(window.id))
        .map(({ id }) => id);
      expect([...present]).toEqual(expect.arrayContaining(required));
    }
  });

  it("requires every promoted replay finding to have a pass or explicit non-applicable verdict", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    for (const window of windowVerification.windows.filter(({ status }) => status === "verified")) {
      const report = JSON.parse(await readFile(resolve("..", window.correction_replay.report), "utf8")) as {
        overall: string;
        evidence: string[];
        results: Array<{ verdict: string; note: string }>;
      };
      expect(report.overall).toBe("pass");
      expect(report.evidence).toEqual(expect.arrayContaining([
        "artifacts/qa/figma-desktop-current.png",
        "artifacts/qa/figma-desktop-audit-v001.json",
      ]));
      for (const result of report.results) {
        expect(["pass", "not-applicable"]).toContain(result.verdict);
        expect(result.note.length).toBeGreaterThan(20);
      }
    }
  });
});
