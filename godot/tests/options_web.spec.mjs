import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "../../prototype/node_modules/@playwright/test/index.mjs";

const projectRoot = resolve(import.meta.dirname, "../..");
const evidenceDir = resolve(projectRoot, "artifacts/qa/godot-options-v001");
const sourceWindow = resolve(
  projectRoot,
  "benchmarks/japanese-rpg-options-v001/regions/options-window/reference.png",
);

const INITIAL_WINDOW = { x: 345, y: 182, width: 280, height: 122 };

function canvasPoint(canvas, localX, localY) {
  return {
    x: canvas.x + (localX / 849) * canvas.width,
    y: canvas.y + (localY / 564) * canvas.height,
  };
}

function imageMagick(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) throw result.error;
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
}

async function state(page) {
  return page.evaluate(() => window.godotQaState);
}

async function clickCanvas(page, canvas, x, y) {
  const point = canvasPoint(canvas, x, y);
  await page.mouse.click(point.x, point.y);
}

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await page.locator("canvas").waitFor({ state: "visible" });
  await expect.poll(() => state(page)).toMatchObject({ ready: true });
});

test("Godot exports the accepted Japanese Options assembly without a screenshot underlay", async ({ page }) => {
  mkdirSync(evidenceDir, { recursive: true });
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("width", "849");
  await expect(canvas).toHaveAttribute("height", "564");
  await expect.poll(() => state(page)).toMatchObject({
    bgm: 62,
    effect: 43,
    bgm_on: false,
    effect_on: true,
    tab: "option",
    minimized: false,
    visible: true,
    visual_authorities: 33,
    controls: 18,
    mapped_controls: 18,
  });

  const screenshot = resolve(evidenceDir, "godot-options-initial.png");
  const crop = resolve(evidenceDir, "godot-options-window.png");
  await page.screenshot({ path: screenshot });
  execFileSync("convert", [
    screenshot,
    "-crop",
    `${INITIAL_WINDOW.width}x${INITIAL_WINDOW.height}+${INITIAL_WINDOW.x}+${INITIAL_WINDOW.y}`,
    "+repage",
    crop,
  ]);
  const comparison = spawnSync(
    "compare",
    ["-metric", "MAE", sourceWindow, crop, "null:"],
    { encoding: "utf8" },
  );
  expect([0, 1]).toContain(comparison.status);
  const metric = comparison.stderr.trim();
  const normalizedMae = Number(metric.match(/\(([^)]+)\)/)?.[1]);
  const highErrorCount = Number(imageMagick("compare", [
    "-metric", "AE", "-fuzz", "10%", sourceWindow, crop, "null:",
  ]).match(/\d+(?:\.\d+)?/)?.[0]);
  const components = imageMagick("convert", [
    sourceWindow,
    crop,
    "-compose", "difference",
    "-composite",
    "-colorspace", "gray",
    "-threshold", "10%",
    "-define", "connected-components:verbose=true",
    "-connected-components", "8",
    "null:",
  ]);
  const largestComponent = components.split("\n").reduce((largest, line) => {
    if (!/gray(?:a)?\(255(?:,1)?\)/.test(line)) return largest;
    const match = line.match(/^\s*\d+:\s+\S+\s+\S+\s+(\d+)\s+/);
    return match ? Math.max(largest, Number(match[1])) : largest;
  }, 0);
  const area = INITIAL_WINDOW.width * INITIAL_WINDOW.height;
  const report = {
    sourceSha256: createHash("sha256").update(readFileSync(sourceWindow)).digest("hex"),
    runtimeSha256: createHash("sha256").update(readFileSync(crop)).digest("hex"),
    normalizedMae,
    highErrorPixelRate: highErrorCount / area,
    largestHighErrorComponentRate: largestComponent / area,
    controls: 18,
    mappedControls: 18,
  };
  writeFileSync(resolve(evidenceDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  expect(normalizedMae).toBeLessThanOrEqual(0.03668);
  expect(report.highErrorPixelRate).toBeLessThanOrEqual(0.1277);
  expect(report.largestHighErrorComponentRate).toBeLessThanOrEqual(0.06409);
  expect(report.mappedControls).toBe(report.controls);
});

test("BGM and Effect use continuous exact-endpoint controls with corrected hit mapping", async ({ page }) => {
  const bounds = await page.locator("canvas").boundingBox();
  if (!bounds) throw new Error("Godot canvas has no geometry");

  const rowY = INITIAL_WINDOW.y + 18 + 11;
  const start = canvasPoint(bounds, INITIAL_WINDOW.x + 90, rowY);
  const end = canvasPoint(bounds, INITIAL_WINDOW.x + 222, rowY);
  const samples = [];
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let index = 0; index <= 12; index += 1) {
    const x = start.x + ((end.x - start.x) * index) / 12;
    await page.mouse.move(x, end.y);
    samples.push((await state(page)).bgm);
  }
  await page.mouse.up();
  expect(new Set(samples).size).toBeGreaterThan(4);
  await expect.poll(() => state(page)).toMatchObject({ bgm: 100, effect: 43 });

  await page.keyboard.press("Home");
  await expect.poll(() => state(page)).toMatchObject({ bgm: 0, effect: 43 });
  await page.keyboard.press("End");
  await expect.poll(() => state(page)).toMatchObject({ bgm: 100, effect: 43 });

  const leftArrow = canvasPoint(bounds, INITIAL_WINDOW.x + 80, INITIAL_WINDOW.y + 18 + 9);
  const arrowClip = { x: INITIAL_WINDOW.x + 74, y: INITIAL_WINDOW.y + 20, width: 12, height: 15 };
  const idleArrow = await page.screenshot({ clip: arrowClip });
  await page.mouse.move(leftArrow.x, leftArrow.y);
  await page.mouse.down();
  const downArrow = await page.screenshot({ clip: arrowClip });
  expect(downArrow.equals(idleArrow)).toBe(false);
  await expect.poll(() => state(page)).toMatchObject({ bgm: 100, effect: 43 });
  await page.mouse.up();
  await expect.poll(() => state(page)).toMatchObject({ bgm: 99, effect: 43 });
  const settledArrow = await page.screenshot({ clip: arrowClip });
  expect(settledArrow.equals(idleArrow)).toBe(true);
  await clickCanvas(page, bounds, INITIAL_WINDOW.x + 229, INITIAL_WINDOW.y + 18 + 9);
  await expect.poll(() => state(page)).toMatchObject({ bgm: 100, effect: 43 });
  await clickCanvas(page, bounds, INITIAL_WINDOW.x + 244, INITIAL_WINDOW.y + 18 + 9);
  await expect.poll(() => state(page)).toMatchObject({ bgm_on: true, effect_on: true });

  const effectStart = canvasPoint(bounds, INITIAL_WINDOW.x + 86.5, INITIAL_WINDOW.y + 18 + 36);
  const effectEnd = canvasPoint(bounds, INITIAL_WINDOW.x + 221.5, INITIAL_WINDOW.y + 18 + 36);
  await page.mouse.move(effectEnd.x, effectEnd.y);
  await page.mouse.down();
  await page.mouse.move(effectStart.x, effectStart.y, { steps: 12 });
  await page.mouse.up();
  await expect.poll(() => state(page)).toMatchObject({ effect: 0, bgm: 100 });
});

