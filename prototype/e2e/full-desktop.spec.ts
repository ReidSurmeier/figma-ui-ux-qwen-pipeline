import { expect, test } from "@playwright/test";

test("the full Japanese desktop admits an independently movable basic-info window", async ({ page }) => {
  await page.goto("/");

  const desktop = page.getByRole("application", { name: "Japanese RPG desktop" });
  const basic = page.getByRole("region", { name: "基本情報" });
  const options = page.getByRole("region", { name: "オプション" });
  await expect(desktop).toBeVisible();
  await expect(basic).toBeVisible();
  await expect(options).toBeVisible();

  expect(await desktop.boundingBox()).toMatchObject({ width: 849, height: 564 });
  expect(await basic.boundingBox()).toMatchObject({ x: 0, y: 0, width: 280, height: 120 });
  expect(await options.boundingBox()).toMatchObject({ x: 345, y: 182, width: 280, height: 122 });

  const title = basic.locator("[data-drag-handle]");
  const before = await basic.boundingBox();
  const titleBox = await title.boundingBox();
  if (!before || !titleBox) throw new Error("basic-info drag geometry is unavailable");
  await page.mouse.move(titleBox.x + 120, titleBox.y + 8);
  await page.mouse.down();
  await page.mouse.move(titleBox.x + 160, titleBox.y + 38, { steps: 8 });
  await page.mouse.up();
  const after = await basic.boundingBox();
  expect(after?.x).toBeGreaterThan(before.x + 30);
  expect(after?.y).toBeGreaterThan(before.y + 20);
});

test("every visible source window is an independent movable region", async ({ page }) => {
  await page.goto("/");

  const windowNames = [
    "基本情報",
    "ソルジャースケルトンカード",
    "スキルリスト",
    "ステータス",
    "所持アイテム",
    "装備アイテム",
    "チャットルーム",
    "交換ウィンドウ: ANRI",
    "ゲームメニュー",
    "パーティー (Riri-Soft)",
    "クイックスロット",
    "簡易情報",
    "クイックスロットバー",
    "通知",
    "オプション",
  ];

  for (const name of windowNames) {
    const window = page.getByRole("region", { name, exact: true });
    await expect(window).toBeVisible();
    await expect(window.locator("[data-drag-handle]")).toBeVisible();
  }
});

test("the single Chat window exposes its complete settled form without invented tabs", async ({ page }) => {
  await page.goto("/");

  const chat = page.getByRole("region", { name: "チャットルーム" });
  await chat.evaluate((element) => element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
  await expect(chat.getByRole("tab")).toHaveCount(0);
  await chat.getByRole("textbox", { name: "トピック" }).fill("内部テスト");
  await chat.getByRole("combobox", { name: "ルーム" }).click();
  await chat.getByRole("listbox", { name: "ルーム" }).getByRole("option", { name: "パーティー" }).click();
  await chat.getByRole("radio", { name: "非公開" }).check();
  await chat.getByRole("button", { name: "OK" }).click();
  await expect(chat.getByRole("status")).toContainText("非公開 パーティー「内部テスト」を作成しました");
});

test("the Chat room dropdown is application-owned and visibly operable", async ({ page }) => {
  await page.goto("/");
  const chat = page.getByRole("region", { name: "チャットルーム" });
  await chat.dispatchEvent("pointerdown");
  const room = chat.getByRole("combobox", { name: "ルーム" });

  await expect(room).toHaveAttribute("aria-expanded", "false");
  await room.click();
  await expect(room).toHaveAttribute("aria-expanded", "true");
  const listbox = chat.getByRole("listbox", { name: "ルーム" });
  await expect(listbox).toBeVisible();
  await listbox.getByRole("option", { name: "パーティー" }).click();
  await expect(room).toHaveAttribute("aria-expanded", "false");
  await expect(room).toContainText("パーティー");
});

test("dense Japanese labels do not overflow their independently movable components", async ({ page }) => {
  await page.goto("/");

  const overflow = await page.locator(".rpg-desktop").evaluate((desktop) => (
    [...desktop.querySelectorAll<HTMLElement>(".pixel-window button, .pixel-window output:not(.sr-only), .pixel-window .party-summary, .pixel-window .basic-info__footer")]
      .filter((element) => element.offsetParent !== null)
      .filter((element) => element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1)
      .map((element) => ({
        window: element.closest<HTMLElement>("[data-window-id]")?.dataset.windowId ?? "desktop",
        text: element.innerText.trim().replace(/\s+/g, " ").slice(0, 60),
        client: [element.clientWidth, element.clientHeight],
        scroll: [element.scrollWidth, element.scrollHeight],
      }))
  ));

  expect(overflow).toEqual([]);
});

test("every draggable window remains recoverable inside the desktop host", async ({ page }) => {
  await page.goto("/");

  const desktop = page.getByRole("application", { name: "Japanese RPG desktop" });
  const options = page.getByRole("region", { name: "オプション" });
  const handle = options.locator("[data-drag-handle]");
  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error("Options drag handle is unavailable");
  await page.mouse.move(handleBox.x + 100, handleBox.y + 8);
  await page.mouse.down();
  await page.mouse.move(2000, 2000, { steps: 8 });
  await page.mouse.up();

  const desktopBox = await desktop.boundingBox();
  const optionsBox = await options.boundingBox();
  if (!desktopBox || !optionsBox) throw new Error("Desktop containment geometry is unavailable");
  expect(optionsBox.x + optionsBox.width).toBeLessThanOrEqual(desktopBox.x + desktopBox.width);
  expect(optionsBox.y + optionsBox.height).toBeLessThanOrEqual(desktopBox.y + desktopBox.height);
});

test("window cleanup preserves the source six-pixel stepped corner silhouette", async ({ page }) => {
  await page.goto("/");
  for (const id of ["basic-info", "options", "status", "inventory", "card", "skills", "equipment", "chat", "exchange", "game-menu"] as const) {
    const window = page.locator(`[data-window-id="${id}"]`);
    await window.evaluate((element) => element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
    const geometry = await window.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const at = (x: number, y: number) => document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-window-id]")?.dataset.windowId ?? null;
      return {
        clipPath: getComputedStyle(element).clipPath,
        cornerOwner: at(bounds.left + 0.25, bounds.top + 0.25),
        sourceSteps: [
          at(bounds.left + 3.25, bounds.top + 0.25),
          at(bounds.left + 5.25, bounds.top + 0.25),
          at(bounds.left + 3.25, bounds.top + 1.25),
          at(bounds.left + 4.25, bounds.top + 1.25),
          at(bounds.left + 1.25, bounds.top + 3.25),
          at(bounds.left + 2.25, bounds.top + 3.25),
          at(bounds.left + 0.25, bounds.top + 5.25),
          at(bounds.left + 0.25, bounds.top + 6.25),
        ].map((owner) => owner === (element as HTMLElement).dataset.windowId),
      };
    });
    expect(geometry.clipPath).toContain("polygon");
    expect(geometry.cornerOwner).not.toBe(id);
    expect(geometry.sourceSteps).toEqual([false, true, false, true, false, true, false, true]);
  }
});

