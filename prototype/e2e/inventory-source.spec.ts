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
  await window.getByRole("button", { name: "equip", exact: true }).click();
  await expect(window.getByRole("button", { name: "equip", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(window.locator(".inventory-source-cell")).toHaveCount(14);
  await window.getByRole("button", { name: "etc", exact: true }).click();
  await expect(window.locator(".inventory-source-cell")).toHaveCount(7);
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

test("inventory minimize uses a generated compact endpoint", async ({ page }) => {
  await page.goto("/");
  const window = page.getByRole("region", { name: "所持アイテム" });
  const minimize = window.getByRole("button", { name: "所持アイテムを最小化" });
  await minimize.click();
  await expect(window).toHaveCSS("width", "180px");
  await expect(window).toHaveCSS("height", "18px");
  await expect(window.locator(".source-window__components")).toHaveCount(0);
  await minimize.click();
  await expect(window).toHaveCSS("width", "280px");
});
