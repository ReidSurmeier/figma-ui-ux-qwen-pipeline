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

test("basic info page buttons map to their own stable source regions", async ({ page }) => {
  await page.goto("/");
  const window = page.getByRole("region", { name: "基本情報" });
  await expect(window.getByRole("button", { name: "status", exact: true })).toHaveCSS("filter", "none");
  await expect(window.locator('[data-component-id="base-label"]')).toHaveCSS("width", "58px");
  for (const name of ["status", "option", "items", "equip", "skill", "map", "chat", "friend"]) {
    const button = window.getByRole("button", { name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(window.getByRole("status")).toHaveText(`${name} を開きました`);
  }
});
