import { expect, test } from "@playwright/test";

const windowIds = [
  "basic-info", "card", "skills", "status", "inventory", "equipment", "options", "chat",
  "exchange", "game-menu", "compact-info", "party", "quickbar", "bottom-bar", "notification",
];

for (const windowId of windowIds) {
  test(`${windowId} can be inspected without any other desktop window`, async ({ page }) => {
    await page.goto(`/?isolate=${windowId}`, { waitUntil: "networkidle" });

    await expect(page.locator("[data-window-id]")).toHaveCount(1);
    await expect(page.locator(`[data-window-id="${windowId}"]`)).toBeVisible();
    await expect(page.locator("main[data-isolated-window]")).toHaveAttribute("data-isolated-window", windowId);
  });
}
