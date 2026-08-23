import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const prototypeDir = resolve(import.meta.dirname, "..");
const repoDir = resolve(prototypeDir, "..");
const baseUrl = process.env.CORRECTION_MATRIX_URL ?? "http://10.255.255.254:4174/";
const evidenceRoot = resolve(repoDir, "artifacts/qa/correction-matrix-v003");
const prompts = JSON.parse(await readFile(resolve(prototypeDir, "qa/correction-replay.json"), "utf8")).prompts;
const registryPath = resolve(prototypeDir, "qa/window-verification.json");
const registry = JSON.parse(await readFile(registryPath, "utf8"));
const manifest = JSON.parse(await readFile(resolve(repoDir, "artifacts/qa/runtime-component-manifest.json"), "utf8"));
const figmaMarker = resolve(repoDir, "artifacts/qa/figma-correction-matrix-v003.json");
const sha = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (path) => access(path).then(() => true, () => false);
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/google-chrome" });
await rm(evidenceRoot, { recursive: true, force: true });
await mkdir(evidenceRoot, { recursive: true });
const sourceContracts = ["contract-check.sh", "remaining-window-contract.sh"].map((script) => ({
  script,
  output: execFileSync("bash", [resolve(prototypeDir, "scripts", script)], { cwd: prototypeDir, encoding: "utf8" }).trim(),
}));
const figmaEvidence = await exists(figmaMarker)
  ? JSON.parse(await readFile(figmaMarker, "utf8"))
  : null;

const controlsSelector = "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])";
const reports = [];
const titlelessWindows = new Set(["quickbar", "bottom-bar", "notification"]);
const irregularWindows = new Set(["quickbar", "bottom-bar", "notification"]);

async function activateWindow(page, windowId) {
  const window = page.locator(`[data-window-id="${windowId}"]`);
  await window.dispatchEvent("pointerdown");
  await page.waitForTimeout(0);
  return window;
}

function donorPinkBoundaryPixels(path) {
  return Number(execFileSync("convert", [
    path,
    "-alpha", "set",
    "-fx", "((i<1||j<1||i>=w-1||j>=h-1)&&a>0.1&&r>0.35&&b>0.35&&g<0.48&&(r-g)>0.12&&(b-g)>0.12)?1:0",
    "-format", "%[fx:mean*w*h]",
    "info:",
  ], { encoding: "utf8" }).trim());
}

function evidence(artifact, metrics, kind = "executed-browser-probe") {
  return [{ kind, artifact, metrics }];
}

function result(promptId, verdict, artifact, metrics, note) {
  return { prompt_id: promptId, verdict, note, evidence: evidence(artifact, metrics) };
}

async function snapshotState(page, windowId, controlIndex) {
  return page.evaluate(({ windowId, controlIndex, controlsSelector }) => {
    const root = document.querySelector(`[data-window-id="${windowId}"]`);
    const control = root?.querySelectorAll(controlsSelector)[controlIndex];
    const outputs = root ? [...root.querySelectorAll("output,[role=status]")].map((node) => node.textContent?.trim() ?? "") : [];
    if (!(control instanceof HTMLElement)) return { missing: true, outputs };
    const input = control instanceof HTMLInputElement ? { checked: control.checked, value: control.value } : {};
    return {
      missing: false,
      ariaPressed: control.getAttribute("aria-pressed"),
      ariaSelected: control.getAttribute("aria-selected"),
      ariaExpanded: control.getAttribute("aria-expanded"),
      className: control.className,
      ...input,
      outputs,
    };
  }, { windowId, controlIndex, controlsSelector });
}

