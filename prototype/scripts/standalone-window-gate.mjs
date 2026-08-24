import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

import { evaluateAgainstBgmBenchmark, loadBgmFidelityContract } from "./bgm-fidelity-gate.mjs";
import { captureRuntimeComponentManifest } from "./capture-component-manifest.mjs";

const prototypeDir = resolve(import.meta.dirname, "..");
const repoDir = resolve(prototypeDir, "..");
const baseUrl = process.env.STANDALONE_WINDOW_URL ?? "http://10.255.255.254:4174/";
const requestedIds = process.env.STANDALONE_WINDOW_IDS?.split(",").map((id) => id.trim()).filter(Boolean);
const evidenceRoot = resolve(repoDir, process.env.STANDALONE_WINDOW_OUTPUT ?? "artifacts/qa/standalone-windows-v001");

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) throw result.error;
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
}

function normalizedMae(reference, actual) {
  const match = run("compare", ["-metric", "MAE", reference, actual, "null:"]).match(/\(([^)]+)\)/);
  if (!match) throw new Error("ImageMagick did not emit normalized MAE");
  return Number(match[1]);
}

function absoluteError(reference, actual, fuzz) {
  return Number(run("compare", ["-metric", "AE", "-fuzz", `${fuzz}%`, reference, actual, "null:"]).match(/\d+(?:\.\d+)?/)?.[0]);
}

function largestError(reference, actual, fuzz) {
  return run("convert", [reference, actual, "-compose", "difference", "-composite", "-colorspace", "gray", "-threshold", `${fuzz}%`, "-define", "connected-components:verbose=true", "-connected-components", "8", "null:"])
    .split("\n").reduce((largest, line) => {
      if (!/gray(?:a)?\(255(?:,1)?\)/.test(line)) return largest;
      const match = line.match(/^\s*\d+:\s+\S+\s+\S+\s+(\d+)\s+/);
      return match ? Math.max(largest, Number(match[1])) : largest;
    }, 0);
}

async function settle(locator) {
  await locator.evaluate(async (root) => {
    await document.fonts.ready;
    const urls = [root, ...root.querySelectorAll("*")].flatMap((node) => [...getComputedStyle(node).backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g)].map((match) => match[1]));
    await Promise.all([...new Set(urls)].map(async (url) => {
      const image = new Image();
      image.src = url;
      try { await image.decode(); } catch { /* reported by the visual comparison */ }
    }));
  });
  let previous = await locator.screenshot();
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await locator.page().evaluate(() => new Promise((done) => requestAnimationFrame(done)));
    const current = await locator.screenshot();
    if (current.equals(previous)) return current;
    previous = current;
  }
  throw new Error("isolated window never reached two identical frames");
}

async function hitFailures(page, windowId) {
  return page.locator(`[data-window-id="${windowId}"]`).evaluate((root) => {
    const owned = [...document.querySelectorAll(`[data-control-owner="${CSS.escape(root.dataset.windowId)}"]`)];
    const selector = "button:not(:disabled),input:not(:disabled),[role=tab]:not(:disabled),[role=option]:not(:disabled)";
    const controls = [...root.querySelectorAll(selector), ...owned.flatMap((node) => [...node.querySelectorAll(selector)])]
      .filter((node) => { const box = node.getBoundingClientRect(); return box.width > 0 && box.height > 0; });
    const failures = [];
    for (const control of controls) {
      const raw = control.getBoundingClientRect();
      const box = { left: raw.left, top: raw.top, right: raw.right, bottom: raw.bottom };
      for (let ancestor = control.parentElement; ancestor && ancestor !== document.documentElement; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (![style.overflow, style.overflowX, style.overflowY].some((value) => ["hidden", "scroll", "auto", "clip"].includes(value))) continue;
        const clip = ancestor.getBoundingClientRect();
        box.left = Math.max(box.left, clip.left);
        box.top = Math.max(box.top, clip.top);
        box.right = Math.min(box.right, clip.right);
        box.bottom = Math.min(box.bottom, clip.bottom);
      }
      if (box.left >= box.right || box.top >= box.bottom) continue;
      const width = box.right - box.left;
      const height = box.bottom - box.top;
      for (const xRatio of [0.25, 0.5, 0.75]) for (const yRatio of [0.25, 0.5, 0.75]) {
        const hit = document.elementFromPoint(box.left + width * xRatio, box.top + height * yRatio);
        const labelOwns = hit?.closest("label")?.control === control;
        if (!hit || (hit !== control && !control.contains(hit) && !labelOwns)) failures.push({ control: control.getAttribute("aria-label"), xRatio, yRatio, hit: hit?.getAttribute("aria-label") ?? hit?.tagName ?? null });
      }
    }
    return failures;
  });
}

function geometryMismatches(window) {
  const components = new Map(window.components.map((component) => [component.id, component]));
  return window.controls.flatMap((control) => {
    const component = components.get(control.visualComponent);
    if (!component) return [];
    const visual = component.geometry;
    const hit = control.geometry;
    const tolerance = 2.01;
    const contained = visual.x >= hit.x - tolerance && visual.y >= hit.y - tolerance
      && visual.x + visual.width <= hit.x + hit.width + tolerance
      && visual.y + visual.height <= hit.y + hit.height + tolerance;
    return contained ? [] : [{ control: control.id, visualComponent: control.visualComponent, hit, visual }];
  });
}