test("the enabled control inventory contains no settled dead buttons", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");

  const descriptors = await page.locator("[data-window-id]").evaluateAll((windows) => windows.flatMap((window) => (
    [...window.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")].map((button, index) => ({
      windowId: (window as HTMLElement).dataset.windowId!,
      index,
      name: button.getAttribute("aria-label") || button.innerText.trim().replace(/\s+/g, " ").slice(0, 50),
      selected: button.getAttribute("aria-selected") === "true" || button.getAttribute("aria-pressed") === "true",
    }))
  )));

  const dead: Array<{ windowId: string; name: string }> = [];
  for (const descriptor of descriptors.filter(({ selected }) => !selected)) {
    await page.goto("/");
    const window = page.locator(`[data-window-id="${descriptor.windowId}"]`);
    const button = window.locator("button:not(:disabled)").nth(descriptor.index);
    if (!await button.isVisible()) continue;
    await window.evaluate((element) => element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    const before = await window.screenshot();
    await button.click({ force: true });
    await page.waitForTimeout(30);
    if (!await window.count() || !await window.isVisible()) continue;
    if (await button.getAttribute("aria-expanded") !== "true") {
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    }
    const after = await window.screenshot();
    if (before.equals(after)) dead.push({ windowId: descriptor.windowId, name: descriptor.name });
  }

  expect(dead).toEqual([]);
});

test("every enabled button owns the center of its hit target after activation", async ({ page }) => {
  await page.goto("/");
  const windowIds = await page.locator("[data-window-id]").evaluateAll((windows) => windows.map((window) => (window as HTMLElement).dataset.windowId!));
  const obstructions = [];
  for (const windowId of windowIds) {
    await page.goto("/");
    const window = page.locator(`[data-window-id="${windowId}"]`);
    await window.evaluate((element) => element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
    await page.waitForTimeout(0);
    obstructions.push(...await window.evaluate((element) => [...element.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")]
      .filter((button) => button.offsetParent !== null)
      .flatMap((button) => {
        const bounds = button.getBoundingClientRect();
        const target = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        if (target === button || (target && button.contains(target))) return [];
        return [{
          windowId: (element as HTMLElement).dataset.windowId,
          name: button.getAttribute("aria-label") || button.innerText.trim().replace(/\s+/g, " "),
          obstruction: target instanceof HTMLElement ? `${target.tagName.toLowerCase()}.${target.className}` : "none",
        }];
      })));
  }

  expect(obstructions).toEqual([]);
});