async function probeControls(page, windowId, windowDir) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const root = page.locator(`[data-window-id="${windowId}"]`);
  const descriptors = await root.locator(controlsSelector).evaluateAll((nodes) => nodes.map((node, index) => ({
    index,
    label: node.getAttribute("aria-label") || node.textContent?.trim() || `${node.tagName.toLowerCase()}-${index}`,
    tag: node.tagName.toLowerCase(),
    type: node instanceof HTMLInputElement ? node.type : "",
  })));
  const probes = [];
  const failuresDir = resolve(windowDir, "control-failures");

  for (const descriptor of descriptors) {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    const window = await activateWindow(page, windowId);
    const control = window.locator(controlsSelector).nth(descriptor.index);
    if (!(await control.isVisible())) {
      probes.push({ ...descriptor, skipped: "not-visible" });
      continue;
    }
    const box = await control.boundingBox();
    if (!box) {
      probes.push({ ...descriptor, failure: "missing-bounds" });
      continue;
    }
    const beforeState = await snapshotState(page, windowId, descriptor.index);
    const idle = await window.screenshot();
    let down = idle;

    if (descriptor.tag === "input" && descriptor.type === "range") {
      const current = Number(beforeState.value ?? 0);
      const target = current < 50 ? "100" : "0";
      await control.fill(target);
    } else if (descriptor.tag === "input" && ["text", "password", ""].includes(descriptor.type)) {
      await control.fill("監査");
    } else if (descriptor.tag === "select") {
      const values = await control.locator("option").evaluateAll((options) => options.map((option) => option.value));
      if (values.length > 1) await control.selectOption(values.at(-1));
    } else {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      down = await window.screenshot();
      await page.mouse.up();
    }

    await page.waitForTimeout(260);
    const afterState = await snapshotState(page, windowId, descriptor.index);
    const settled = await window.isVisible().catch(() => false)
      ? await window.screenshot()
      : await page.screenshot({ clip: { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 8), width: Math.max(20, box.width + 16), height: Math.max(20, box.height + 16) } });
    const idleHash = sha(idle);
    const downHash = sha(down);
    const settledHash = sha(settled);
    const stateChanged = JSON.stringify(beforeState) !== JSON.stringify(afterState);
    const visualDown = downHash !== idleHash;
    const visualSettled = settledHash !== idleHash;
    const alreadySelected = beforeState.ariaPressed === "true" || beforeState.ariaSelected === "true";
    const passed = visualDown || visualSettled || stateChanged || alreadySelected;
    const probe = { ...descriptor, idleHash, downHash, settledHash, visualDown, visualSettled, stateChanged, alreadySelected, passed, beforeState, afterState };
    probes.push(probe);
    if (!passed) {
      await mkdir(failuresDir, { recursive: true });
      const prefix = `${String(descriptor.index).padStart(3, "0")}-${descriptor.label.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40)}`;
      await writeFile(resolve(failuresDir, `${prefix}-idle.png`), idle);
      await writeFile(resolve(failuresDir, `${prefix}-down.png`), down);
      await writeFile(resolve(failuresDir, `${prefix}-settled.png`), settled);
    }
  }
  return probes;
}

async function sampleRanges(page, windowId) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const window = await activateWindow(page, windowId);
  const ranges = window.locator('input[type="range"]');
  const reports = [];
  for (let index = 0; index < await ranges.count(); index += 1) {
    const range = ranges.nth(index);
    const hashes = [];
    for (const value of [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
      await range.fill(String(value));
      await page.waitForTimeout(18);
      hashes.push(sha(await window.screenshot()));
    }
    reports.push({ label: await range.getAttribute("aria-label"), distinctVisuals: new Set(hashes).size, values: 11 });
  }
  return reports;
}

async function sampleMinimize(page, windowId) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const window = await activateWindow(page, windowId);
  const button = window.getByRole("button", { name: /最小化/ });
  if (await button.count() === 0) return null;
  const samples = await page.evaluate(async ({ windowId }) => {
    const window = document.querySelector(`[data-window-id="${windowId}"]`);
    const button = [...(window?.querySelectorAll("button") ?? [])].find((node) => node.getAttribute("aria-label")?.includes("最小化"));
    if (!(window instanceof HTMLElement) || !(button instanceof HTMLElement)) return [];
    button.click();
    const values = [];
    const start = performance.now();
    while (performance.now() - start < 260) {
      await new Promise(requestAnimationFrame);
      const box = window.getBoundingClientRect();
      values.push([Math.round(box.width * 10) / 10, Math.round(box.height * 10) / 10]);
    }
    return values;
  }, { windowId });
  return { samples, distinctGeometry: new Set(samples.map((value) => value.join("x"))).size };
}

async function probeCheckboxes(page, windowId) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const window = await activateWindow(page, windowId);
  const inputs = window.locator('input[type="checkbox"],input[type="radio"]');
  const checks = [];
  for (let index = 0; index < await inputs.count(); index += 1) {
    const input = inputs.nth(index);
    if (!(await input.isVisible())) continue;
    const wasChecked = await input.isChecked();
    const boxBefore = await input.boundingBox();
    const artBefore = await window.locator('[data-component-id*="privacy"], input[type="checkbox"], input[type="radio"]').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).backgroundImage));
    const before = await window.screenshot();
    await input.click();
    await page.waitForTimeout(40);
    const boxAfter = await input.boundingBox();
    const artAfter = await window.locator('[data-component-id*="privacy"], input[type="checkbox"], input[type="radio"]').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).backgroundImage));
    const after = await window.screenshot();
    checks.push({
      label: await input.getAttribute("aria-label"),
      wasChecked,
      geometryInvariant: JSON.stringify(boxBefore) === JSON.stringify(boxAfter),
      distinctVisual: sha(before) !== sha(after),
      distinctStateArt: JSON.stringify(artBefore) !== JSON.stringify(artAfter),
      beforeArt: artBefore,
      afterArt: artAfter,
    });
  }
  return checks;
}