const contract = await loadBgmFidelityContract(repoDir);
const registry = JSON.parse(await readFile(resolve(repoDir, "benchmarks/japanese-rpg-options-v001/windows.json"), "utf8"));
const interactionRegistry = JSON.parse(await readFile(resolve(prototypeDir, "qa/standalone-window-interactions.json"), "utf8"));
const authorities = registry.windows.filter(({ id }) => !requestedIds || requestedIds.includes(id));
if (requestedIds) {
  const found = new Set(authorities.map(({ id }) => id));
  const missing = requestedIds.filter((id) => !found.has(id));
  if (missing.length) throw new Error(`Unknown standalone windows: ${missing.join(", ")}`);
}
await mkdir(evidenceRoot, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/google-chrome" });
const verdicts = [];
try {
  for (const authority of authorities) {
    const page = await browser.newPage({ viewport: { width: 849, height: 564 }, deviceScaleFactor: 1 });
    const url = new URL(baseUrl);
    url.searchParams.set("isolate", authority.id);
    await page.goto(url.href, { waitUntil: "networkidle" });
    const root = page.locator(`[data-window-id="${authority.id}"]`);
    const windowDir = resolve(evidenceRoot, authority.id);
    await rm(windowDir, { recursive: true, force: true });
    await mkdir(windowDir, { recursive: true });
    const actual = resolve(windowDir, "default.png");
    await writeFile(actual, await settle(root));

    const [x, y, width, height] = authority.bounds;
    const reference = resolve(windowDir, "reference.png");
    const mask = resolve(windowDir, "source-surface-mask.png");
    const referenceMasked = resolve(windowDir, "reference-masked.png");
    const actualMasked = resolve(windowDir, "default-masked.png");
    run("convert", [resolve(repoDir, contract.sourceAuthority), "-crop", `${width}x${height}+${x}+${y}`, "+repage", reference]);
    run("convert", [reference, "-alpha", "off", "-fx", "((r>0.45)&&(b>0.45)&&(g<0.95)&&(r-g)>0.04&&(b-g)>0.04)?0:1", mask]);
    for (const occluderId of authority.occluded_by ?? []) {
      const occluder = registry.windows.find(({ id }) => id === occluderId);
      if (!occluder) throw new Error(`${authority.id} names unknown occluder ${occluderId}`);
      const [ox, oy, ow, oh] = occluder.bounds;
      const left = Math.max(x, ox);
      const top = Math.max(y, oy);
      const right = Math.min(x + width, ox + ow);
      const bottom = Math.min(y + height, oy + oh);
      if (left < right && top < bottom) run("convert", [mask, "-fill", "black", "-draw", `rectangle ${left - x},${top - y} ${right - x - 1},${bottom - y - 1}`, mask]);
    }
    for (const [input, output] of [[reference, referenceMasked], [actual, actualMasked]]) run("convert", [input, mask, "-alpha", "off", "-compose", "CopyOpacity", "-composite", "-background", "black", "-alpha", "remove", output]);

    const manifest = await captureRuntimeComponentManifest(page);
    const runtime = manifest.windows.find(({ id }) => id === authority.id);
    if (!runtime || manifest.windows.length !== 1) throw new Error(`${authority.id} is not isolated in the runtime manifest`);
    const componentIds = new Set(runtime.components.map(({ id }) => id));
    const mapped = runtime.controls.filter((control) => control.visualComponent && componentIds.has(control.visualComponent));
    const hitMapFailures = await hitFailures(page, authority.id);
    const mismatches = geometryMismatches(runtime);
    const interaction = interactionRegistry.windows.find(({ id }) => id === authority.id);
    const area = width * height;
    const metrics = {
      windowId: authority.id,
      normalizedMae: normalizedMae(referenceMasked, actualMasked),
      highErrorPixelRate: absoluteError(referenceMasked, actualMasked, contract.visual.highErrorFuzzPercent) / area,
      largestHighErrorComponentRate: largestError(referenceMasked, actualMasked, contract.visual.highErrorFuzzPercent) / area,
      controls: runtime.controls.length,
      controlsWithVisualAuthority: mapped.length,
      hitMapFailures: hitMapFailures.length,
      irreversibleInteractions: runtime.controls.length === 0 || interaction?.status === "pass" ? 0 : null,
      visualGeometryMismatches: mismatches.length,
    };
    verdicts.push({ ...evaluateAgainstBgmBenchmark(metrics, contract), interaction, hitMapFailures, geometryMismatches: mismatches });
    await page.close();
  }
} finally {
  await browser.close();
}

const report = { schemaVersion: "1.0", mode: "isolated-window-before-desktop-assembly", generatedAt: new Date().toISOString(), overall: verdicts.every(({ status }) => status === "benchmark-pass") ? "pass" : "revision-required", verdicts };
await writeFile(resolve(evidenceRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
for (const verdict of verdicts) process.stdout.write(`${verdict.windowId.padEnd(14)} ${verdict.status.padEnd(17)} ${verdict.failures.join(", ") || "sealed"}\n`);
if (report.overall !== "pass") process.exitCode = 1;
