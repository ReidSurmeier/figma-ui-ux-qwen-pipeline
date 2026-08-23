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

test("Every Equipment row owns its exact source column and transfers exclusive selection", async ({ page }) => {
  await page.goto("/");
  const equipment = page.getByRole("region", { name: "装備アイテム" });
  await activateWindow(equipment);
  const bounds = await equipment.boundingBox();
  if (!bounds) throw new Error("Equipment geometry is unavailable");
  const titleClip = { x: bounds.x, y: bounds.y, width: 280, height: 18 };
  const avatarClip = { x: bounds.x + 109, y: bounds.y + 18, width: 61, height: 134 };
  const titleAuthority = await page.screenshot({ clip: titleClip });
  const avatarAuthority = await page.screenshot({ clip: avatarClip });

  for (const side of ["左", "右"] as const) {
    for (let row = 0; row < 5; row += 1) {
      const control = equipment.getByRole("button", { name: `${side}装備 ${row + 1}`, exact: true });
      const componentId = `equipment-${side === "左" ? "left" : "right"}-${row}`;
      await expect(control).toHaveAttribute("data-visual-component", componentId);
      const controlBounds = await control.boundingBox();
      if (!controlBounds) throw new Error(`${side}装備 ${row + 1} has no pointer geometry`);
      expect(controlBounds.x - bounds.x).toBe(side === "左" ? 4 : 170);
      expect(controlBounds.width).toBe(side === "左" ? 105 : 106);
      expect(controlBounds.y - bounds.y).toBe(row === 4 ? 134 : 18 + row * 29);
      expect(controlBounds.height).toBe(row === 4 ? 18 : 29);
      await control.click();
      await expect(control).toHaveAttribute("aria-pressed", "true");
      await expect(equipment.locator('.equipment-source-row[aria-pressed="true"]')).toHaveCount(1);
      await expect(equipment.getByRole("status")).toHaveText(`${side === "左" ? "left" : "right"}-${row}`);
    }
  }

  expect((await page.screenshot({ clip: titleClip })).equals(titleAuthority), "Equipment selection changed the title").toBe(true);
  expect((await page.screenshot({ clip: avatarClip })).equals(avatarAuthority), "Equipment selection changed the avatar").toBe(true);
});

test("Equipment minimize uses its generated compact endpoint through complete motion and restores", async ({ page }) => {
  await page.goto("/");
  const equipment = page.getByRole("region", { name: "装備アイテム" });
  const minimize = equipment.getByRole("button", { name: "装備アイテムを最小化", exact: true });
  await expect(minimize).toHaveAttribute("data-minimize-endpoint", "/assets/japanese-rpg-v001/equipment/minimized-plate.png");
  await activateWindow(equipment);
  const expanded = await equipment.screenshot();
  const expandedBounds = await equipment.boundingBox();
  expect(expandedBounds).toMatchObject({ width: 280, height: 152 });

  await minimize.click();
  const geometries = new Set<string>();
  for (let frame = 0; frame < 16; frame += 1) {
    await page.waitForTimeout(16);
    const box = await equipment.boundingBox();
    if (box) geometries.add(`${Math.round(box.width)}x${Math.round(box.height)}`);
  }
  expect(geometries.size).toBeGreaterThan(4);
  await expect(equipment).toHaveCSS("background-image", /equipment\/minimized-plate\.png/);
  await expect(equipment.locator(".source-window__components")).toHaveCount(0);
  expect(await equipment.boundingBox()).toMatchObject({ width: 180, height: 18 });

  await minimize.click();
  await expect(equipment).toHaveCSS("width", "280px");
  await expect(equipment).toHaveCSS("height", "152px");
  expect((await equipment.screenshot()).equals(expanded), "Equipment did not restore its exact expanded pixels").toBe(true);
});

test("Equipment close removes the window and Basic Info restores its complete destination", async ({ page }) => {
  await page.goto("/");
  const equipment = page.getByRole("region", { name: "装備アイテム" });
  const close = equipment.getByRole("button", { name: "装備アイテムを閉じる", exact: true });
  await expect(close).toHaveAttribute("data-close-window", "equipment");
  await close.click();
  await expect(equipment).toHaveCount(0);
  await page.getByRole("region", { name: "基本情報" }).getByRole("button", { name: "equip", exact: true }).click();
  await expect(equipment).toBeVisible();
  await expect(equipment).toHaveCSS("width", "280px");
  await expect(equipment).toHaveCSS("height", "152px");
  await expect(equipment.locator("[data-component-id]")).toHaveCount(15);
});