test("tabs, custom dropdown, checkboxes, movement, and stepped minimize are reversible", async ({ page }) => {
  const bounds = await page.locator("canvas").boundingBox();
  if (!bounds) throw new Error("Godot canvas has no geometry");

  await clickCanvas(page, bounds, INITIAL_WINDOW.x + 12, INITIAL_WINDOW.y + 18 + 57);
  await expect.poll(() => state(page)).toMatchObject({ tab: "info" });
  await clickCanvas(page, bounds, INITIAL_WINDOW.x + 12, INITIAL_WINDOW.y + 18 + 18);
  await expect.poll(() => state(page)).toMatchObject({ tab: "option" });

  await clickCanvas(page, bounds, INITIAL_WINDOW.x + 160, INITIAL_WINDOW.y + 18 + 55);
  await expect.poll(() => state(page)).toMatchObject({ skin_open: true });
  await clickCanvas(page, bounds, INITIAL_WINDOW.x + 160, INITIAL_WINDOW.y + 18 + 55 + 27);
  await expect.poll(() => state(page)).toMatchObject({ skin: "ブルー", skin_open: false });

  for (const [x, key] of [[15, "opaque"], [117, "attack"], [168, "skill"], [209, "item"]]) {
    const before = (await state(page)).footer[key];
    await clickCanvas(page, bounds, INITIAL_WINDOW.x + x, INITIAL_WINDOW.y + 18 + 88);
    await expect.poll(() => state(page)).toMatchObject({ footer: { [key]: !before } });
  }

  const titleStart = canvasPoint(bounds, INITIAL_WINDOW.x + 110, INITIAL_WINDOW.y + 9);
  await page.mouse.move(titleStart.x, titleStart.y);
  await page.mouse.down();
  await page.mouse.move(titleStart.x + 40, titleStart.y + 26, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => state(page)).toMatchObject({ position: [385, 208] });

  const minimize = canvasPoint(bounds, 385 + 258, 208 + 9);
  const restore = canvasPoint(bounds, 385 + 158, 208 + 9);
  await page.mouse.click(minimize.x, minimize.y);
  await expect.poll(() => state(page)).toMatchObject({ minimized: true, window_size: [180, 18] });
  const geometries = new Set((await state(page)).minimize_samples);
  expect(geometries.size).toBeGreaterThan(4);

  await page.mouse.click(restore.x, restore.y);
  await expect.poll(() => state(page)).toMatchObject({ minimized: false, window_size: [280, 122] });

  await clickCanvas(page, bounds, 385 + 272, 208 + 9);
  await expect.poll(() => state(page)).toMatchObject({ visible: false });
});

