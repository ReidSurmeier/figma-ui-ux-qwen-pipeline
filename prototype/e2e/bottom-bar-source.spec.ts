import { expect, test, type Locator } from "@playwright/test";

async function activateWindow(window: Locator) {
  await window.dispatchEvent("pointerdown");
  await expect.poll(() => window.evaluate((element) => {
    const z = Number(getComputedStyle(element).zIndex);
    const all = [...element.parentElement!.querySelectorAll<HTMLElement>("[data-window-id]")].map((node) => Number(getComputedStyle(node).zIndex));
    return z === Math.max(...all);
  })).toBe(true);
  await window.page().evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

test("Bottom Bar slider owns its complete visible thumb and reaches both endpoints by drag", async ({ page }) => {
  await page.goto("/");
  const bottomBar = page.getByRole("region", { name: "クイックスロットバー" });
  const slider = bottomBar.getByRole("slider", { name: "クイックスロット位置" });
  await expect(slider).toHaveAttribute("data-visual-component", "bottom-bar-thumb");
  await activateWindow(bottomBar);
  const thumb = bottomBar.locator('[data-component-id="bottom-bar-thumb"]');
  const bounds = await bottomBar.boundingBox();
  if (!bounds) throw new Error("Bottom Bar source geometry is unavailable");
  const titleInvariant = { x: bounds.x, y: bounds.y, width: 96, height: 21 };
  const navigationInvariant = { x: bounds.x + 580, y: bounds.y, width: 20, height: 21 };
  const titleBefore = await page.screenshot({ clip: titleInvariant });
  const navigationBefore = await page.screenshot({ clip: navigationInvariant });
  await slider.fill("0");
  const initialThumb = await thumb.boundingBox();
  if (!initialThumb) throw new Error("Bottom Bar thumb geometry is unavailable");

  await page.mouse.move(initialThumb.x + initialThumb.width / 2, initialThumb.y + initialThumb.height / 2);
  await page.mouse.down();
  await page.mouse.move(initialThumb.x + 476, initialThumb.y + initialThumb.height / 2, { steps: 24 });
  await page.mouse.up();
  await expect(slider).toHaveValue("100");
  await expect(thumb).toHaveCSS("left", "570px");

  const finalThumb = await thumb.boundingBox();
  if (!finalThumb) throw new Error("Bottom Bar final thumb geometry is unavailable");
  await page.mouse.move(finalThumb.x + finalThumb.width / 2, finalThumb.y + finalThumb.height / 2);
  await page.mouse.down();
  await page.mouse.move(initialThumb.x + 4, initialThumb.y + initialThumb.height / 2, { steps: 24 });
  await page.mouse.up();
  await expect(slider).toHaveValue("0");
  await expect(thumb).toHaveCSS("left", "98px");
  expect((await page.screenshot({ clip: titleInvariant })).equals(titleBefore), "Bottom Bar drag changed its source title").toBe(true);
  expect((await page.screenshot({ clip: navigationInvariant })).equals(navigationBefore), "Bottom Bar drag changed its navigation buttons").toBe(true);
});

test("Bottom Bar previous and next controls are reversible and leave slider plus title invariant", async ({ page }) => {
  await page.goto("/");
  const bottomBar = page.getByRole("region", { name: "クイックスロットバー" });
  const previous = bottomBar.getByRole("button", { name: "前のスロット", exact: true });
  const next = bottomBar.getByRole("button", { name: "次のスロット", exact: true });
  await expect(previous).toHaveAttribute("data-visual-component", "bottom-bar-previous");
  await expect(next).toHaveAttribute("data-visual-component", "bottom-bar-next");
  await activateWindow(bottomBar);
  const bounds = await bottomBar.boundingBox();
  if (!bounds) throw new Error("Bottom Bar source geometry is unavailable");
  const fixedClip = { x: bounds.x, y: bounds.y, width: 580, height: 21 };
  const fixedAuthority = await page.screenshot({ clip: fixedClip });
  const status = bottomBar.getByRole("status");

  await previous.click();
  await expect(previous).toHaveAttribute("aria-pressed", "true");
  await expect(next).toHaveAttribute("aria-pressed", "false");
  await expect(status).toHaveText("slot -1 position 0");
  await next.click();
  await expect(previous).toHaveAttribute("aria-pressed", "false");
  await expect(next).toHaveAttribute("aria-pressed", "false");
  await expect(status).toHaveText("slot 0 position 0");

  await next.click();
  await expect(next).toHaveAttribute("aria-pressed", "true");
  await expect(status).toHaveText("slot 1 position 0");
  await previous.click();
  await expect(previous).toHaveAttribute("aria-pressed", "false");
  await expect(next).toHaveAttribute("aria-pressed", "false");
  await expect(status).toHaveText("slot 0 position 0");
  expect((await page.screenshot({ clip: fixedClip })).equals(fixedAuthority), "Bottom Bar navigation changed its title, rail, or slider").toBe(true);
});
