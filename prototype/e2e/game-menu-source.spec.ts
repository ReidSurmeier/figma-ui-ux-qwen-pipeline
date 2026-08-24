import { expect, test, type Locator } from "@playwright/test";

const labels = ["Return to last save point", "Character Select", "Exit to Windows", "Return to game"];

async function activateWindow(window: Locator) {
  await window.dispatchEvent("pointerdown");
  await expect.poll(() => window.evaluate((element) => {
    const z = Number(getComputedStyle(element).zIndex);
    const all = [...element.parentElement!.querySelectorAll<HTMLElement>("[data-window-id]")].map((node) => Number(getComputedStyle(node).zIndex));
    return z === Math.max(...all);
  })).toBe(true);
  await window.page().evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

test("Every Game Menu action owns its source row, transfers selection, and toggles back to ready", async ({ page }) => {
  await page.goto("/?isolate=game-menu");
  const menu = page.getByRole("region", { name: "ゲームメニュー" });
  await activateWindow(menu);
  const bounds = await menu.boundingBox();
  if (!bounds) throw new Error("Game Menu geometry is unavailable");
  const titleClip = { x: bounds.x, y: bounds.y, width: 222, height: 18 };
  const titleAuthority = await page.screenshot({ clip: titleClip });

  for (let row = 0; row < labels.length; row += 1) {
    const action = menu.getByRole("button", { name: labels[row], exact: true });
    await expect(action).toHaveAttribute("data-visual-component", `game-menu-action-${row}`);
    expect(await action.boundingBox()).toMatchObject({ x: bounds.x, y: bounds.y + 29 + row * 25, width: 193, height: 22 });
    await action.click();
    await expect(action).toHaveAttribute("aria-pressed", "true");
    await expect(menu.locator('.game-menu-source-action[aria-pressed="true"]')).toHaveCount(1);
    await expect(menu.getByRole("status")).toHaveText(labels[row]);
  }

  const last = menu.getByRole("button", { name: labels.at(-1)!, exact: true });
  await last.click();
  await expect(menu.locator('.game-menu-source-action[aria-pressed="true"]')).toHaveCount(0);
  await expect(menu.getByRole("status")).toHaveText("menu ready");
  expect((await page.screenshot({ clip: titleClip })).equals(titleAuthority), "Game Menu selection changed its Japanese title").toBe(true);
});
