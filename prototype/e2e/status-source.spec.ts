import { expect, test, type Locator, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function activateWindow(window: Locator) {
  await window.dispatchEvent("pointerdown");
  await expect.poll(() => window.evaluate((element) => {
    const z = Number(getComputedStyle(element).zIndex);
    const all = [...element.parentElement!.querySelectorAll<HTMLElement>("[data-window-id]")].map((node) => Number(getComputedStyle(node).zIndex));
    return z === Math.max(...all);
  })).toBe(true);
  await window.evaluate(async (root) => {
    const urls = [root, ...root.querySelectorAll<HTMLElement>("*")].flatMap((node) => (
      [...getComputedStyle(node).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((match) => match[1])
    ));
    await Promise.all([...new Set(urls)].map(async (url) => {
      const image = new Image();
      image.src = url;
      await image.decode();
    }));
  });
  await window.page().evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function stableClip(page: Page, clip: { x: number; y: number; width: number; height: number }) {
  let previous = await page.screenshot({ clip });
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await page.waitForTimeout(24);
    const current = await page.screenshot({ clip });
    if (current.equals(previous)) return current;
    previous = current;
  }
  throw new Error("Status authority did not settle to two identical frames");
}

function opaquePinkPixelCount(path: string) {
  return Number(execFileSync("convert", [
    path, "-alpha", "set",
    "-fx", "(a>0.1&&r>0.58&&b>0.58&&g<0.7&&(r-g)>0.15&&(b-g)>0.15)?1:0",
    "-format", "%[fx:mean*w*h]", "info:",
  ], { encoding: "utf8" }).trim());
}

test("status is a Qwen clean plate plus independent source-locked raster groups", async ({ page }) => {
  await page.goto("/?isolate=status");
  const window = page.getByRole("region", { name: "ステータス" });
  await expect(window).toHaveAttribute("data-clean-plate", "/assets/japanese-rpg-v001/status/clean-plate.png");
  await expect(window.locator("[data-component-id]")).toHaveCount(22);

  const requested = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name));
  expect(requested.filter((url) => /regions\/status\/reference\.png|benchmarks\//.test(url))).toEqual([]);

  const evidenceDir = mkdtempSync(join(tmpdir(), "status-pink-"));
  try {
    const screenshot = join(evidenceDir, "status.png");
    await window.screenshot({ path: screenshot });
    expect(opaquePinkPixelCount(screenshot)).toBe(0);
  } finally {
    rmSync(evidenceDir, { recursive: true, force: true });
  }
});

test("status increment visibly changes only the source value field", async ({ page }) => {
  await page.goto("/?isolate=status");
  const window = page.getByRole("region", { name: "ステータス" });
  await activateWindow(window);
  const button = window.getByRole("button", { name: "Strを上げる" });
  const bounds = await window.boundingBox();
  expect(bounds).not.toBeNull();

  const labelClip = {
    x: bounds!.x + 20,
    y: bounds!.y + 18,
    width: 30,
    height: 18,
  };
  const valueClip = {
    x: bounds!.x + 50,
    y: bounds!.y + 18,
    width: 52,
    height: 18,
  };
  const labelBefore = await stableClip(page, labelClip);
  const valueBefore = await stableClip(page, valueClip);

  await expect(button).toHaveAttribute("aria-pressed", "false");
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");

  const labelAfter = await page.screenshot({ clip: labelClip });
  const valueAfter = await page.screenshot({ clip: valueClip });
  expect(labelAfter.equals(labelBefore), "the source Str label must remain pixel-identical").toBe(true);
  expect(valueAfter.equals(valueBefore), "the visible Str value must change").toBe(false);
});

test("every source-visible Status increment owns its exact hitbox and changes only its local value field", async ({ page }) => {
  const expected = [
    { label: "Strを上げる", row: 0, component: "status-primary-row-0" },
    { label: "Agiを上げる", row: 1, component: "status-primary-row-1" },
    { label: "Vitを上げる", row: 2, component: "status-primary-row-2" },
    { label: "Dexを上げる", row: 4, component: "status-primary-row-4" },
    { label: "Lukを上げる", row: 5, component: "status-primary-row-5" },
  ];
  await page.goto("/?isolate=status");
  const status = page.getByRole("region", { name: "ステータス" });
  const inventory = await status.getByRole("button", { name: /を上げる$/ }).evaluateAll((buttons) => buttons.map((button) => ({
    label: button.getAttribute("aria-label"),
    row: Number((button as HTMLElement).dataset.statusRow ?? -1),
    component: (button as HTMLElement).dataset.valueComponent ?? "",
  })));
  expect(inventory).toEqual(expected);

  for (const { label, row } of expected) {
    await page.goto("/?isolate=status");
    const window = page.getByRole("region", { name: "ステータス" });
    const windowBounds = await window.boundingBox();
    if (!windowBounds) throw new Error("Status geometry is unavailable");
    const button = window.getByRole("button", { name: label, exact: true });
    const buttonBounds = await button.boundingBox();
    expect(buttonBounds).toEqual({ x: windowBounds.x + 91, y: windowBounds.y + 21 + row * 18, width: 11, height: 11 });

    const rowTop = windowBounds.y + 18 + row * 18;
    const labelClip = { x: windowBounds.x + 20, y: rowTop, width: 30, height: 18 };
    const valueClip = { x: windowBounds.x + 50, y: rowTop, width: 52, height: 18 };
    const derivedClip = { x: windowBounds.x + 102, y: rowTop, width: 176, height: 18 };
    const labelBefore = await page.screenshot({ clip: labelClip });
    const valueBefore = await page.screenshot({ clip: valueClip });
    const derivedBefore = await page.screenshot({ clip: derivedClip });
    const otherRowsBefore = await Promise.all([0, 1, 2, 3, 4, 5].filter((other) => other !== row).map((other) => page.screenshot({ clip: { x: windowBounds.x + 20, y: windowBounds.y + 18 + other * 18, width: 258, height: 18 } })));

    await expect(button).toHaveAttribute("aria-pressed", "false");
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(window.locator("output.sr-only")).toContainText(`${label.slice(0, 3)}+1`);

    expect((await page.screenshot({ clip: labelClip })).equals(labelBefore), `${label} changed its source label`).toBe(true);
    expect((await page.screenshot({ clip: valueClip })).equals(valueBefore), `${label} did not change its local value`).toBe(false);
    expect((await page.screenshot({ clip: derivedClip })).equals(derivedBefore), `${label} changed the derived column`).toBe(true);
    const otherRowsAfter = await Promise.all([0, 1, 2, 3, 4, 5].filter((other) => other !== row).map((other) => page.screenshot({ clip: { x: windowBounds.x + 20, y: windowBounds.y + 18 + other * 18, width: 258, height: 18 } })));
    expect(otherRowsAfter.every((image, index) => image.equals(otherRowsBefore[index])), `${label} changed another stat row`).toBe(true);
  }
});

test("status does not invent an alternate tab over the source-only STATUS label", async ({ page }) => {
  await page.goto("/?isolate=status");
  const window = page.getByRole("region", { name: "ステータス" });
  await expect(window.getByRole("button", { name: /^(stats|info)$/ })).toHaveCount(0);
  await expect(window.getByRole("tabpanel")).toHaveCount(0);
  await expect(window.locator('[data-component-id="status-primary-row-0"]')).toBeVisible();
  await expect(window.locator('[data-component-id="status-derived-row-5"]')).toBeVisible();
});

test("status minimize uses a generated compact endpoint through complete motion and restores the full source geometry", async ({ page }) => {
  await page.goto("/?isolate=status");
  const window = page.getByRole("region", { name: "ステータス" });
  const minimize = window.getByRole("button", { name: "ステータスを最小化" });
  await expect(minimize).toHaveAttribute("data-minimize-endpoint", "/assets/japanese-rpg-v001/status/minimized-plate.png");
  const before = await window.boundingBox();
  const titleBefore = await window.locator('[data-component-id="status-title-icon"],[data-component-id="status-title-text"]').evaluateAll((nodes) => nodes.map((node) => {
    const bounds = node.getBoundingClientRect();
    const root = node.closest('[data-window-id="status"]')!.getBoundingClientRect();
    return { id: node.getAttribute("data-component-id"), bounds: [bounds.x - root.x, bounds.y - root.y, bounds.width, bounds.height], image: getComputedStyle(node).backgroundImage };
  }));
  const motion = page.evaluate(async () => {
    const root = document.querySelector<HTMLElement>('[data-window-id="status"]');
    if (!root) throw new Error("Status is unavailable");
    const samples: string[] = [];
    const start = performance.now();
    while (performance.now() - start < 260) {
      await new Promise(requestAnimationFrame);
      const bounds = root.getBoundingClientRect();
      samples.push(`${Math.round(bounds.width * 10) / 10}x${Math.round(bounds.height * 10) / 10}`);
    }
    return samples;
  });
  await minimize.click();
  expect(new Set(await motion).size).toBeGreaterThan(4);
  await expect(window).toHaveCSS("width", "180px");
  await expect(window).toHaveCSS("height", "18px");
  await expect(window.locator(".source-window__components")).toHaveCount(0);
  await expect(window).toHaveCSS("background-image", /status\/minimized-plate\.png/);
  const titleMinimized = await window.locator('[data-component-id="status-title-icon"],[data-component-id="status-title-text"]').evaluateAll((nodes) => nodes.map((node) => {
    const bounds = node.getBoundingClientRect();
    const root = node.closest('[data-window-id="status"]')!.getBoundingClientRect();
    return { id: node.getAttribute("data-component-id"), bounds: [bounds.x - root.x, bounds.y - root.y, bounds.width, bounds.height], image: getComputedStyle(node).backgroundImage };
  }));
  expect(titleMinimized).toEqual(titleBefore);
  await minimize.click();
  await expect(window).toHaveCSS("width", "280px");
  await expect(window).toHaveCSS("height", "126px");
  expect(await window.boundingBox()).toEqual(before);
});

test("status close removes the window and Basic Info restores the same independent destination", async ({ page }) => {
  await page.goto("/");
  const status = page.getByRole("region", { name: "ステータス" });
  const before = await status.boundingBox();
  const componentIds = await status.locator("[data-component-id]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-component-id")));
  const close = status.getByRole("button", { name: "ステータスを閉じる", exact: true });
  await expect(close).toHaveAttribute("data-close-window", "status");
  await close.click();
  await expect(status).toHaveCount(0);
  await page.getByRole("region", { name: "基本情報" }).getByRole("button", { name: "status", exact: true }).click();
  const restored = page.getByRole("region", { name: "ステータス" });
  await expect(restored).toBeVisible();
  expect(await restored.boundingBox()).toEqual(before);
  expect(await restored.locator("[data-component-id]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-component-id")))).toEqual(componentIds);
});