test("every dense control owns its complete visible hit surface", async ({ page }) => {
  const bounds = await page.locator("canvas").boundingBox();
  if (!bounds) throw new Error("Godot canvas has no geometry");
  const x = INITIAL_WINDOW.x;
  const y = INITIAL_WINDOW.y;

  await clickCanvas(page, bounds, x + 86.5, y + 29);
  await expect.poll(() => state(page)).toMatchObject({ bgm: 0 });
  await clickCanvas(page, bounds, x + 221.5, y + 29);
  await expect.poll(() => state(page)).toMatchObject({ bgm: 100 });

  for (const arrowX of [74.5, 85.5]) {
    const before = (await state(page)).bgm;
    await clickCanvas(page, bounds, x + arrowX, y + 29);
    await expect.poll(() => state(page)).toMatchObject({ bgm: before - 1 });
  }
  for (const arrowX of [222.5, 235.5]) {
    const before = (await state(page)).bgm;
    await clickCanvas(page, bounds, x + arrowX, y + 29);
    await expect.poll(() => state(page)).toMatchObject({ bgm: before + 1 });
  }

  for (const toggleX of [237.5, 270.5]) {
    const before = (await state(page)).bgm_on;
    await clickCanvas(page, bounds, x + toggleX, y + 29);
    await expect.poll(() => state(page)).toMatchObject({ bgm_on: !before });
  }

  for (const [key, left, right] of [
    ["opaque", 10.5, 69.5],
    ["attack", 112.5, 161.5],
    ["skill", 162.5, 203.5],
    ["item", 204.5, 243.5],
  ]) {
    for (const edgeX of [left, right]) {
      const before = (await state(page)).footer[key];
      await clickCanvas(page, bounds, x + edgeX, y + 107);
      await expect.poll(() => state(page)).toMatchObject({ footer: { [key]: !before } });
    }
  }
});
