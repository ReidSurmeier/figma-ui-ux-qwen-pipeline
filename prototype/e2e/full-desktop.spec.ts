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

test("every visible enabled button owns the center of its clipped hit target after real activation", async ({ page }) => {
  await page.goto("/");
  const windowIds = await page.locator("[data-window-id]").evaluateAll((windows) => windows.map((window) => (window as HTMLElement).dataset.windowId!));
  const obstructions = [];
  for (const windowId of windowIds) {
    await page.goto("/");
    const window = page.locator(`[data-window-id="${windowId}"]`);
    const exposedActivationPoint = await window.locator("[data-drag-handle]").evaluate((handle) => {
      const bounds = handle.getBoundingClientRect();
      for (let y = Math.ceil(bounds.top); y < Math.floor(bounds.bottom); y += 1) {
        for (let x = Math.ceil(bounds.left); x < Math.floor(bounds.right); x += 1) {
          const target = document.elementFromPoint(x + 0.5, y + 0.5);
          if (target && handle.contains(target)) return { x: x + 0.5, y: y + 0.5 };
        }
      }
      return null;
    });
    expect(exposedActivationPoint, `${windowId} has no user-reachable activation pixel`).not.toBeNull();
    await page.mouse.click(exposedActivationPoint!.x, exposedActivationPoint!.y);
    await expect.poll(async () => Number(await window.evaluate((element) => getComputedStyle(element).zIndex))).toBe(24);
    obstructions.push(...await window.evaluate((element) => [...element.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")]
      .filter((button) => button.offsetParent !== null)
      .flatMap((button) => {
        let bounds = button.getBoundingClientRect();
        for (let ancestor = button.parentElement; ancestor && ancestor !== element.parentElement; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor);
          if (![style.overflowX, style.overflowY].some((overflow) => ["auto", "clip", "hidden", "scroll"].includes(overflow))) continue;
          const clip = ancestor.getBoundingClientRect();
          const left = Math.max(bounds.left, clip.left);
          const top = Math.max(bounds.top, clip.top);
          const right = Math.min(bounds.right, clip.right);
          const bottom = Math.min(bounds.bottom, clip.bottom);
          bounds = new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
        }
        if (bounds.width < 1 || bounds.height < 1) return [];
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

test("vertical source scrollbars expose continuous values through real axis-aware pointer gestures", async ({ page }) => {
  await page.goto("/");
  for (const name of ["カード情報スクロール", "スキルスクロール", "所持品スクロール"] as const) {
    const range = page.getByRole("slider", { name });
    const box = await range.boundingBox();
    if (!box) throw new Error(`${name} has no pointer bounds`);
    await range.focus();
    await range.press("Home");
    expect(await range.inputValue()).toBe("0");
    const values = new Set<number>();
    for (let step = 1; step < 10; step += 1) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height * (step / 10));
      values.add(Number(await range.inputValue()));
    }
    expect(values.size, `${name} did not expose more than four pointer positions`).toBeGreaterThan(4);
    await range.focus();
    await range.press("End");
    expect(await range.inputValue()).toBe("100");
  }
});
