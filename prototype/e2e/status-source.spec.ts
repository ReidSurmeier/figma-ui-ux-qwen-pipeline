import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function opaquePinkPixelCount(path: string) {
  return Number(execFileSync("convert", [
    path, "-alpha", "set",
    "-fx", "(a>0.1&&r>0.58&&b>0.58&&g<0.7&&(r-g)>0.15&&(b-g)>0.15)?1:0",
    "-format", "%[fx:mean*w*h]", "info:",
  ], { encoding: "utf8" }).trim());
}

test("status is a Qwen clean plate plus independent source-locked raster groups", async ({ page }) => {
  await page.goto("/");
  const window = page.getByRole("region", { name: "ステータス" });
  await expect(window).toHaveAttribute("data-clean-plate", "/assets/japanese-rpg-v001/status/clean-plate.png");
  await expect(window.locator("[data-component-id]")).toHaveCount(17);

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
  await page.goto("/");
  const window = page.getByRole("region", { name: "ステータス" });
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
  const labelBefore = await page.screenshot({ clip: labelClip });
  const valueBefore = await page.screenshot({ clip: valueClip });

  await expect(button).toHaveAttribute("aria-pressed", "false");
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");

  const labelAfter = await page.screenshot({ clip: labelClip });
  const valueAfter = await page.screenshot({ clip: valueClip });
  expect(labelAfter.equals(labelBefore), "the source Str label must remain pixel-identical").toBe(true);
  expect(valueAfter.equals(valueBefore), "the visible Str value must change").toBe(false);
});

test("status tabs map to their own content and restore the source table", async ({ page }) => {
  await page.goto("/");
  const window = page.getByRole("region", { name: "ステータス" });
  await window.getByRole("button", { name: "info" }).click();
  await expect(window.getByRole("button", { name: "info" })).toHaveAttribute("aria-pressed", "true");
  await expect(window.getByRole("tabpanel")).toContainText("キャラクター情報");
  await window.getByRole("button", { name: "stats" }).click();
  await expect(window.getByRole("button", { name: "stats" })).toHaveAttribute("aria-pressed", "true");
  await expect(window.locator('[data-component-id="status-primary-row-0"]')).toBeVisible();
});

test("status minimize uses a generated compact endpoint and restores the full source geometry", async ({ page }) => {
  await page.goto("/");
  const window = page.getByRole("region", { name: "ステータス" });
  const minimize = window.getByRole("button", { name: "ステータスを最小化" });
  await minimize.click();
  await expect(window).toHaveCSS("width", "180px");
  await expect(window).toHaveCSS("height", "18px");
  await expect(window.locator(".source-window__components")).toHaveCount(0);
  await expect(window).toHaveCSS("background-image", /status\/minimized-plate\.png/);
  await minimize.click();
  await expect(window).toHaveCSS("width", "280px");
  await expect(window).toHaveCSS("height", "126px");
});
