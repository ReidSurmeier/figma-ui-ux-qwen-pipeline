import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function metric(reference: string, actual: string) {
  const output = execFileSync("compare", ["-metric", "MAE", reference, actual, "null:"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return output;
}

function mae(reference: string, actual: string) {
  try { metric(reference, actual); return 0; } catch (error) {
    const message = String((error as { stderr?: string }).stderr ?? error);
    return Number(message.match(/\(([^)]+)\)/)?.[1] ?? "1");
  }
}

test("inventory is thirty-three independent assets over a Qwen-derived clean plate", async ({ page }) => {
  await page.goto("/");
  const window = page.getByRole("region", { name: "所持アイテム" });
  await expect(window).toHaveAttribute("data-clean-plate", "/assets/japanese-rpg-v001/inventory/clean-plate.png");
  await expect(window.locator("[data-component-id]")).toHaveCount(33);
  const requested = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name));
  expect(requested.filter((url) => /regions\/inventory\/reference\.png|benchmarks\//.test(url))).toEqual([]);

  const evidenceDir = mkdtempSync(join(tmpdir(), "inventory-visual-"));
  try {
    const screenshot = join(evidenceDir, "inventory.png");
    await window.screenshot({ path: screenshot });
    expect(mae("../benchmarks/japanese-rpg-options-v001/regions/inventory/reference.png", screenshot)).toBeLessThanOrEqual(0.05);
  } finally {
    rmSync(evidenceDir, { recursive: true, force: true });
  }
});

test("inventory category tabs own distinct settled views", async ({ page }) => {
  await page.goto("/");
  const window = page.getByRole("region", { name: "所持アイテム" });
  await expect(window.locator(".inventory-source-cell")).toHaveCount(21);
  await window.getByRole("tab", { name: "equip", exact: true }).click();
  await expect(window.getByRole("tab", { name: "equip", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(window.locator(".inventory-source-cell")).toHaveCount(14);
  await window.getByRole("tab", { name: "etc", exact: true }).click();
  await expect(window.locator(".inventory-source-cell")).toHaveCount(7);
});

test("every Inventory category is a reachable tab with its complete selectable cell inventory", async ({ page }) => {
  await page.goto("/");
  const window = page.getByRole("region", { name: "所持アイテム" });
  const tablist = window.getByRole("tablist", { name: "所持品カテゴリ" });
  await expect(tablist).toBeVisible();
  const expected = { item: 21, equip: 14, etc: 7 } as const;
  await expect(tablist.getByRole("tab")).toHaveCount(Object.keys(expected).length);

  for (const [name, count] of Object.entries(expected)) {
    const tab = tablist.getByRole("tab", { name, exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    const panel = window.getByRole("tabpanel", { name, exact: true });
    await expect(panel).toBeVisible();
    const cells = panel.getByRole("button", { name: new RegExp(`^${name} item \\d+$`) });
    await expect(cells).toHaveCount(count);
    const last = cells.nth(count - 1);
    await last.click();
    await expect(last).toHaveAttribute("aria-pressed", "true");
    if (count > 1) await expect(cells.first()).toHaveAttribute("aria-pressed", "false");
  }
});

test("Inventory category tabs support vertical keyboard traversal and wrapped selection", async ({ page }) => {
  await page.goto("/");
  const tabs = page.getByRole("region", { name: "所持アイテム" }).getByRole("tablist", { name: "所持品カテゴリ" });
  const item = tabs.getByRole("tab", { name: "item", exact: true });
  const equip = tabs.getByRole("tab", { name: "equip", exact: true });
  const etc = tabs.getByRole("tab", { name: "etc", exact: true });

  await item.focus();
  await item.press("ArrowDown");
  await expect(equip).toBeFocused();
  await expect(equip).toHaveAttribute("aria-selected", "true");
  await equip.press("ArrowDown");
  await expect(etc).toBeFocused();
  await expect(etc).toHaveAttribute("aria-selected", "true");
  await etc.press("ArrowDown");
  await expect(item).toBeFocused();
  await expect(item).toHaveAttribute("aria-selected", "true");
  await item.press("ArrowUp");
  await expect(etc).toBeFocused();
  await expect(etc).toHaveAttribute("aria-selected", "true");
});

test("every reachable Inventory cell independently owns selection in all three categories", async ({ page }) => {
  await page.goto("/");
  const window = page.getByRole("region", { name: "所持アイテム" });
  const expected = { item: 21, equip: 14, etc: 7 } as const;

  for (const [name, count] of Object.entries(expected)) {
    await window.getByRole("tab", { name, exact: true }).click();
    const panel = window.getByRole("tabpanel", { name, exact: true });
    const cells = panel.getByRole("button", { name: new RegExp(`^${name} item \\d+$`) });
    await expect(cells).toHaveCount(count);
    for (let index = 0; index < count; index += 1) {
      await cells.nth(index).click();
      const selected = await cells.evaluateAll((buttons) => buttons.flatMap((button, cellIndex) => button.getAttribute("aria-pressed") === "true" ? [cellIndex] : []));
      expect(selected, `${name} cell ${index + 1} did not exclusively own selection`).toEqual([index]);
    }
  }
});

test("inventory cells select independently and scrolling is continuous", async ({ page }) => {
  await page.goto("/");
  const window = page.getByRole("region", { name: "所持アイテム" });
  const cell = window.getByRole("button", { name: "item item 9" });
  await cell.click();
  await expect(cell).toHaveAttribute("aria-pressed", "true");
  await expect(cell.locator(".source-raster")).toHaveCSS("filter", "brightness(0.78) saturate(1.35)");

  const slider = window.getByRole("slider", { name: "所持品スクロール" });
  const values = await slider.evaluate((element) => {
    const input = element as HTMLInputElement;
    const emitted: number[] = [];
    input.addEventListener("input", () => emitted.push(input.valueAsNumber));
    for (let value = 0; value <= 100; value += 10) {
      input.value = String(value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return emitted;
  });
  expect(new Set(values).size).toBeGreaterThan(4);
  await expect(window.locator(".inventory-source-grid")).toHaveCSS("transform", /matrix\(1, 0, 0, 1, 0, -12\)/);
  await expect(window.locator(".inventory-source-thumb")).toHaveCSS("top", "50px");
  await slider.fill("0");
  await expect(window.locator(".inventory-source-thumb")).toHaveCSS("top", "31px");
});

test("inventory scrolling changes only the clipped body and never enters the header", async ({ page }) => {
  await page.goto("/");
  const window = page.getByRole("region", { name: "所持アイテム" });
  const slider = window.getByRole("slider", { name: "所持品スクロール" });
  const bounds = await window.boundingBox();
  if (!bounds) throw new Error("Inventory window geometry is unavailable");
  const header = { x: bounds.x, y: bounds.y, width: 263, height: 18 };
  const body = { x: bounds.x + 36, y: bounds.y + 19, width: 227, height: 102 };

  await slider.fill("0");
  const headerAtTop = await page.screenshot({ clip: header });
  const bodyAtTop = await page.screenshot({ clip: body });
  await slider.fill("100");
  await page.waitForTimeout(40);
  const headerAtBottom = await page.screenshot({ clip: header });
  const bodyAtBottom = await page.screenshot({ clip: body });

  expect(bodyAtBottom.equals(bodyAtTop), "inventory contents did not scroll").toBe(false);
  expect(headerAtBottom.equals(headerAtTop), "inventory icons leaked into the title/header").toBe(true);
});

test("Inventory real scroll gestures keep one visual thumb and every sampled body state below the header", async ({ page }) => {
  await page.goto("/");
  const window = page.getByRole("region", { name: "所持アイテム" });
  const slider = window.getByRole("slider", { name: "所持品スクロール" });
  await expect(slider).toHaveAttribute("data-visual-component", "inventory-scroll-thumb");
  const thumb = window.locator('[data-component-id="inventory-scroll-thumb"]');
  await expect(thumb).toHaveCount(1);
  const bounds = await window.boundingBox();
  const sliderBounds = await slider.boundingBox();
  if (!bounds || !sliderBounds) throw new Error("Inventory scroll geometry is unavailable");
  const header = { x: bounds.x, y: bounds.y, width: 263, height: 18 };
  const body = { x: bounds.x + 36, y: bounds.y + 19, width: 227, height: 102 };
  const values = new Set<number>();
  const bodies: Buffer[] = [];

  await slider.focus();
  await slider.press("Home");
  const headerAuthority = await page.screenshot({ clip: header });
  for (let step = 1; step < 10; step += 1) {
    await page.mouse.click(sliderBounds.x + sliderBounds.width / 2, sliderBounds.y + sliderBounds.height * (step / 10));
    const value = Number(await slider.inputValue());
    values.add(value);
    bodies.push(await page.screenshot({ clip: body }));
    expect((await page.screenshot({ clip: header })).equals(headerAuthority), `scroll value ${value} leaked into the header`).toBe(true);
    const thumbBounds = await thumb.boundingBox();
    expect(Math.round((thumbBounds?.y ?? -1) - bounds.y), `scroll value ${value} misplaced or duplicated the thumb`).toBe(31 + Math.round(value * 0.19));
  }
  expect(values.size).toBeGreaterThan(4);
  expect(new Set(bodies.map((image) => image.toString("base64"))).size).toBeGreaterThan(4);
  await slider.focus();
  await slider.press("Home");
  expect(await slider.inputValue()).toBe("0");
  expect(Math.round((await thumb.boundingBox())!.y - bounds.y)).toBe(31);
  await slider.press("End");
  expect(await slider.inputValue()).toBe("100");
  await expect(thumb).toHaveCSS("top", "50px");
  expect(Math.round((await thumb.boundingBox())!.y - bounds.y)).toBe(50);
});

test("Inventory minimize uses a generated compact endpoint through complete motion and restores", async ({ page }) => {
  await page.goto("/");
  const window = page.getByRole("region", { name: "所持アイテム" });
  const minimize = window.getByRole("button", { name: "所持アイテムを最小化" });
  await expect(minimize).toHaveAttribute("data-minimize-endpoint", "/assets/japanese-rpg-v001/inventory/minimized-plate.png");
  const before = await window.boundingBox();
  const titleBefore = await window.locator('[data-component-id="inventory-title-icon"],[data-component-id="inventory-title-text"]').evaluateAll((nodes) => nodes.map((node) => {
    const bounds = node.getBoundingClientRect();
    const root = node.closest('[data-window-id="inventory"]')!.getBoundingClientRect();
    return { id: node.getAttribute("data-component-id"), bounds: [bounds.x - root.x, bounds.y - root.y, bounds.width, bounds.height], image: getComputedStyle(node).backgroundImage };
  }));
  const motion = page.evaluate(async () => {
    const root = document.querySelector<HTMLElement>('[data-window-id="inventory"]');
    if (!root) throw new Error("Inventory is unavailable");
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
  await expect(window).toHaveCSS("background-image", /inventory\/minimized-plate\.png/);
  const titleMinimized = await window.locator('[data-component-id="inventory-title-icon"],[data-component-id="inventory-title-text"]').evaluateAll((nodes) => nodes.map((node) => {
    const bounds = node.getBoundingClientRect();
    const root = node.closest('[data-window-id="inventory"]')!.getBoundingClientRect();
    return { id: node.getAttribute("data-component-id"), bounds: [bounds.x - root.x, bounds.y - root.y, bounds.width, bounds.height], image: getComputedStyle(node).backgroundImage };
  }));
  expect(titleMinimized).toEqual(titleBefore);
  await minimize.click();
  await expect(window).toHaveCSS("width", "280px");
  await expect(window).toHaveCSS("height", "137px");
  expect(await window.boundingBox()).toEqual(before);
});

test("Inventory close removes the window and Basic Info restores its exact componentized destination", async ({ page }) => {
  await page.goto("/");
  const inventory = page.getByRole("region", { name: "所持アイテム" });
  const before = await inventory.boundingBox();
  const componentIds = await inventory.locator("[data-component-id]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-component-id")));
  const close = inventory.getByRole("button", { name: "所持アイテムを閉じる", exact: true });
  await expect(close).toHaveAttribute("data-close-window", "inventory");
  await close.click();
  await expect(inventory).toHaveCount(0);
  await page.getByRole("region", { name: "基本情報" }).getByRole("button", { name: "items", exact: true }).click();
  const restored = page.getByRole("region", { name: "所持アイテム" });
  await expect(restored).toBeVisible();
  expect(await restored.boundingBox()).toEqual(before);
  expect(await restored.locator("[data-component-id]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-component-id")))).toEqual(componentIds);
});
