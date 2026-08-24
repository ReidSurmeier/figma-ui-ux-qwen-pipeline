import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

import { captureRuntimeComponentManifest } from "./capture-component-manifest.mjs";

export async function loadBgmFidelityContract(repoDir) {
  return JSON.parse(await readFile(resolve(repoDir, "prototype/qa/bgm-fidelity-contract.json"), "utf8"));
}

export function evaluateAgainstBgmBenchmark(metrics, contract) {
  const failures = [];
  if (metrics.normalizedMae > contract.visual.maximumNormalizedMae) failures.push("source-relative-visual");
  if (metrics.highErrorPixelRate > contract.visual.maximumHighErrorPixelRate) failures.push("high-error-pixel-rate");
  if (metrics.largestHighErrorComponentRate > contract.visual.maximumLargestComponentRate) failures.push("largest-local-defect");

  const visualAuthorityCoverage = metrics.controls === 0
    ? 1
    : metrics.controlsWithVisualAuthority / metrics.controls;
  if (visualAuthorityCoverage < contract.interaction.minimumVisualAuthorityCoverage) failures.push("complete-visual-ownership");
  if (metrics.hitMapFailures > contract.interaction.maximumHitMapFailures) failures.push("full-surface-hit-map");
  if (!Number.isInteger(metrics.irreversibleInteractions)
    || metrics.irreversibleInteractions > contract.interaction.maximumIrreversibleInteractions) failures.push("reversible-interaction");
  if ((metrics.visualGeometryMismatches ?? 0) > 0) failures.push("visual-control-geometry");

  return {
    windowId: metrics.windowId,
    status: failures.length === 0 ? "benchmark-pass" : "revision-required",
    failures,
    metrics: { ...metrics, visualAuthorityCoverage },
  };
}

function runImageMagick(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (result.error) throw result.error;
  return output;
}

function normalizedMae(referencePath, actualPath) {
  const output = runImageMagick("compare", ["-metric", "MAE", referencePath, actualPath, "null:"]);
  const match = output.match(/\(([^)]+)\)/);
  if (!match) throw new Error(`ImageMagick did not return normalized MAE: ${output}`);
  return Number(match[1]);
}

function highErrorPixels(referencePath, actualPath, fuzzPercent) {
  const output = runImageMagick("compare", ["-metric", "AE", "-fuzz", `${fuzzPercent}%`, referencePath, actualPath, "null:"]);
  const value = Number(output.match(/\d+(?:\.\d+)?/)?.[0]);
  if (!Number.isFinite(value)) throw new Error(`ImageMagick did not return absolute error: ${output}`);
  return value;
}

function largestHighErrorComponent(referencePath, actualPath, fuzzPercent) {
  const output = runImageMagick("convert", [
    referencePath,
    actualPath,
    "-compose", "difference",
    "-composite",
    "-colorspace", "gray",
    "-threshold", `${fuzzPercent}%`,
    "-define", "connected-components:verbose=true",
    "-connected-components", "8",
    "null:",
  ]);
  return output.split("\n").reduce((largest, line) => {
    if (!/gray(?:a)?\(255(?:,1)?\)/.test(line)) return largest;
    const match = line.match(/^\s*\d+:\s+\S+\s+\S+\s+(\d+)\s+/);
    return match ? Math.max(largest, Number(match[1])) : largest;
  }, 0);
}

function visualGeometryMismatches(window) {
  const components = new Map(window.components.map((component) => [component.id, component]));
  const tolerance = 2.01;
  return window.controls.flatMap((control) => {
    const component = components.get(control.visualComponent);
    if (!component) return [];
    const visual = component.geometry;
    const hit = control.geometry;
    const contained = visual.x >= hit.x - tolerance
      && visual.y >= hit.y - tolerance
      && visual.x + visual.width <= hit.x + hit.width + tolerance
      && visual.y + visual.height <= hit.y + hit.height + tolerance;
    return contained ? [] : [{ control: control.id, visualComponent: control.visualComponent, hit, visual }];
  });
}