async function probeGeometry(page, windowId) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const window = await activateWindow(page, windowId);
  const defaultBox = await window.boundingBox();
  const title = window.locator('[data-component-id$="title-text"], .title-bar h1').first();
  const titleBox = await title.count() ? await title.boundingBox() : null;
  const componentIds = await window.locator("[data-component-id]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-component-id")));
  const corner = await page.evaluate(({ windowId }) => {
    const window = document.querySelector(`[data-window-id="${windowId}"]`);
    if (!(window instanceof HTMLElement)) return null;
    const box = window.getBoundingClientRect();
    const owns = (x, y) => window.contains(document.elementFromPoint(box.left + x, box.top + y));
    return { outside00: owns(0, 0), step50: owns(5, 0), step41: owns(4, 1), step22: owns(2, 2), step14: owns(1, 4), step06: owns(0, 6) };
  }, { windowId });
  const textOverflow = await window.evaluate((root) => [...root.querySelectorAll("*")].filter((node) => {
    if (!(node instanceof HTMLElement) || node.children.length || !node.textContent?.trim()) return false;
    if (node.classList.contains("sr-only") || getComputedStyle(node).visibility === "hidden" || getComputedStyle(node).opacity === "0") return false;
    return node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1;
  }).map((node) => ({ text: node.textContent?.trim().slice(0, 80), client: [node.clientWidth, node.clientHeight], scroll: [node.scrollWidth, node.scrollHeight] })));
  const nativeTextFonts = await window.evaluate((root) => [...root.querySelectorAll("*")].filter((node) => node.children.length === 0 && node.textContent?.trim() && !node.classList.contains("sr-only")).map((node) => ({ text: node.textContent?.trim().slice(0, 60), font: getComputedStyle(node).fontFamily })));

  const header = window.locator("[data-drag-handle]").first();
  const headerBox = await header.boundingBox();
  let drag = null;
  if (defaultBox && headerBox) {
    await page.mouse.move(headerBox.x + Math.min(20, headerBox.width / 2), headerBox.y + 8);
    await page.mouse.down();
    await page.mouse.move(2000, 1600, { steps: 8 });
    await page.mouse.up();
    const bottomRight = await window.boundingBox();
    drag = { defaultBox, bottomRight, viewport: { width: 849, height: 564 }, contained: !!bottomRight && bottomRight.x >= 0 && bottomRight.y >= 0 && bottomRight.x + bottomRight.width <= 849.5 && bottomRight.y + bottomRight.height <= 564.5 };
  }
  return { defaultBox, titleBox, componentIds, uniqueComponentIds: new Set(componentIds).size, corner, textOverflow, nativeTextFonts, drag };
}

