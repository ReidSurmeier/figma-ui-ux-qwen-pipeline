import { expect, test } from "@playwright/test";

test("Card art rotation is reversible and leaves title plus copy pixels invariant", async ({ page }) => {
  await page.goto("/");
  const card = page.getByRole("region", { name: "ソルジャースケルトンカード" });
  const rotate = card.getByRole("button", { name: "カードを回転", exact: true });
  await expect(rotate).toHaveAttribute("data-visual-component", "card-art");
  await card.click({ position: { x: 200, y: 9 } });
  const art = card.locator('[data-component-id="card-art"]');
  const bounds = await card.boundingBox();
  if (!bounds) throw new Error("Card geometry is unavailable");
  const titleClip = { x: bounds.x, y: bounds.y, width: 280, height: 18 };
  const copyClip = { x: bounds.x + 90, y: bounds.y + 20, width: 155, height: 92 };
  const titleAuthority = await page.screenshot({ clip: titleClip });
  const copyAuthority = await page.screenshot({ clip: copyClip });
  const idle = await art.screenshot();

  await rotate.click();
  await expect(rotate).toHaveAttribute("aria-pressed", "true");
  await expect(rotate).not.toHaveCSS("transform", "none");
  const rotated = await art.screenshot();
  expect(rotated.equals(idle), "Card art did not visibly rotate").toBe(false);
  expect((await page.screenshot({ clip: titleClip })).equals(titleAuthority), "Card rotation changed its title").toBe(true);
  expect((await page.screenshot({ clip: copyClip })).equals(copyAuthority), "Card rotation changed its Japanese copy").toBe(true);

  await rotate.click();
  await expect(rotate).toHaveAttribute("aria-pressed", "false");
  await expect(rotate).toHaveCSS("transform", "none");
  expect((await art.screenshot()).equals(idle), "Card art did not restore its idle pixels").toBe(true);
});

test("Card real scroll gestures move copy and one visual thumb without entering title or art", async ({ page }) => {
  await page.goto("/");
  const card = page.getByRole("region", { name: "ソルジャースケルトンカード" });
  const slider = card.getByRole("slider", { name: "カード情報スクロール" });
  await expect(slider).toHaveAttribute("data-visual-component", "card-scrollbar-thumb");
  await card.click({ position: { x: 200, y: 9 } });
  const thumb = card.locator('[data-component-id="card-scrollbar-thumb"]');
  await expect(thumb).toHaveCount(1);
  const bounds = await card.boundingBox();
  const sliderBounds = await slider.boundingBox();
  if (!bounds || !sliderBounds) throw new Error("Card scroll geometry is unavailable");
  const titleClip = { x: bounds.x, y: bounds.y, width: 280, height: 18 };
  const artClip = { x: bounds.x + 5, y: bounds.y + 18, width: 82, height: 96 };
  const copyClip = { x: bounds.x + 90, y: bounds.y + 20, width: 155, height: 92 };
  const titleAuthority = await page.screenshot({ clip: titleClip });
  const artAuthority = await page.screenshot({ clip: artClip });
  const values = new Set<number>();
  const copyStates = new Set<string>();

  await slider.focus();
  await slider.press("Home");
  for (let step = 1; step < 10; step += 1) {
    await page.mouse.click(sliderBounds.x + sliderBounds.width / 2, sliderBounds.y + sliderBounds.height * (step / 10));
    const value = Number(await slider.inputValue());
    values.add(value);
    copyStates.add((await page.screenshot({ clip: copyClip })).toString("base64"));
    expect((await page.screenshot({ clip: titleClip })).equals(titleAuthority), `Card scroll ${value} entered the title`).toBe(true);
    expect((await page.screenshot({ clip: artClip })).equals(artAuthority), `Card scroll ${value} changed the card art`).toBe(true);
    expect(Math.round((await thumb.boundingBox())!.y - bounds.y)).toBe(44 + Math.round(value * 0.27));
  }
  expect(values.size).toBeGreaterThan(4);
  expect(copyStates.size).toBeGreaterThan(4);
  await slider.focus();
  await slider.press("Home");
  await expect(thumb).toHaveCSS("top", "44px");
  await slider.press("End");
  await expect(thumb).toHaveCSS("top", "71px");
});

test("Card slot controls the Card scroll state without changing title or art", async ({ page }) => {
  await page.goto("/");
  const card = page.getByRole("region", { name: "ソルジャースケルトンカード" });
  const slider = card.getByRole("slider", { name: "カード情報スクロール" });
  const slot = card.getByRole("button", { name: "カードスロット", exact: true });
  await expect(slider).toHaveAttribute("id", "card-info-scroll");
  await expect(slot).toHaveAttribute("aria-controls", "card-info-scroll");
  await card.click({ position: { x: 200, y: 9 } });
  const bounds = await card.boundingBox();
  if (!bounds) throw new Error("Card geometry is unavailable");
  const titleClip = { x: bounds.x, y: bounds.y, width: 280, height: 18 };
  const artClip = { x: bounds.x + 5, y: bounds.y + 18, width: 82, height: 96 };
  const titleAuthority = await page.screenshot({ clip: titleClip });
  const artAuthority = await page.screenshot({ clip: artClip });

  await expect(slider).toHaveValue("0");
  await expect(slot).toHaveAttribute("aria-pressed", "false");
  await slot.click();
  await expect(slider).toHaveValue("70");
  await expect(slot).toHaveAttribute("aria-pressed", "true");
  await slot.click();
  await expect(slider).toHaveValue("30");
  await expect(slot).toHaveAttribute("aria-pressed", "false");
  expect((await page.screenshot({ clip: titleClip })).equals(titleAuthority), "Card slot changed its title").toBe(true);
  expect((await page.screenshot({ clip: artClip })).equals(artAuthority), "Card slot changed its art").toBe(true);
});

test("Card close target removes exactly the Card window", async ({ page }) => {
  await page.goto("/");
  const card = page.getByRole("region", { name: "ソルジャースケルトンカード" });
  const close = card.getByRole("button", { name: "ソルジャースケルトンカードを閉じる", exact: true });
  const windowsBefore = await page.locator('[data-window-id]').count();
  await expect(close).toHaveAttribute("data-close-window", "card");
  await close.click();
  await expect(card).toHaveCount(0);
  await expect(page.locator('[data-window-id]')).toHaveCount(windowsBefore - 1);
});