async function stableScreenshot(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const urls = [...document.querySelectorAll("*")].flatMap((node) => {
      const styles = [getComputedStyle(node), getComputedStyle(node, "::before"), getComputedStyle(node, "::after")];
      return styles.flatMap((style) => [...style.backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g)].map((match) => match[1]));
    });
    await Promise.all([...new Set(urls)].map((url) => new Promise((resolveImage) => {
      const image = new Image();
      image.onload = image.onerror = resolveImage;
      image.src = url;
      if (image.complete) resolveImage();
    })));
  });

  let previous = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await page.evaluate(() => new Promise((resolveFrame) => requestAnimationFrame(resolveFrame)));
    const current = await page.screenshot();
    if (previous?.equals(current)) return current;
    previous = current;
  }
  throw new Error("The desktop did not produce two consecutive identical frames");
}

async function captureHitMap(page) {
  return page.locator("[data-window-id]").evaluateAll((windows) => windows.map((window) => {
    const owner = window.getAttribute("data-window-id");
    const ownedRoots = [...document.querySelectorAll(`[data-control-owner="${CSS.escape(owner)}"]`)];
    const controls = [
      ...window.querySelectorAll("button, input, [role=tab], [role=option]"),
      ...ownedRoots.flatMap((root) => [...root.querySelectorAll("button, input, [role=tab], [role=option]")]),
    ].filter((node) => {
      const bounds = node.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0 && !node.matches(":disabled");
    });
    const failures = [];
    for (const control of controls) {
      const bounds = control.getBoundingClientRect();
      const visible = { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom };
      for (let ancestor = control.parentElement; ancestor && ancestor !== document.documentElement; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (![style.overflow, style.overflowX, style.overflowY].some((value) => ["hidden", "scroll", "auto", "clip"].includes(value))) continue;
        const clip = ancestor.getBoundingClientRect();
        visible.left = Math.max(visible.left, clip.left);
        visible.top = Math.max(visible.top, clip.top);
        visible.right = Math.min(visible.right, clip.right);
        visible.bottom = Math.min(visible.bottom, clip.bottom);
      }
      if (visible.left >= visible.right || visible.top >= visible.bottom) continue;
      const width = visible.right - visible.left;
      const height = visible.bottom - visible.top;
      const xs = [visible.left + width * 0.25, visible.left + width * 0.5, visible.left + width * 0.75];
      const ys = [visible.top + height * 0.25, visible.top + height * 0.5, visible.top + height * 0.75];
      for (const x of xs) for (const y of ys) {
        const hit = document.elementFromPoint(x, y);
        const associatedLabelOwnsHit = hit?.closest("label")?.control === control;
        if (!hit || (hit !== control && !control.contains(hit) && !associatedLabelOwnsHit)) {
          failures.push({
            control: control.getAttribute("aria-label") || control.textContent?.trim() || control.tagName,
            point: { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 },
            received: hit?.getAttribute("aria-label") || hit?.className || hit?.tagName || null,
          });
        }
      }
    }
    return { windowId: owner, failures };
  }));
}