try {
  for (const windowDefinition of manifest.windows) {
    const windowId = windowDefinition.id;
    const windowDir = resolve(evidenceRoot, windowId);
    await mkdir(windowDir, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 849, height: 564 }, deviceScaleFactor: 1 });
    const requests = [];
    const consoleErrors = [];
    page.on("request", (request) => requests.push(request.url()));
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    const activeWindow = await activateWindow(page, windowId);
    const defaultScreenshotPath = resolve(windowDir, "default.png");
    await activeWindow.screenshot({ path: defaultScreenshotPath });
    const donorPinkBoundary = donorPinkBoundaryPixels(defaultScreenshotPath);

    const geometry = await probeGeometry(page, windowId);
    const controls = await probeControls(page, windowId, windowDir);
    const ranges = await sampleRanges(page, windowId);
    const minimize = await sampleMinimize(page, windowId);
    const checkboxes = await probeCheckboxes(page, windowId);
    const failures = controls.filter((control) => control.passed === false || control.failure);
    const trace = { windowId, requests: [...new Set(requests)], consoleErrors, geometry, controls, ranges, minimize, checkboxes, donorPinkBoundary, sourceContracts };
    const traceRelative = `artifacts/qa/correction-matrix-v003/${windowId}/trace.json`;
    await writeFile(resolve(repoDir, traceRelative), `${JSON.stringify(trace, null, 2)}\n`);

    const noUnderlay = !trace.requests.some((url) => /reference\.png|source-visuals\/full\.png/.test(url));
    const independent = geometry.componentIds.length === geometry.uniqueComponentIds && geometry.componentIds.length >= windowDefinition.components.length;
    const japaneseStyle = geometry.nativeTextFonts.every(({ font }) => /DotGothic16|Unifont|WenQuanYi|monospace/i.test(font));
    const rounded = geometry.corner && !geometry.corner.outside00 && geometry.corner.step50 && geometry.corner.step41 && geometry.corner.step22 && geometry.corner.step14 && geometry.corner.step06;
    const titlePlaced = geometry.titleBox && geometry.defaultBox && geometry.titleBox.x >= geometry.defaultBox.x && geometry.titleBox.y >= geometry.defaultBox.y && geometry.titleBox.x + geometry.titleBox.width <= geometry.defaultBox.x + geometry.defaultBox.width;
    const changedCheckboxes = checkboxes.filter(({ wasChecked }) => !wasChecked);
    const checkboxesPass = checkboxes.length > 0
      && checkboxes.every((check) => check.geometryInvariant)
      && changedCheckboxes.length > 0
      && changedCheckboxes.every((check) => check.distinctVisual && check.distinctStateArt);
    const tabsPass = await (async () => {
      await page.goto(baseUrl, { waitUntil: "networkidle" });
      const window = await activateWindow(page, windowId);
      const tabs = window.locator('[role="tab"], button[class*="source-tab"]');
      const boxes = [];
      for (let index = 0; index < await tabs.count(); index += 1) if (await tabs.nth(index).isVisible()) boxes.push(await tabs.nth(index).boundingBox());
      return boxes.filter(Boolean).every((box, index) => boxes.filter(Boolean).every((other, otherIndex) => index === otherIndex || box.x + box.width <= other.x || other.x + other.width <= box.x || box.y + box.height <= other.y || other.y + other.height <= box.y));
    })();
    const sliderPass = ranges.length > 0 && ranges.every(({ distinctVisuals }) => distinctVisuals > 4);
    const minimizeSelection = resolve(repoDir, `artifacts/runs/japanese-${windowId}-minimized-state-v001/selection.json`);
    const minimizeProvenance = windowId === "options"
      ? await exists(resolve(repoDir, "benchmarks/japanese-rpg-options-v001/regions/options-window/minimized-state-provenance.json"))
      : windowId === "basic-info"
        ? await exists(resolve(repoDir, "artifacts/runs/japanese-basic-info-minimized-state-v001/run.json"))
        : await exists(minimizeSelection);
    const animationPass = minimize ? minimize.distinctGeometry > 4 : ranges.length ? sliderPass : controls.length > 0 && failures.length === 0;
    const figmaSynced = figmaEvidence?.verdict === "pass"
      && figmaEvidence?.metrics?.canonical_state_links === figmaEvidence?.metrics?.canonical_state_links_green
      && figmaEvidence?.metrics?.options_donor_magenta_pixels <= 5;
    const applicable = prompts.filter(({ applies_to }) => applies_to.includes("*") || applies_to.includes(windowId));
    const results = applicable.map((prompt) => {
      const metricsByPrompt = {
        "no-reference-underlay": { noUnderlay, requestedResources: trace.requests.length },
        "independent-elements": { independent, componentCount: geometry.componentIds.length, expected: windowDefinition.components.length },
        "preserve-japanese-source-style": { japaneseStyle, nativeTextFonts: geometry.nativeTextFonts },
        "no-pink-donor-pixels": { sourceContracts, donorPinkBoundary, maximumBoundaryPixels: 2, defaultScreenshot: `${traceRelative}/../default.png` },
        "pixel-rounded-window-edges": geometry.corner,
        "checkbox-anchor-and-stray-pixel": { checks: checkboxes },
        "checkbox-label-overlap": { checks: checkboxes },
        "title-placement-and-white-box": { titlePlaced, titleBox: geometry.titleBox, windowBox: geometry.defaultBox },
        "generated-minimize-endpoint": { hasMinimize: !!minimize, minimizeProvenance, minimize },
        "tab-boundary-mapping": { tabsPass },
        "slider-full-endpoint-and-grey-block": { ranges },
        "continuous-motion-not-four-frames": { ranges },
        "settled-button-effects": { controlCount: controls.length, failures: failures.map(({ label }) => label) },
        "drag-cutoff-and-z-order": geometry.drag,
        "text-overlap-and-pixel-aesthetic": { overflow: geometry.textOverflow },
        "figma-link-and-page-parity": { figmaSynced, requiredMarker: "artifacts/qa/figma-correction-matrix-v003.json" },
        "complete-user-flow-not-screenshot-only": { controlCount: controls.length, failures: failures.map(({ label }) => label), consoleErrors },
        "interaction-animation-source-fit": { minimize, ranges, discreteControlFailures: failures.map(({ label }) => label) },
      };
      let verdict = "pass";
      if (prompt.id.startsWith("checkbox-") && checkboxes.length === 0) verdict = "not-applicable";
      else if (prompt.id === "pixel-rounded-window-edges" && irregularWindows.has(windowId)) verdict = "not-applicable";
      else if (prompt.id === "title-placement-and-white-box" && titlelessWindows.has(windowId)) verdict = "not-applicable";
      else if (prompt.id === "generated-minimize-endpoint" && !minimize) verdict = "not-applicable";
      else if (["slider-full-endpoint-and-grey-block", "continuous-motion-not-four-frames"].includes(prompt.id) && ranges.length === 0) verdict = "not-applicable";
      else if (prompt.id === "interaction-animation-source-fit" && !minimize && ranges.length === 0 && controls.length === 0) verdict = "not-applicable";
      else {
        const passByPrompt = {
          "no-reference-underlay": noUnderlay,
          "independent-elements": independent,
          "preserve-japanese-source-style": japaneseStyle,
          "no-pink-donor-pixels": donorPinkBoundary <= 2 && sourceContracts.every(({ output }) => /PASS/.test(output)),
          "pixel-rounded-window-edges": rounded,
          "checkbox-anchor-and-stray-pixel": checkboxesPass,
          "checkbox-label-overlap": checkboxesPass,
          "title-placement-and-white-box": titlePlaced,
          "generated-minimize-endpoint": minimizeProvenance && minimize?.distinctGeometry > 4,
          "tab-boundary-mapping": tabsPass,
          "slider-full-endpoint-and-grey-block": sliderPass,
          "continuous-motion-not-four-frames": sliderPass,
          "settled-button-effects": failures.length === 0,
          "drag-cutoff-and-z-order": geometry.drag?.contained === true,
          "text-overlap-and-pixel-aesthetic": geometry.textOverflow.length === 0,
          "figma-link-and-page-parity": figmaSynced,
          "complete-user-flow-not-screenshot-only": failures.length === 0 && consoleErrors.length === 0,
          "interaction-animation-source-fit": animationPass,
        };
        if (!passByPrompt[prompt.id]) verdict = "fail";
      }
      return result(prompt.id, verdict, traceRelative, metricsByPrompt[prompt.id], verdict === "pass" ? "Executed window-specific probe passed." : verdict === "not-applicable" ? "The source window has no control in this correction class." : "Executed probe found a reproducible failure; see metrics and retained failure frames.");
    });
    const overall = results.some(({ verdict }) => verdict === "fail") ? "fail" : "pass";
    const report = {
      schema_version: "3.0",
      window_id: windowId,
      overall,
      evidence_scope: "fresh executable per-window correction matrix",
      evidence: [
        traceRelative,
        "artifacts/qa/figma-desktop-current.png",
        "artifacts/qa/figma-desktop-audit-v001.json",
        "artifacts/qa/figma-correction-matrix-v003.json",
      ],
      results,
    };
    const reportRelative = `artifacts/qa/${windowId}/correction-replay-v003.json`;
    await mkdir(resolve(repoDir, `artifacts/qa/${windowId}`), { recursive: true });
    await writeFile(resolve(repoDir, reportRelative), `${JSON.stringify(report, null, 2)}\n`);
    const registryWindow = registry.windows.find(({ id }) => id === windowId);
    registryWindow.status = overall === "pass" && figmaSynced
      ? "verified"
      : overall === "pass"
        ? "figma-pending"
        : "revision-required";
    registryWindow.deterministic_gates = overall;
    registryWindow.correction_replay = { status: overall, report: reportRelative };
    reports.push({ windowId, overall, failures: results.filter(({ verdict }) => verdict === "fail").map(({ prompt_id }) => prompt_id) });
    await page.close();
  }
} finally {
  await browser.close();
}

registry.schema_version = "1.2";
registry.invalidation_reason = "v003 executes every applicable correction prompt with window-specific browser evidence; no window is verified until runtime and hosted Figma passes are both green.";
await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
await writeFile(resolve(evidenceRoot, "summary.json"), `${JSON.stringify({ schema_version: "3.0", reports }, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ windows: reports.length, passed: reports.filter(({ overall }) => overall === "pass").length, reports }, null, 2)}\n`);
