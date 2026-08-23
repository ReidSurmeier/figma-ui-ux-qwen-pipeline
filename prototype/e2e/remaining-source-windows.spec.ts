import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function selectedBluePixelCount(path: string) {
  return Number(execFileSync("convert", [
    path,
    "-alpha", "off",
    "-fx", "(b>0.65&&(b-r)>0.12&&(b-g)>0.02&&r>0.2)?1:0",
    "-format", "%[fx:mean*w*h]",
    "info:",
  ], { encoding: "utf8" }).trim());
}

function darkGlyphMaskSignature(image: Buffer) {
  return execFileSync("convert", [
    "png:-",
    "-alpha", "off",
    "-fx", "(r<0.4&&g<0.55&&b<0.72)?1:0",
    "-format", "%#",
    "info:",
  ], { input: image, encoding: "utf8" }).trim();
}

const windows = [
  { name: "ソルジャースケルトンカード", id: "card", minimumComponents: 10 },
  { name: "スキルリスト", id: "skills", minimumComponents: 18 },
  { name: "装備アイテム", id: "equipment", minimumComponents: 12 },
  { name: "チャットルーム", id: "chat", minimumComponents: 10 },
  { name: "交換ウィンドウ: ANRI", id: "exchange", minimumComponents: 20 },
  { name: "ゲームメニュー", id: "game-menu", minimumComponents: 6 },
  { name: "パーティー (Riri-Soft)", id: "party", minimumComponents: 15 },
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
  await page.getByRole("group", { name: "パーティー外部操作" }).getByRole("button", { name: "next" }).click();
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

test("dragging Party leaves the source-external back next sell strip anchored", async ({ page }) => {
  await page.goto("/");
  const party = page.getByRole("region", { name: "パーティー (Riri-Soft)" });
  const next = page.getByRole("button", { name: "next", exact: true });
  const handle = party.locator("[data-drag-handle]");
  const partyBefore = await party.boundingBox();
  const nextBefore = await next.boundingBox();
  const handleBox = await handle.boundingBox();
  if (!partyBefore || !nextBefore || !handleBox) throw new Error("Party ownership geometry is unavailable");

  await page.mouse.move(handleBox.x + 80, handleBox.y + 8);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + 110, handleBox.y + 28, { steps: 8 });
  await page.mouse.up();

  const partyAfter = await party.boundingBox();
  const nextAfter = await next.boundingBox();
  expect(partyAfter?.x).toBe(partyBefore.x + 30);
  expect(partyAfter?.y).toBe(partyBefore.y + 20);
  expect(nextAfter).toEqual(nextBefore);
  await expect(party.getByRole("button", { name: /^(back|next|sell)$/ })).toHaveCount(0);
});

test("Party member selection can clear and moves only the source-local indicator", async ({ page }) => {
  await page.goto("/");
  const party = page.getByRole("region", { name: "パーティー (Riri-Soft)" });
  const first = party.getByRole("option", { name: /SakumaRiri/ });
  const second = party.getByRole("option", { name: /Sebas/ });
  const bounds = await party.boundingBox();
  if (!bounds) throw new Error("Party member-state geometry is unavailable");

  const firstIndicator = { x: bounds.x + 3, y: bounds.y + 19, width: 18, height: 19 };
  const firstLabel = { x: bounds.x + 21, y: bounds.y + 19, width: 136, height: 19 };
  const secondIndicator = { x: bounds.x + 3, y: bounds.y + 38, width: 18, height: 19 };
  const secondLabel = { x: bounds.x + 21, y: bounds.y + 38, width: 136, height: 19 };

  const firstIndicatorSelected = await page.screenshot({ clip: firstIndicator });
  const firstLabelBefore = await page.screenshot({ clip: firstLabel });
  await first.click();
  const firstIndicatorCleared = await page.screenshot({ clip: firstIndicator });
  expect(firstIndicatorCleared.equals(firstIndicatorSelected), "the source check indicator did not clear").toBe(false);
  expect(darkGlyphMaskSignature(await page.screenshot({ clip: firstLabel })), "clearing the indicator altered the member glyph geometry").toBe(darkGlyphMaskSignature(firstLabelBefore));
  await expect(party.locator('[role="option"][aria-selected="true"]')).toHaveCount(0);

  const secondIndicatorBefore = await page.screenshot({ clip: secondIndicator });
  const secondLabelBefore = await page.screenshot({ clip: secondLabel });
  await second.click();
  expect((await page.screenshot({ clip: secondIndicator })).equals(secondIndicatorBefore), "Sebas received no visible selection indicator").toBe(false);
  expect(darkGlyphMaskSignature(await page.screenshot({ clip: secondLabel })), "selecting Sebas altered the member glyph geometry").toBe(darkGlyphMaskSignature(secondLabelBefore));
  expect((await page.screenshot({ clip: firstIndicator })).equals(firstIndicatorCleared), "selecting Sebas reintroduced or altered the cleared first indicator").toBe(true);
  await expect(second).toHaveAttribute("aria-selected", "true");
  await expect(party.locator('[role="option"][aria-selected="true"]')).toHaveCount(1);
});

test("Party selection moves the source blue focus highlight to the chosen member", async ({ page }) => {
  await page.goto("/");
  const party = page.getByRole("region", { name: "パーティー (Riri-Soft)" });
  const first = party.getByRole("option", { name: /SakumaRiri/ });
  const second = party.getByRole("option", { name: /Sebas/ });
  const evidenceDir = mkdtempSync(join(tmpdir(), "party-focus-"));

  try {
    const firstBeforePath = join(evidenceDir, "first-before.png");
    const secondBeforePath = join(evidenceDir, "second-before.png");
    const firstAfterPath = join(evidenceDir, "first-after.png");
    const secondAfterPath = join(evidenceDir, "second-after.png");
    await first.screenshot({ path: firstBeforePath });
    await second.screenshot({ path: secondBeforePath });

    const firstBlueBefore = selectedBluePixelCount(firstBeforePath);
    const secondBlueBefore = selectedBluePixelCount(secondBeforePath);
    await second.click();
    await first.screenshot({ path: firstAfterPath });
    await second.screenshot({ path: secondAfterPath });

    const firstBlueAfter = selectedBluePixelCount(firstAfterPath);
    const secondBlueAfter = selectedBluePixelCount(secondAfterPath);
    expect(firstBlueBefore).toBeGreaterThan(700);
    expect(secondBlueBefore).toBeLessThan(100);
    expect(firstBlueAfter, "SakumaRiri retained the source selected-row highlight").toBeLessThan(200);
    expect(secondBlueAfter, "Sebas did not receive a source-sized selected-row highlight").toBeGreaterThan(200);
    await expect(first).toHaveAttribute("aria-selected", "false");
    await expect(second).toHaveAttribute("aria-selected", "true");
  } finally {
    rmSync(evidenceDir, { recursive: true, force: true });
  }
});
