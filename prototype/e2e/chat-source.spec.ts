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

test("Chat visibly edits Japanese topic and submits one application-owned form without invented tabs", async ({ page }) => {
  await page.goto("/");
  const chat = page.getByRole("region", { name: "チャットルーム" });
  await activateWindow(chat);
  await expect(chat.getByRole("tab")).toHaveCount(0);
  await expect(chat.locator("select")).toHaveCount(0);
  const bounds = await chat.boundingBox();
  if (!bounds) throw new Error("Chat geometry is unavailable");
  const titleClip = { x: bounds.x, y: bounds.y, width: 280, height: 18 };
  const topicClip = { x: bounds.x + 44, y: bounds.y + 27, width: 228, height: 17 };
  const titleAuthority = await page.screenshot({ clip: titleClip });
  const topicIdle = await page.screenshot({ clip: topicClip });

  const topic = chat.getByRole("textbox", { name: "トピック" });
  await expect(topic).toHaveAttribute("data-visual-component", "chat-topic-field");
  await expect(topic).toHaveCSS("opacity", "1");
  await topic.fill("内部テスト");
  await topic.press("Tab");
  expect((await page.screenshot({ clip: topicClip })).equals(topicIdle), "typed Japanese topic remained invisible").toBe(false);

  const room = chat.getByRole("combobox", { name: "ルーム" });
  await expect(room).toHaveAttribute("data-visual-component", "chat-room");
  await room.click();
  const listbox = chat.getByRole("listbox", { name: "ルーム" });
  await expect(listbox.getByRole("option")).toHaveCount(2);
  await listbox.getByRole("option", { name: "パーティー", exact: true }).click();
  await expect(room).toContainText("パーティー");

  const privateRadio = chat.getByRole("radio", { name: "非公開", exact: true });
  await expect(privateRadio).toHaveAttribute("data-visual-component", "chat-privacy-private");
  await privateRadio.check();
  await expect(privateRadio).toBeChecked();
  const ok = chat.getByRole("button", { name: "OK", exact: true });
  await expect(ok).toHaveAttribute("data-visual-component", "chat-ok");
  await ok.click();
  await expect(chat.getByRole("status")).toHaveText("非公開 パーティー「内部テスト」を作成しました");
  expect((await page.screenshot({ clip: titleClip })).equals(titleAuthority), "Chat form changed its Japanese title").toBe(true);
});

test("Chat cancel restores the complete default form instead of only clearing topic", async ({ page }) => {
  await page.goto("/");
  const chat = page.getByRole("region", { name: "チャットルーム" });
  const topic = chat.getByRole("textbox", { name: "トピック" });
  const room = chat.getByRole("combobox", { name: "ルーム" });
  const publicRadio = chat.getByRole("radio", { name: "公開", exact: true });
  const privateRadio = chat.getByRole("radio", { name: "非公開", exact: true });
  await topic.fill("取消テスト");
  await room.click();
  await chat.getByRole("listbox", { name: "ルーム" }).getByRole("option", { name: "パーティー", exact: true }).click();
  await privateRadio.check();

  const cancel = chat.getByRole("button", { name: "cancel", exact: true });
  await expect(cancel).toHaveAttribute("data-visual-component", "chat-cancel");
  await cancel.click();
  await expect(topic).toHaveValue("");
  await expect(room).toContainText("チャットルーム");
  await expect(room).toHaveAttribute("aria-expanded", "false");
  await expect(publicRadio).toBeChecked();
  await expect(privateRadio).not.toBeChecked();
  await expect(chat.getByRole("listbox", { name: "ルーム" })).toHaveCount(0);
  await expect(chat.getByRole("status")).toHaveText("キャンセルしました");
});
