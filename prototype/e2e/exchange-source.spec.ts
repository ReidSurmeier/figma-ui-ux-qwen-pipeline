import { expect, test, type Locator, type Page } from "@playwright/test";

async function activateWindow(window: Locator) {
  await window.dispatchEvent("pointerdown");
  await expect.poll(() => window.evaluate((element) => {
    const z = Number(getComputedStyle(element).zIndex);
    const all = [...element.parentElement!.querySelectorAll<HTMLElement>("[data-window-id]")].map((node) => Number(getComputedStyle(node).zIndex));
    return z === Math.max(...all);
  })).toBe(true);
	await window.evaluate(async (root) => {
		const urls = [root, ...root.querySelectorAll<HTMLElement>("*")].flatMap((node) => (
			[...getComputedStyle(node).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((match) => match[1])
		));
		await Promise.all([...new Set(urls)].map(async (url) => {
			const image = new Image();
			image.src = url;
			await image.decode();
		}));
	});
  await window.page().evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function stableClip(page: Page, clip: { x: number; y: number; width: number; height: number }) {
	let previous = await page.screenshot({ clip });
	for (let attempt = 0; attempt < 8; attempt += 1) {
		await page.waitForTimeout(24);
		const current = await page.screenshot({ clip });
		if (current.equals(previous)) return current;
		previous = current;
	}
	throw new Error("Exchange authority did not settle to two identical frames");
}

test("Every Exchange item owns its exact grid cell and transfers exclusive selection", async ({ page }) => {
  await page.goto("/");
  const exchange = page.getByRole("region", { name: "交換ウィンドウ: ANRI" });
  await activateWindow(exchange);
  const bounds = await exchange.boundingBox();
  if (!bounds) throw new Error("Exchange geometry is unavailable");
  const titleClip = { x: bounds.x, y: bounds.y, width: 280, height: 18 };
  const summaryClip = { x: bounds.x + 4, y: bounds.y + 87, width: 272, height: 14 };
  const titleAuthority = await stableClip(page, titleClip);
  const summaryAuthority = await stableClip(page, summaryClip);

  for (let index = 0; index < 16; index += 1) {
    const item = exchange.getByRole("button", { name: `交換アイテム ${index + 1}`, exact: true });
    const row = Math.floor(index / 8);
    const column = index % 8;
    await expect(item).toHaveAttribute("data-visual-component", `exchange-item-${row}-${column}`);
    expect(await item.boundingBox()).toMatchObject({ x: bounds.x + 5 + column * 34, y: bounds.y + 19 + row * 34, width: 34, height: 34 });
    await item.click();
    await expect(item).toHaveAttribute("aria-pressed", "true");
    await expect(exchange.locator('.exchange-source-item[aria-pressed="true"]')).toHaveCount(1);
    await expect(exchange.getByRole("status")).toHaveText(`交換アイテム ${index + 1} を選択`);
  }

  expect((await stableClip(page, titleClip)).equals(titleAuthority), "Exchange selection changed its title").toBe(true);
  expect((await stableClip(page, summaryClip)).equals(summaryAuthority), "Exchange selection changed its summary bars").toBe(true);
});

test("Exchange confirm enables Trade and Trade or cancel restore a clean transaction", async ({ page }) => {
  await page.goto("/");
  const exchange = page.getByRole("region", { name: "交換ウィンドウ: ANRI" });
  const ok = exchange.getByRole("button", { name: "OK", exact: true });
  const trade = exchange.getByRole("button", { name: "trade", exact: true });
  const cancel = exchange.getByRole("button", { name: "cancel", exact: true });
  await expect(ok).toHaveAttribute("data-visual-component", "exchange-ok");
  await expect(trade).toHaveAttribute("data-visual-component", "exchange-trade");
  await expect(cancel).toHaveAttribute("data-visual-component", "exchange-cancel");
  await expect(ok).toBeDisabled();
  await expect(trade).toBeDisabled();

  await exchange.getByRole("button", { name: "交換アイテム 1", exact: true }).click();
  await expect(ok).toBeEnabled();
  await ok.click();
  await expect(ok).toHaveAttribute("aria-pressed", "true");
  await expect(trade).toBeEnabled();
  await expect(exchange.getByRole("status")).toHaveText("交換内容を確認しました");
  await trade.click();
  await expect(exchange.locator('.exchange-source-item[aria-pressed="true"]')).toHaveCount(0);
  await expect(ok).toBeDisabled();
  await expect(trade).toBeDisabled();
  await expect(exchange.getByRole("status")).toHaveText("交換しました");

  await exchange.getByRole("button", { name: "交換アイテム 2", exact: true }).click();
  await ok.click();
  await expect(trade).toBeEnabled();
  await cancel.click();
  await expect(exchange.locator('.exchange-source-item[aria-pressed="true"]')).toHaveCount(0);
  await expect(ok).toBeDisabled();
  await expect(trade).toBeDisabled();
  await expect(cancel).toHaveAttribute("aria-pressed", "true");
  await expect(exchange.getByRole("status")).toHaveText("交換をキャンセルしました");
});
