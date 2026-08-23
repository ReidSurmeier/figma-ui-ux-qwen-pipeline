import { expect, test } from "@playwright/test";

const windows = [
  { name: "ソルジャースケルトンカード", id: "card", minimumComponents: 10 },
  { name: "スキルリスト", id: "skills", minimumComponents: 18 },
  { name: "装備アイテム", id: "equipment", minimumComponents: 12 },
  { name: "チャットルーム", id: "chat", minimumComponents: 10 },
  { name: "交換ウィンドウ: ANRI", id: "exchange", minimumComponents: 20 },
  { name: "ゲームメニュー", id: "game-menu", minimumComponents: 6 },
  { name: "パーティー (Riri-Soft)", id: "party", minimumComponents: 16 },
  { name: "クイックスロット", id: "quickbar", minimumComponents: 3 },
  { name: "簡易情報", id: "compact-info", minimumComponents: 5 },
  { name: "クイックスロットバー", id: "bottom-bar", minimumComponents: 4 },
  { name: "通知", id: "notification", minimumComponents: 3 },
];

test("remaining windows use component assets and never request reference screenshots", async ({ page }) => {
  await page.goto("/");
  for (const definition of windows) {
    const window = page.getByRole("region", { name: definition.name, exact: true });
    await expect(window).toHaveAttribute("data-clean-plate", `/assets/japanese-rpg-v001/${definition.id}/clean-plate.png`);
    expect(await window.locator("[data-component-id]").count()).toBeGreaterThanOrEqual(definition.minimumComponents);
  }
  const requests = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name));
  expect(requests.filter((url) => /benchmarks\/|\/regions\/[^/]+\/reference\.png/.test(url))).toEqual([]);
});

test("remaining source windows expose meaningful reversible user flows", async ({ page }) => {
  await page.goto("/");

  const card = page.getByRole("region", { name: "ソルジャースケルトンカード" });
  await card.getByRole("button", { name: "カードを回転" }).click();
  await expect(card.getByRole("button", { name: "カードを回転" })).toHaveAttribute("aria-pressed", "true");
  const skills = page.getByRole("region", { name: "スキルリスト" });
  await skills.getByRole("option", { name: /ヒール/ }).click();
  await expect(skills.getByRole("option", { name: /ヒール/ })).toHaveAttribute("aria-selected", "true");
  await skills.getByRole("button", { name: "ヒールをレベルアップ" }).click();
  await expect(skills.getByRole("status")).toContainText("ヒール Lv+1");

  const equipment = page.getByRole("region", { name: "装備アイテム" });
  await equipment.getByRole("button", { name: "右装備 3" }).click();
  await expect(equipment.getByRole("button", { name: "右装備 3" })).toHaveAttribute("aria-pressed", "true");
  await equipment.getByRole("button", { name: "キャラクターを回転" }).click();
  await expect(equipment.getByRole("button", { name: "キャラクターを回転" })).toHaveAttribute("data-turn", "1");

  const exchange = page.getByRole("region", { name: "交換ウィンドウ: ANRI" });
  await exchange.getByRole("button", { name: "交換アイテム 7" }).click();
  await expect(exchange.getByRole("button", { name: "交換アイテム 7" })).toHaveAttribute("aria-pressed", "true");
  await exchange.getByRole("button", { name: "OK" }).click();
  await expect(exchange.getByRole("button", { name: "trade" })).toBeEnabled();
  await exchange.getByRole("button", { name: "cancel" }).click();
  await expect(exchange.getByRole("button", { name: "trade" })).toBeDisabled();

  const menu = page.getByRole("region", { name: "ゲームメニュー" });
  await menu.getByRole("button", { name: "Character Select" }).click();
  await expect(menu.getByRole("button", { name: "Character Select" })).toHaveAttribute("aria-pressed", "true");

  const party = page.getByRole("region", { name: "パーティー (Riri-Soft)" });
  await party.getByRole("option", { name: /Sebas/ }).click();
  await party.getByRole("button", { name: "next" }).click();
  await expect(party.getByRole("status")).toContainText("2/2");

  const quickbar = page.getByRole("region", { name: "クイックスロット", exact: true });
  await quickbar.getByRole("button", { name: "クイックスロット 3" }).click();
  await expect(quickbar.getByRole("button", { name: "クイックスロット 3" })).toHaveAttribute("aria-pressed", "true");

  const compact = page.getByRole("region", { name: "簡易情報" });
  await expect(compact.locator('[data-component-id="compact-hp"]')).toBeVisible();
  await expect(compact.locator('[data-component-id="compact-sp"]')).toBeVisible();

  const bottomBar = page.getByRole("region", { name: "クイックスロットバー" });
  await bottomBar.getByRole("button", { name: "次のスロット" }).click();
  await expect(bottomBar.getByRole("status")).toContainText("slot 1");
  const bottomSlider = bottomBar.getByRole("slider", { name: "クイックスロット位置" });
  await bottomSlider.fill("100");
  await expect(bottomBar.locator(".bottom-bar-source-thumb")).toHaveCSS("left", "570px");
  await bottomSlider.fill("0");
  await expect(bottomBar.locator(".bottom-bar-source-thumb")).toHaveCSS("left", "98px");

  const notification = page.getByRole("region", { name: "通知" });
  await notification.getByRole("button", { name: "次の通知" }).click();
  await expect(notification.getByRole("button", { name: "次の通知" })).toHaveAttribute("aria-pressed", "true");
});

