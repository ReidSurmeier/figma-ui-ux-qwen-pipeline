import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function pinkDominantPixelCount(path: string, crop: string) {
  return Number(execFileSync("convert", [
    path, "-crop", crop, "+repage", "-alpha", "off",
    "-fx", "(r>0.58&&b>0.58&&g<0.7&&(r-g)>0.15&&(b-g)>0.15)?1:0",
    "-format", "%[fx:mean*w*h]", "info:",
  ], { encoding: "utf8" }).trim());
}

test("basic info is assembled from independent assets without a reference underlay or pink donor ring", async ({ page }) => {
  await page.goto("/");
  const window = page.getByRole("region", { name: "基本情報" });
  await expect(window).toHaveAttribute("data-clean-plate", "/assets/japanese-rpg-v001/basic-info/clean-plate.png");
  await expect(window.locator("[data-component-id]")).toHaveCount(26);

  const requested = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name));
  expect(requested.filter((url) => /reference\.png|benchmarks\//.test(url))).toEqual([]);

  const evidenceDir = mkdtempSync(join(tmpdir(), "basic-info-ring-"));
  try {
    const screenshot = join(evidenceDir, "basic-info.png");
    await window.screenshot({ path: screenshot });
    expect(pinkDominantPixelCount(screenshot, "280x3+0+0")).toBe(0);
    expect(pinkDominantPixelCount(screenshot, "3x120+0+0")).toBe(0);
    expect(pinkDominantPixelCount(screenshot, "3x120+277+0")).toBe(0);
  } finally {
    rmSync(evidenceDir, { recursive: true, force: true });
  }
});

test("basic info HP slider is continuous and reaches both visual endpoints without a grey donor block", async ({ page }) => {
  await page.goto("/");
  const window = page.getByRole("region", { name: "基本情報" });
  const slider = window.getByRole("slider", { name: "HP" });
  const visual = window.locator('[data-component-id="hp-thumb"]');
  const values: number[] = [];
  await slider.evaluate((element) => element.addEventListener("input", (event) => {
    (window as Window & { __basicHpValues?: number[] }).__basicHpValues ??= [];
    (window as Window & { __basicHpValues: number[] }).__basicHpValues.push(Number((event.currentTarget as HTMLInputElement).value));
  }));

  const sliderBox = await slider.boundingBox();
  if (!sliderBox) throw new Error("Basic HP slider geometry is unavailable");
  const sourceInitial = await visual.boundingBox();
  if (!sourceInitial) throw new Error("Basic HP source state is unavailable");
  expect(Math.round(sourceInitial.x - sliderBox.x)).toBe(0);
  await page.mouse.move(sliderBox.x + 2, sliderBox.y + sliderBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sliderBox.x + sliderBox.width - 2, sliderBox.y + sliderBox.height / 2, { steps: 14 });
  await page.mouse.up();
  values.push(...await page.evaluate(() => (window as Window & { __basicHpValues?: number[] }).__basicHpValues ?? []));
  expect(new Set(values).size).toBeGreaterThan(4);

  await slider.focus();
  await slider.press("Home");
  await page.waitForTimeout(32);
  const min = await visual.boundingBox();
  await slider.press("End");
  await page.waitForTimeout(32);
  const max = await visual.boundingBox();
  if (!min || !max) throw new Error("Basic HP visual thumb geometry is unavailable");
  expect(Math.round(min.x - sliderBox.x)).toBe(0);
  expect(Math.round(max.x + max.width - (sliderBox.x + sliderBox.width))).toBe(0);
  await expect(visual).toHaveCSS("background-image", /hp-thumb\.png/);
});

