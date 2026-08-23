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
      "interaction-animation-source-fit",
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

  it("rejects synthesized correction passes without prompt-specific executable evidence", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    for (const window of windowVerification.windows) {
      if (!window.correction_replay.report) continue;
      const report = JSON.parse(await readFile(resolve("..", window.correction_replay.report), "utf8")) as {
        results: Array<{ prompt_id: string; verdict: string; evidence?: Array<{ kind: string; artifact: string; metrics?: Record<string, unknown> }> }>;
      };
      for (const result of report.results.filter(({ verdict }) => verdict === "pass")) {
        expect(result.evidence, `${window.id}/${result.prompt_id} used a canned pass`).toBeDefined();
        expect(result.evidence?.length, `${window.id}/${result.prompt_id} has no executed evidence`).toBeGreaterThan(0);
        for (const item of result.evidence ?? []) {
          expect(item.kind.length).toBeGreaterThan(2);
          expect(item.artifact.length).toBeGreaterThan(4);
        }
      }
    }
  });

  it("requires independent generated minimize endpoints for every minimizable source window", async () => {
    const { readFile } = await import("node:fs/promises");
    const { createHash } = await import("node:crypto");
    const { resolve } = await import("node:path");
    const windowIds = ["basic-info", "status", "inventory", "equipment"];
    const hashes = await Promise.all(windowIds.map(async (id) => createHash("sha256")
      .update(await readFile(resolve("public/assets/japanese-rpg-v001", id, "minimized-plate.png")))
      .digest("hex")));
    expect(new Set(hashes).size).toBe(windowIds.length);
  });

  it("requires independent off and on assets for every source checkbox", async () => {
    const { access } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    for (const state of ["off", "on"]) {
      await expect(access(resolve("public/assets/japanese-rpg-v001/chat/components", `privacy-${state}.png`))).resolves.toBeUndefined();
    }
  });

  it("requires bounded Qwen provenance for independent Party member indicators", async () => {
    const { readFile } = await import("node:fs/promises");
    const { createHash } = await import("node:crypto");
    const { resolve } = await import("node:path");
    const selection = JSON.parse(await readFile(resolve("..", "artifacts/runs/japanese-party-member-states-v001-selection.json"), "utf8")) as {
      model: string;
      provider: string;
      states: Array<{ output: string; source_scale_region: number[] }>;
      assembly_outputs: string[];
      invariants: { text_generation_accepted: boolean };
    };

    expect(selection.model).toBe("qwen/qwen-image-3-pro");
    expect(selection.provider).toBe("alibaba");
    expect(selection.states.map(({ source_scale_region }) => source_scale_region)).toEqual([
      [3, 19, 18, 19],
      [3, 38, 18, 19],
    ]);
    expect(selection.invariants.text_generation_accepted).toBe(false);

    const hashes = await Promise.all(selection.states.map(async ({ output }) => createHash("sha256")
      .update(await readFile(resolve("..", output)))
      .digest("hex")));
    expect(new Set(hashes).size).toBe(2);

    expect(selection.assembly_outputs).toHaveLength(5);
    const rowHashes = await Promise.all(selection.assembly_outputs.map(async (output) => createHash("sha256")
      .update(await readFile(resolve("..", output)))
      .digest("hex")));
    expect(new Set(rowHashes).size).toBe(5);
  });

  it("fails closed on Qwen Skills copy without component-level Japanese and boundary evidence", async () => {
    const { access, readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const selection = JSON.parse(await readFile(resolve("..", "artifacts/runs/japanese-skills-scrolled-page-v001-selection.json"), "utf8")) as {
      model: string;
      provider: string;
      component_sources: Array<{ output: string; candidate: string; source_scale_region: number[] }>;
      exact_copy_review: Record<string, {
        status: string;
        evidence: string;
        boundary_clearance: { top: number; bottom: number };
      }>;
      rejected_components: Array<{ candidate: string; component: string; reason: string }>;
    };

    expect(selection.model).toBe("qwen/qwen-image-3-pro");
    expect(selection.provider).toBe("alibaba");
    expect(selection.component_sources).toHaveLength(12);
    expect(selection.component_sources.map(({ output }) => output)).toEqual(expect.arrayContaining(
      ["icon", "level", "copy"].flatMap((kind) => [0, 1, 2, 3].map((row) => `page-2-${kind}-${row}`)),
    ));
    expect(selection.component_sources
      .filter(({ output }) => output.startsWith("page-2-copy-"))
      .map(({ source_scale_region }) => source_scale_region)).toEqual([
        [104, 18, 141, 29],
        [104, 47, 141, 36],
        [104, 83, 141, 28],
        [104, 115, 141, 31],
      ]);
    expect(selection.component_sources.some(({ source_scale_region }) => source_scale_region[3] !== 36)).toBe(true);

    for (const review of Object.values(selection.exact_copy_review)) {
      expect(review.status).toBe("pass");
      expect(review.boundary_clearance.top).toBeGreaterThanOrEqual(1);
      expect(review.boundary_clearance.bottom).toBeGreaterThanOrEqual(1);
      await expect(access(resolve("..", review.evidence))).resolves.toBeUndefined();
    }

    expect(selection.rejected_components).toEqual(expect.arrayContaining([
      expect.objectContaining({
        candidate: "artifacts/runs/japanese-skills-scrolled-page-v001/image-01.png",
        component: "page-2-copy-3",
      }),
    ]));
  });

  it("keeps rejected Compact Info Qwen plates out of the runtime", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const selection = JSON.parse(await readFile(resolve("..", "artifacts/runs/japanese-compact-info-clean-plate-v002-selection.json"), "utf8")) as {
      model: string;
      provider: string;
      status: string;
      promoted_candidate: string | null;
      runtime_asset_changed: boolean;
      rejected_candidates: Array<{ candidates: number[]; reason: string }>;
    };

    expect(selection.model).toBe("qwen/qwen-image-3-pro");
    expect(selection.provider).toBe("alibaba");
    expect(selection.status).toBe("all-new-candidates-rejected");
    expect(selection.promoted_candidate).toBeNull();
    expect(selection.runtime_asset_changed).toBe(false);
    expect(selection.rejected_candidates).toHaveLength(2);
    expect(selection.rejected_candidates.every(({ candidates, reason }) => candidates.length === 4 && reason.length > 40)).toBe(true);
  });

  it("requires shared source-window minimize motion to expose more than four geometry steps", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const styles = await readFile(resolve("src/styles.css"), "utf8");
    expect(styles).toMatch(/\.source-window\s*\{[^}]*transition:\s*width 208ms steps\(13, end\), height 208ms steps\(13, end\)/s);
    expect(styles).toMatch(/\.basic-info-window\s*\{[^}]*transition:\s*width 208ms steps\(13, end\), height 208ms steps\(13, end\)/s);
  });
});