export async function runBgmFidelityGate({
  repoDir,
  url = process.env.BGM_FIDELITY_URL ?? "http://10.255.255.254:4174/",
  outputPath = resolve(repoDir, "artifacts/qa/bgm-fidelity-gate-v001/report.json"),
} = {}) {
  const contract = await loadBgmFidelityContract(repoDir);
  const windowRegistry = JSON.parse(await readFile(resolve(repoDir, "benchmarks/japanese-rpg-options-v001/windows.json"), "utf8"));
  const interactionAuthority = JSON.parse(await readFile(resolve(repoDir, "prototype/qa/bgm-fidelity-interactions.json"), "utf8"));
  const referencePath = resolve(repoDir, contract.sourceAuthority);
  const evidenceDir = dirname(outputPath);
  const workDir = await mkdtemp(resolve(tmpdir(), "bgm-fidelity-"));
  await mkdir(evidenceDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/google-chrome" });
  try {
    const page = await browser.newPage({ viewport: { width: 849, height: 564 }, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "networkidle" });
    const screenshot = await stableScreenshot(page);
    const screenshotPath = resolve(evidenceDir, "full.png");
    await writeFile(screenshotPath, screenshot);
    const manifest = await captureRuntimeComponentManifest(page);
    const hitMaps = new Map((await captureHitMap(page)).map((entry) => [entry.windowId, entry]));

    const verdicts = [];
    for (const windowAuthority of windowRegistry.windows) {
      const [x, y, width, height] = windowAuthority.bounds;
      const referenceCrop = resolve(workDir, `${windowAuthority.id}-reference.png`);
      const actualCrop = resolve(workDir, `${windowAuthority.id}-actual.png`);
      const sourceSurfaceMask = resolve(workDir, `${windowAuthority.id}-source-surface-mask.png`);
      const referenceMasked = resolve(workDir, `${windowAuthority.id}-reference-masked.png`);
      const actualMasked = resolve(workDir, `${windowAuthority.id}-actual-masked.png`);
      runImageMagick("convert", [referencePath, "-crop", `${width}x${height}+${x}+${y}`, "+repage", referenceCrop]);
      runImageMagick("convert", [screenshotPath, "-crop", `${width}x${height}+${x}+${y}`, "+repage", actualCrop]);
      // The independently generated Qwen desktop is verified by its own source-palette gate.
      // Window fidelity must score the foreground window, not background pixels visible
      // through stepped corners and intentional holes in the source crop.
      runImageMagick("convert", [referenceCrop, "-alpha", "off", "-fx", "((r>0.45)&&(b>0.45)&&(g<0.95)&&(r-g)>0.04&&(b-g)>0.04)?0:1", sourceSurfaceMask]);
      for (const [input, output] of [[referenceCrop, referenceMasked], [actualCrop, actualMasked]]) {
        runImageMagick("convert", [input, sourceSurfaceMask, "-alpha", "off", "-compose", "CopyOpacity", "-composite", "-background", "black", "-alpha", "remove", output]);
      }

      const runtimeWindow = manifest.windows.find((window) => window.id === windowAuthority.id);
      if (!runtimeWindow) throw new Error(`Runtime window missing: ${windowAuthority.id}`);
      const componentIds = new Set(runtimeWindow.components.map((component) => component.id));
      const mappedControls = runtimeWindow.controls.filter((control) => control.visualComponent && componentIds.has(control.visualComponent));
      const highErrorCount = highErrorPixels(referenceMasked, actualMasked, contract.visual.highErrorFuzzPercent);
      const largestComponent = largestHighErrorComponent(referenceMasked, actualMasked, contract.visual.highErrorFuzzPercent);
      const area = width * height;
      const geometryMismatches = visualGeometryMismatches(runtimeWindow);
      const interaction = interactionAuthority.windows.find((entry) => entry.id === windowAuthority.id);
      const metrics = {
        windowId: windowAuthority.id,
        normalizedMae: normalizedMae(referenceMasked, actualMasked),
        highErrorPixelRate: highErrorCount / area,
        largestHighErrorComponentRate: largestComponent / area,
        controls: runtimeWindow.controls.length,
        controlsWithVisualAuthority: mappedControls.length,
        hitMapFailures: hitMaps.get(windowAuthority.id)?.failures.length ?? 1,
        irreversibleInteractions: interaction?.status === "benchmark-pass" ? 0 : null,
        visualGeometryMismatches: geometryMismatches.length,
      };
      verdicts.push({
        ...evaluateAgainstBgmBenchmark(metrics, contract),
        geometryMismatches,
        hitMap: hitMaps.get(windowAuthority.id) ?? { windowId: windowAuthority.id, failures: [{ reason: "not-captured" }] },
        interactionAuthority: interaction ?? { id: windowAuthority.id, status: "missing" },
      });
    }

    const report = {
      schemaVersion: "1.0",
      benchmarkWindow: contract.benchmarkWindow,
      sourceAuthority: contract.sourceAuthority,
      sourceSha256: createHash("sha256").update(await readFile(referencePath)).digest("hex"),
      runtimeUrl: url,
      runtimeSha256: createHash("sha256").update(screenshot).digest("hex"),
      generatedAt: new Date().toISOString(),
      overall: verdicts.every(({ status }) => status === "benchmark-pass") ? "pass" : "revision-required",
      verdicts,
    };
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    return report;
  } finally {
    await browser.close();
    await rm(workDir, { recursive: true, force: true });
  }
}

async function main() {
  const repoDir = resolve(import.meta.dirname, "../..");
  const report = await runBgmFidelityGate({ repoDir });
  for (const verdict of report.verdicts) {
    process.stdout.write(`${verdict.windowId.padEnd(14)} ${verdict.status.padEnd(17)} ${verdict.failures.join(", ") || "BGM fidelity matched"}\n`);
  }
  process.stdout.write(`BGM fidelity gate: ${report.overall}\n`);
  if (report.overall !== "pass") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
