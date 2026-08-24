import { expect, test, type Locator } from "@playwright/test";

const members = ["SakumaRiri", "Sebas'", "ANRI(砂漠の都市モロク)", "Show_A", "Ayanalshizuka"];

async function activateWindow(window: Locator) {
  await window.dispatchEvent("pointerdown");
  await expect.poll(() => window.evaluate((element) => {
    const z = Number(getComputedStyle(element).zIndex);
    const all = [...element.parentElement!.querySelectorAll<HTMLElement>("[data-window-id]")].map((node) => Number(getComputedStyle(node).zIndex));
    return z === Math.max(...all);
  })).toBe(true);
}

test("Every Party member is a reachable listbox option with exclusive reversible selection", async ({ page }) => {
  await page.goto("/?isolate=party");
  const party = page.getByRole("region", { name: "パーティー (Riri-Soft)" });
  await activateWindow(party);
  const listbox = party.getByRole("listbox", { name: "パーティーメンバー" });
  await expect(listbox).toHaveAttribute("aria-activedescendant", "party-member-option-0");
  await party.getByRole("option", { name: members[0], exact: true }).click();
  await expect(party.locator('[role="option"][aria-selected="true"]')).toHaveCount(0);
  for (let row = 0; row < members.length; row += 1) {
    const member = party.getByRole("option", { name: members[row], exact: true });
    await expect(member).toHaveAttribute("data-visual-component", `party-member-${row}`);
    await member.click();
    await expect(member).toHaveAttribute("aria-selected", "true");
    await expect(listbox).toHaveAttribute("aria-activedescendant", `party-member-option-${row}`);
    await expect(party.locator('[role="option"][aria-selected="true"]')).toHaveCount(1);
  }
  const last = party.getByRole("option", { name: members.at(-1)!, exact: true });
  await last.click();
  await expect(party.locator('[role="option"][aria-selected="true"]')).toHaveCount(0);
  await expect(listbox).not.toHaveAttribute("aria-activedescendant", /.+/);
});

test("Party tools and source tabs transfer state and support keyboard traversal", async ({ page }) => {
  await page.goto("/?isolate=party");
  const party = page.getByRole("region", { name: "パーティー (Riri-Soft)" });
  for (let column = 0; column < 5; column += 1) {
    const tool = party.getByRole("button", { name: `パーティーツール ${column + 1}`, exact: true });
    await expect(tool).toHaveAttribute("data-visual-component", `party-tool-${column}`);
    await tool.click();
    await expect(tool).toHaveAttribute("aria-pressed", "true");
    await expect(party.locator('.party-source-tool[aria-pressed="true"]')).toHaveCount(1);
  }
  const lastTool = party.getByRole("button", { name: "パーティーツール 5", exact: true });
  await lastTool.click();
  await expect(party.locator('.party-source-tool[aria-pressed="true"]')).toHaveCount(0);

  const tabs = party.getByRole("tablist", { name: "パーティービュー" });
  const friends = tabs.getByRole("tab", { name: "友達", exact: true });
  const partyTab = tabs.getByRole("tab", { name: "パーティー", exact: true });
  await expect(friends).toHaveAttribute("data-visual-component", "party-friends");
  await expect(partyTab).toHaveAttribute("data-visual-component", "party-party-tab");
  await partyTab.focus();
  await partyTab.press("ArrowLeft");
  await expect(friends).toHaveAttribute("aria-selected", "true");
  await friends.press("ArrowRight");
  await expect(partyTab).toHaveAttribute("aria-selected", "true");
});

test("Party satellite actions stay fixed while Party moves and expose exact ownership", async ({ page }) => {
  await page.goto("/?isolate=party");
  const party = page.getByRole("region", { name: "パーティー (Riri-Soft)" });
  const satellites = page.getByRole("group", { name: "パーティー外部操作" });
  await expect(satellites).toHaveAttribute("data-control-owner", "party");
  const fixed = await satellites.boundingBox();
  for (const [index, label] of ["back", "next", "sell"].entries()) {
    await expect(satellites.getByRole("button", { name: label, exact: true })).toHaveAttribute("data-visual-component", `party-action-${index}`);
  }
  const header = party.locator("[data-drag-handle]");
  const start = await header.boundingBox();
  if (!start || !fixed) throw new Error("Party drag geometry is unavailable");
  await page.mouse.move(start.x + 30, start.y + 8);
  await page.mouse.down();
  await page.mouse.move(start.x - 120, start.y - 80, { steps: 12 });
  await page.mouse.up();
  expect(await satellites.boundingBox()).toEqual(fixed);
  await satellites.getByRole("button", { name: "next", exact: true }).click();
  await expect(party.getByRole("status")).toHaveText("next 2/2");
  await satellites.getByRole("button", { name: "back", exact: true }).click();
  await expect(party.getByRole("status")).toHaveText("back 1/2");
});

test("Party close removes satellites and Basic Info friend restores the complete destination", async ({ page }) => {
  await page.goto("/");
  const party = page.getByRole("region", { name: "パーティー (Riri-Soft)" });
  const satellites = page.getByRole("group", { name: "パーティー外部操作" });
  await party.getByRole("button", { name: "パーティー (Riri-Soft)を閉じる", exact: true }).click();
  await expect(party).toHaveCount(0);
  await expect(satellites).toHaveCount(0);
  await page.getByRole("region", { name: "基本情報" }).getByRole("button", { name: "friend", exact: true }).click();
  await expect(party).toBeVisible();
  await expect(satellites).toBeVisible();
  await expect(party.getByRole("tab", { name: "友達", exact: true })).toHaveAttribute("aria-selected", "true");
});