test("every Basic Info resource slider declares and drives its independent visual thumb", async ({ page }) => {
  await page.goto("/");
  const inventory = await page.getByRole("region", { name: "基本情報" }).getByRole("slider").evaluateAll((sliders) => sliders.map((slider) => ({
    label: slider.getAttribute("aria-label"),
    visual: (slider as HTMLElement).dataset.visualComponent ?? "",
  })));
  expect(inventory).toEqual([
    { label: "HP", visual: "hp-thumb" },
    { label: "SP", visual: "sp-thumb" },
  ]);

  for (const { label, visual: visualId } of inventory) {
    await page.goto("/");
    const basic = page.getByRole("region", { name: "基本情報" });
    const slider = basic.getByRole("slider", { name: label!, exact: true });
    const visual = basic.locator(`[data-component-id="${visualId}"]`);
    const invariant = basic.locator('[data-component-id="title-icon"],[data-component-id="title-text"],[data-component-id="base-label"],[data-component-id="footer-text"]');
    const invariantBefore = await invariant.evaluateAll((nodes) => nodes.map((node) => {
      const bounds = node.getBoundingClientRect();
      return { id: node.getAttribute("data-component-id"), bounds: [bounds.x, bounds.y, bounds.width, bounds.height], image: getComputedStyle(node).backgroundImage };
    }));
    const values = await slider.evaluate((element) => {
      const samples: number[] = [];
      element.addEventListener("input", (event) => samples.push(Number((event.currentTarget as HTMLInputElement).value)));
      (element as HTMLInputElement & { __samples?: number[] }).__samples = samples;
      return samples;
    });
    expect(values).toEqual([]);
    const sliderBox = await slider.boundingBox();
    if (!sliderBox) throw new Error(`${label} slider geometry is unavailable`);
    await page.mouse.move(sliderBox.x + 2, sliderBox.y + sliderBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(sliderBox.x + sliderBox.width - 2, sliderBox.y + sliderBox.height / 2, { steps: 14 });
    await page.mouse.up();
    const sampled = await slider.evaluate((element) => (element as HTMLInputElement & { __samples?: number[] }).__samples ?? []);
    expect(new Set(sampled).size, `${label} exposed four or fewer values`).toBeGreaterThan(4);

    await slider.focus();
    await slider.press("Home");
    await page.waitForTimeout(32);
    const minimum = await visual.boundingBox();
    await slider.press("End");
    await page.waitForTimeout(32);
    const maximum = await visual.boundingBox();
    if (!minimum || !maximum) throw new Error(`${label} visual geometry is unavailable`);
    expect(Math.round(minimum.x - sliderBox.x), `${label} minimum does not meet the source track`).toBe(0);
    expect(Math.round(maximum.x + maximum.width - (sliderBox.x + sliderBox.width)), `${label} maximum leaves a grey donor block`).toBe(0);
    await expect(visual).toHaveCSS("background-image", new RegExp(`${visualId}\\.png`));
    const invariantAfter = await invariant.evaluateAll((nodes) => nodes.map((node) => {
      const bounds = node.getBoundingClientRect();
      return { id: node.getAttribute("data-component-id"), bounds: [bounds.x, bounds.y, bounds.width, bounds.height], image: getComputedStyle(node).backgroundImage };
    }));
    expect(invariantAfter, `${label} changed unrelated Basic Info authority`).toEqual(invariantBefore);
  }
});

test("Basic Info minimize reaches its generated endpoint through more than four geometry steps and restores", async ({ page }) => {
  await page.goto("/");
  const basic = page.getByRole("region", { name: "基本情報" });
  const minimize = basic.getByRole("button", { name: "基本情報を最小化", exact: true });
  await expect(minimize).toHaveAttribute("data-minimize-endpoint", "/assets/japanese-rpg-v001/basic-info/minimized-plate.png");
  const before = await basic.boundingBox();
  expect(before).toMatchObject({ width: 280, height: 120 });
  const titleBefore = await basic.locator('[data-component-id="title-icon"],[data-component-id="title-text"]').evaluateAll((nodes) => nodes.map((node) => {
    const bounds = node.getBoundingClientRect();
    const root = node.closest('[data-window-id="basic-info"]')!.getBoundingClientRect();
    return { id: node.getAttribute("data-component-id"), bounds: [bounds.x - root.x, bounds.y - root.y, bounds.width, bounds.height], image: getComputedStyle(node).backgroundImage };
  }));

  const motion = page.evaluate(async () => {
    const window = document.querySelector<HTMLElement>('[data-window-id="basic-info"]');
    if (!window) throw new Error("Basic Info is unavailable");
    const samples: string[] = [];
    const start = performance.now();
    while (performance.now() - start < 260) {
      await new Promise(requestAnimationFrame);
      const bounds = window.getBoundingClientRect();
      samples.push(`${Math.round(bounds.width * 10) / 10}x${Math.round(bounds.height * 10) / 10}`);
    }
    return samples;
  });
  await minimize.click();
  const samples = await motion;
  expect(new Set(samples).size).toBeGreaterThan(4);
  await expect(basic).toHaveCSS("width", "180px");
  await expect(basic).toHaveCSS("height", "18px");
  await expect(basic.locator(".basic-info-components")).toHaveAttribute("aria-hidden", "true");
  expect(await basic.evaluate((element) => getComputedStyle(element, "::before").backgroundImage)).toContain("minimized-plate.png");
  const titleMinimized = await basic.locator('[data-component-id="title-icon"],[data-component-id="title-text"]').evaluateAll((nodes) => nodes.map((node) => {
    const bounds = node.getBoundingClientRect();
    const root = node.closest('[data-window-id="basic-info"]')!.getBoundingClientRect();
    return { id: node.getAttribute("data-component-id"), bounds: [bounds.x - root.x, bounds.y - root.y, bounds.width, bounds.height], image: getComputedStyle(node).backgroundImage };
  }));
  expect(titleMinimized).toEqual(titleBefore);

  await minimize.click();
  await expect(basic).toHaveCSS("width", "280px");
  await expect(basic).toHaveCSS("height", "120px");
  await expect(basic.locator(".basic-info-components")).toHaveAttribute("aria-hidden", "false");
  const restored = await basic.boundingBox();
  expect(restored).toEqual(before);
});

test("basic info page buttons activate their corresponding independent source windows", async ({ page }) => {
  await page.goto("/");
  const window = page.getByRole("region", { name: "基本情報" });
  await expect(window.getByRole("button", { name: "status", exact: true })).toHaveCSS("filter", "none");
  await expect(window.locator('[data-component-id="base-label"]')).toHaveCSS("width", "58px");

  const mappings = [
    ["status", "ステータス"],
    ["option", "オプション"],
    ["items", "所持アイテム"],
    ["equip", "装備アイテム"],
    ["skill", "スキルリスト"],
    ["chat", "チャットルーム"],
  ] as const;

  for (const [name, targetName] of mappings) {
    const button = window.getByRole("button", { name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    const target = page.getByRole("region", { name: targetName, exact: true });
    const targetZ = Number(await target.evaluate((element) => getComputedStyle(element).zIndex));
    const basicZ = Number(await window.evaluate((element) => getComputedStyle(element).zIndex));
    expect(targetZ, `${name} must bring ${targetName} in front of 基本情報`).toBeGreaterThan(basicZ);
  }
});

test("every Basic Info page control declares and reaches its source-approved destination", async ({ page }) => {
  const expected = {
    status: ["status", ""],
    option: ["options", ""],
    items: ["inventory", ""],
    equip: ["equipment", ""],
    skill: ["skills", ""],
    map: ["map", ""],
    chat: ["chat", ""],
    friend: ["party", "friends"],
  } as const;

  await page.goto("/");
  const inventory = await page.getByRole("region", { name: "基本情報" }).locator(".basic-info-page").evaluateAll((buttons) => buttons.map((button) => ({
    label: button.getAttribute("aria-label"),
    destination: (button as HTMLElement).dataset.destinationWindow ?? "",
    view: (button as HTMLElement).dataset.destinationView ?? "",
  })));
  expect(inventory).toHaveLength(Object.keys(expected).length);
  expect(Object.fromEntries(inventory.map(({ label, destination, view }) => [label, [destination, view]]))).toEqual(expected);

  const invariantIds = ["title-icon", "title-text", "hp-track", "hp-thumb", "sp-track", "sp-thumb"];
  for (const [label, [destination, view]] of Object.entries(expected)) {
    await page.goto("/");
    const basic = page.getByRole("region", { name: "基本情報" });
    const invariantBefore = await basic.locator(invariantIds.map((id) => `[data-component-id="${id}"]`).join(",")).evaluateAll((nodes) => nodes.map((node) => {
      const bounds = node.getBoundingClientRect();
      return { id: node.getAttribute("data-component-id"), bounds: [bounds.x, bounds.y, bounds.width, bounds.height], image: getComputedStyle(node).backgroundImage };
    }));
    await basic.getByRole("button", { name: label, exact: true }).click();
    const target = page.locator(`[data-window-id="${destination}"]`);
    await expect(target).toBeVisible();
    expect(Number(await target.evaluate((element) => getComputedStyle(element).zIndex))).toBeGreaterThan(Number(await basic.evaluate((element) => getComputedStyle(element).zIndex)));
    if (view) await expect(target.getByRole("button", { name: "友達", exact: true })).toHaveAttribute("aria-pressed", "true");
    const invariantAfter = await basic.locator(invariantIds.map((id) => `[data-component-id="${id}"]`).join(",")).evaluateAll((nodes) => nodes.map((node) => {
      const bounds = node.getBoundingClientRect();
      return { id: node.getAttribute("data-component-id"), bounds: [bounds.x, bounds.y, bounds.width, bounds.height], image: getComputedStyle(node).backgroundImage };
    }));
    expect(invariantAfter, `${label} changed Basic Info title or meter authority`).toEqual(invariantBefore);
  }
});

test("friend opens the visible Party friends destination instead of only self-selecting Basic Info", async ({ page }) => {
  await page.goto("/");
  const basic = page.getByRole("region", { name: "基本情報" });

  await basic.getByRole("button", { name: "friend", exact: true }).click();
  const party = page.getByRole("region", { name: "パーティー (Riri-Soft)" });
  await expect(party.getByRole("button", { name: "友達", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(Number(await party.evaluate((element) => getComputedStyle(element).zIndex))).toBeGreaterThan(Number(await basic.evaluate((element) => getComputedStyle(element).zIndex)));
});

test("map opens a visible movable destination instead of only self-selecting Basic Info", async ({ page }) => {
  await page.goto("/");
  const basic = page.getByRole("region", { name: "基本情報" });
  const mapButton = basic.getByRole("button", { name: "map", exact: true });
  await mapButton.click();
  const map = page.getByRole("region", { name: "マップ", exact: true });
  await expect(map).toBeVisible();
  await expect(map).toHaveAttribute("data-clean-plate", "/assets/japanese-rpg-v001/map/clean-plate.png");
  await expect(map.locator("[data-component-id]")).toHaveCount(4);
  const dragHandle = map.locator("[data-drag-handle]");
  await expect(dragHandle).toBeVisible();
  expect(Number(await map.evaluate((element) => getComputedStyle(element).zIndex))).toBeGreaterThan(Number(await basic.evaluate((element) => getComputedStyle(element).zIndex)));

  const titleGeometry = await map.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const relative = (selector: string) => {
      const child = element.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
      if (!child) throw new Error(`${selector} is unavailable`);
      return { left: child.left - bounds.left, top: child.top - bounds.top, right: child.right - bounds.left, bottom: child.bottom - bounds.top };
    };
    return {
      icon: relative('[data-component-id="map-title-icon"]'),
      title: relative('[data-component-id="map-title-text"]'),
      close: relative('button[aria-label="マップを閉じる"]'),
      body: relative('[data-component-id="map-body"]'),
    };
  });
  expect(titleGeometry.icon.right).toBeLessThanOrEqual(titleGeometry.title.left);
  expect(titleGeometry.title.right).toBeLessThanOrEqual(titleGeometry.close.left);
  expect(titleGeometry.body).toEqual({ left: 16, top: 29, right: 264, bottom: 142 });

  const evidenceDir = mkdtempSync(join(tmpdir(), "map-window-"));
  try {
    const screenshot = join(evidenceDir, "map.png");
    await map.screenshot({ path: screenshot });
    expect(pinkDominantPixelCount(screenshot, "280x150+0+0")).toBe(0);
  } finally {
    rmSync(evidenceDir, { recursive: true, force: true });
  }

  const before = await map.boundingBox();
  const handle = await dragHandle.boundingBox();
  if (!before || !handle) throw new Error("Map drag geometry is unavailable");
  await page.mouse.move(handle.x + 80, handle.y + 9);
  await page.mouse.down();
  await page.mouse.move(handle.x + 112, handle.y + 33, { steps: 8 });
  await page.mouse.up();
  const after = await map.boundingBox();
  if (!after) throw new Error("Map post-drag geometry is unavailable");
  expect(Math.round(after.x - before.x)).toBe(32);
  expect(Math.round(after.y - before.y)).toBe(24);

  await map.getByRole("button", { name: "マップを閉じる", exact: true }).click();
  await expect(map).toHaveCount(0);
  await mapButton.click();
  await expect(page.getByRole("region", { name: "マップ", exact: true })).toBeVisible();
});