test("card and skills sliders expose more than four positions and reach both endpoints", async ({ page }) => {
  await page.goto("/");
  for (const name of ["カード情報スクロール", "スキルスクロール"] as const) {
    const slider = page.getByRole("slider", { name });
    const values = await slider.evaluate((element) => {
      const input = element as HTMLInputElement;
      const emitted: number[] = [];
      input.addEventListener("input", () => emitted.push(input.valueAsNumber));
      for (let value = 0; value <= 100; value += 5) {
        input.value = String(value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      return emitted;
    });
    expect(new Set(values).size).toBe(21);
    await expect(slider).toHaveValue("100");
  }
});

test("card scrollbar moves its visible source thumb between exact endpoints", async ({ page }) => {
  await page.goto("/");
  const card = page.getByRole("region", { name: "ソルジャースケルトンカード" });
  const slider = card.getByRole("slider", { name: "カード情報スクロール" });
  const thumb = card.locator(".card-source-thumb");

  await slider.fill("0");
  await expect(thumb).toHaveCSS("top", "44px");
  const minimum = await card.screenshot();

  await slider.fill("100");
  await expect(thumb).toHaveCSS("top", "71px");
  const maximum = await card.screenshot();

  expect(maximum.equals(minimum)).toBe(false);
});

test("card scrolling moves the visible Japanese copy rather than only its thumb", async ({ page }) => {
  await page.goto("/");
  const card = page.getByRole("region", { name: "ソルジャースケルトンカード" });
  const slider = card.getByRole("slider", { name: "カード情報スクロール" });
  const bounds = await card.boundingBox();
  if (!bounds) throw new Error("Card window geometry is unavailable");
  const copyViewport = {
    x: bounds.x + 90,
    y: bounds.y + 20,
    width: 155,
    height: 92,
  };

  await slider.fill("0");
  const copyAtTop = await page.screenshot({ clip: copyViewport });
  await slider.fill("100");
  await page.waitForTimeout(40);
  const copyAtBottom = await page.screenshot({ clip: copyViewport });

  expect(copyAtBottom.equals(copyAtTop), "the copy viewport stayed frozen while the thumb moved").toBe(false);
});

test("skills scrollbar moves its visible source thumb through more than four positions", async ({ page }) => {
  await page.goto("/");
  const skills = page.getByRole("region", { name: "スキルリスト" });
  const slider = skills.getByRole("slider", { name: "スキルスクロール" });
  const thumb = skills.locator(".skills-source-thumb");
  const positions: string[] = [];

  for (const value of [0, 20, 40, 60, 80, 100]) {
    await slider.fill(String(value));
    await page.waitForTimeout(24);
    positions.push(await thumb.evaluate((element) => getComputedStyle(element).top));
  }

  expect(new Set(positions).size).toBe(6);
  expect(positions.at(0)).toBe("28px");
  expect(positions.at(-1)).toBe("107px");
});

test("compact HP and SP remain source-faithful readouts rather than invisible sliders", async ({ page }) => {
  await page.goto("/");
  const compact = page.getByRole("region", { name: "簡易情報" });
  await expect(compact.getByRole("slider")).toHaveCount(0);
  await expect(compact.locator('[data-component-id="compact-hp"]')).toBeVisible();
  await expect(compact.locator('[data-component-id="compact-sp"]')).toBeVisible();
});

test("source-baked selection is visibly cleared before another option is promoted", async ({ page }) => {
  await page.goto("/");

  const skills = page.getByRole("region", { name: "スキルリスト" });
  const firstSkill = skills.getByRole("option", { name: /ディバインプロテクション/ });
  const skillBefore = await firstSkill.screenshot();
  await skills.getByRole("option", { name: /ワープポータル/ }).click();
  expect((await firstSkill.screenshot()).equals(skillBefore)).toBe(false);
  await expect(skills.locator('[role="option"][aria-selected="true"]')).toHaveCount(1);

  const party = page.getByRole("region", { name: "パーティー (Riri-Soft)" });
  const firstMember = party.getByRole("option", { name: /SakumaRiri/ });
  const memberBefore = await firstMember.screenshot();
  await party.getByRole("option", { name: /Sebas/ }).click();
  expect((await firstMember.screenshot()).equals(memberBefore)).toBe(false);
  await expect(party.locator('[role="option"][aria-selected="true"]')).toHaveCount(1);

  const inventory = page.getByRole("region", { name: "所持アイテム" });
  const sourceTab = inventory.getByRole("button", { name: "item", exact: true });
  const tabBefore = await sourceTab.screenshot();
  await inventory.getByRole("button", { name: "equip", exact: true }).click();
  expect((await sourceTab.screenshot()).equals(tabBefore)).toBe(false);
  await expect(inventory.locator('.inventory-source-tab[aria-pressed="true"]')).toHaveCount(1);
});
