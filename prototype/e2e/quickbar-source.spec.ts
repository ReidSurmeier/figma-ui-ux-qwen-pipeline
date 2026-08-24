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

test("Every Quickbar slot owns its exact raster and reverses independently to neutral", async ({ page }) => {
  await page.goto("/?isolate=quickbar");
  const quickbar = page.getByRole("region", { name: "クイックスロット", exact: true });
  await activateWindow(quickbar);
  const bounds = await quickbar.boundingBox();
  if (!bounds) throw new Error("Quickbar geometry is unavailable");
  const expected = [
    { x: 2, y: 2, width: 42, height: 42 },
    { x: 44, y: 1, width: 42, height: 43 },
    { x: 2, y: 50, width: 76, height: 42 },
  ];
  const slots = [1, 2, 3].map((number) => quickbar.getByRole("button", { name: `クイックスロット ${number}`, exact: true }));
  const neutral = await Promise.all(slots.map((slot) => slot.screenshot()));

  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index];
    await expect(slot).toHaveAttribute("data-visual-component", `quickbar-slot-${index}`);
    expect(await slot.boundingBox()).toMatchObject({
      x: bounds.x + expected[index].x,
      y: bounds.y + expected[index].y,
      width: expected[index].width,
      height: expected[index].height,
    });

    await slot.click();
    await expect(slot).toHaveAttribute("aria-pressed", "true");
    await expect(quickbar.locator('.quickbar-source-slot[aria-pressed="true"]')).toHaveCount(1);
    await expect(quickbar.getByRole("status")).toHaveText(`slot ${index + 1}`);
    for (let sibling = 0; sibling < slots.length; sibling += 1) {
      const current = await slots[sibling].screenshot();
      expect(current.equals(neutral[sibling]), `slot ${sibling + 1} changed while selecting slot ${index + 1}`).toBe(sibling !== index);
    }

    await slot.click();
    await expect(quickbar.locator('.quickbar-source-slot[aria-pressed="true"]')).toHaveCount(0);
    await expect(quickbar.getByRole("status")).toHaveText("slot ready");
    for (let sibling = 0; sibling < slots.length; sibling += 1) {
      expect((await slots[sibling].screenshot()).equals(neutral[sibling]), `slot ${sibling + 1} did not restore to neutral`).toBe(true);
    }
  }
});

test("Quickbar keyboard activation and drag preserve exact selection ownership", async ({ page }) => {
  await page.goto("/?isolate=quickbar");
  const quickbar = page.getByRole("region", { name: "クイックスロット", exact: true });
  await activateWindow(quickbar);
  const third = quickbar.getByRole("button", { name: "クイックスロット 3", exact: true });
  await third.focus();
  await third.press("Enter");
  await expect(third).toHaveAttribute("aria-pressed", "true");

  const before = await quickbar.boundingBox();
  const handle = quickbar.locator("[data-drag-handle]");
  const handleBounds = await handle.boundingBox();
  if (!before || !handleBounds) throw new Error("Quickbar drag geometry is unavailable");
  await page.mouse.move(handleBounds.x + handleBounds.width / 2, handleBounds.y + 20);
  await page.mouse.down();
  await page.mouse.move(handleBounds.x - 25, handleBounds.y + 45, { steps: 8 });
  await page.mouse.up();
  const after = await quickbar.boundingBox();
  expect(after?.x).toBe(before.x - 25 - handleBounds.width / 2);
  expect(after?.y).toBe(before.y + 25);
  await expect(third).toHaveAttribute("aria-pressed", "true");
  await third.press("Space");
  await expect(quickbar.locator('.quickbar-source-slot[aria-pressed="true"]')).toHaveCount(0);
});
