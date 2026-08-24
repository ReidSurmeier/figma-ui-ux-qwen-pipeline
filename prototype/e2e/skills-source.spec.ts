import { expect, test } from "@playwright/test";

const skillNames = ["ディバインプロテクション", "ワープポータル", "ニューマ", "ヒール", "エンジェラス", "ブレッシング", "速度増加", "ルアフ"];
const skillLevels = [5, 4, 4, 9, 5, 10, 10, 1];

test("Skills exposes one keyboard-traversable listbox across both visible pages", async ({ page }) => {
  await page.goto("/?isolate=skills");
  const skills = page.getByRole("region", { name: "スキルリスト" });
  const listbox = skills.getByRole("listbox", { name: "スキル" });
  await expect(listbox).toHaveCount(1);
  await expect(listbox).toHaveAttribute("aria-activedescendant", "skill-option-0");
  await listbox.focus();
  await listbox.press("End");
  await expect(listbox).toHaveAttribute("aria-activedescendant", "skill-option-7");
  await expect(skills.getByRole("slider", { name: "スキルスクロール" })).toHaveValue("100");
  await expect(skills.getByRole("option", { name: `${skillNames[7]} Lv ${skillLevels[7]}` })).toHaveAttribute("aria-selected", "true");
  await listbox.press("ArrowDown");
  await expect(listbox).toHaveAttribute("aria-activedescendant", "skill-option-0");
  await expect(skills.getByRole("slider", { name: "スキルスクロール" })).toHaveValue("34");
});

test("Skills real scroll gestures keep one thumb and the clipped list outside title and footer", async ({ page }) => {
  await page.goto("/?isolate=skills");
  const skills = page.getByRole("region", { name: "スキルリスト" });
  const slider = skills.getByRole("slider", { name: "スキルスクロール" });
  await expect(slider).toHaveAttribute("data-visual-component", "skills-scrollbar-thumb");
  const thumb = skills.locator('[data-component-id="skills-scrollbar-thumb"]');
  await expect(thumb).toHaveCount(1);
  await skills.click({ position: { x: 150, y: 9 } });
  const bounds = await skills.boundingBox();
  const sliderBounds = await slider.boundingBox();
  if (!bounds || !sliderBounds) throw new Error("Skills scroll geometry is unavailable");
  const titleClip = { x: bounds.x, y: bounds.y, width: 281, height: 18 };
  const listClip = { x: bounds.x + 2, y: bounds.y + 18, width: 261, height: 144 };
  const footerClip = { x: bounds.x, y: bounds.y + 162, width: 281, height: 22 };
  const titleAuthority = await page.screenshot({ clip: titleClip });
  const footerAuthority = await page.screenshot({ clip: footerClip });
  const values = new Set<number>();
  const listStates = new Set<string>();

  await slider.focus();
  await slider.press("Home");
  for (let step = 1; step < 10; step += 1) {
    await page.mouse.click(sliderBounds.x + sliderBounds.width / 2, sliderBounds.y + sliderBounds.height * (step / 10));
    const value = Number(await slider.inputValue());
    values.add(value);
    listStates.add((await page.screenshot({ clip: listClip })).toString("base64"));
    expect((await page.screenshot({ clip: titleClip })).equals(titleAuthority), `Skills scroll ${value} entered the title`).toBe(true);
    expect((await page.screenshot({ clip: footerClip })).equals(footerAuthority), `Skills scroll ${value} entered the footer`).toBe(true);
    expect(Math.round((await thumb.boundingBox())!.y - bounds.y)).toBe(28 + Math.round(value * 0.79));
  }
  expect(values.size).toBeGreaterThan(4);
  expect(listStates.size).toBeGreaterThan(4);
  await slider.focus();
  await slider.press("Home");
  await expect(thumb).toHaveCSS("top", "28px");
  await slider.press("End");
  await expect(thumb).toHaveCSS("top", "107px");
});

test("Skills use acts on selection and both close controls support Basic Info recovery", async ({ page }) => {
  await page.goto("/");
  const skills = page.getByRole("region", { name: "スキルリスト" });
  const basic = page.getByRole("region", { name: "基本情報" });
  const reopen = basic.getByRole("button", { name: "skill", exact: true });
  const use = skills.getByRole("button", { name: "use", exact: true });
  const bottomClose = skills.getByRole("button", { name: "close", exact: true });

  await skills.getByRole("listbox", { name: "スキル" }).press("End");
  await use.click();
  await expect(use).toHaveAttribute("aria-pressed", "true");
  await expect(skills.getByRole("status")).toHaveText(`use ${skillNames[7]}`);

  await expect(bottomClose).toHaveAttribute("data-close-window", "skills");
  await bottomClose.click();
  await expect(skills).toHaveCount(0);
  await reopen.click();
  await expect(skills).toBeVisible();
  await expect(skills.locator("[data-component-id]")).toHaveCount(33);

  const titleClose = skills.getByRole("button", { name: "スキルリストを閉じる", exact: true });
  await expect(titleClose).toHaveAttribute("data-close-window", "skills");
  await titleClose.click();
  await expect(skills).toHaveCount(0);
  await reopen.click();
  await expect(skills).toBeVisible();
  await expect(skills.locator("[data-component-id]")).toHaveCount(33);
});

test("Every Skills row and level control is pointer-reachable on its settled page and owns only its state", async ({ page }) => {
  await page.goto("/?isolate=skills");
  const skills = page.getByRole("region", { name: "スキルリスト" });
  const slider = skills.getByRole("slider", { name: "スキルスクロール" });
  const listbox = skills.getByRole("listbox", { name: "スキル" });
  await skills.click({ position: { x: 150, y: 9 } });
  const skillsBounds = await skills.boundingBox();
  if (!skillsBounds) throw new Error("Skills geometry is unavailable");
  const titleClip = { x: skillsBounds.x, y: skillsBounds.y, width: 281, height: 18 };
  const footerClip = { x: skillsBounds.x, y: skillsBounds.y + 162, width: 281, height: 22 };
  const titleAuthority = await page.screenshot({ clip: titleClip });
  const footerAuthority = await page.screenshot({ clip: footerClip });

  for (const pageStart of [0, 4]) {
    await slider.fill(pageStart === 0 ? "34" : "100");
    await expect(skills.locator(".skills-source-list")).toHaveCSS("transform", pageStart === 0 ? "matrix(1, 0, 0, 1, 0, 0)" : "matrix(1, 0, 0, 1, 0, -144)");
    await expect(skills.locator('.skill-source-row:not(:disabled)')).toHaveCount(4);
    await expect(skills.locator('.skill-source-level:not(:disabled)')).toHaveCount(4);
    for (let row = pageStart; row < pageStart + 4; row += 1) {
      const option = skills.getByRole("option", { name: `${skillNames[row]} Lv ${skillLevels[row]}`, exact: true });
      const level = skills.getByRole("button", { name: `${skillNames[row]}をレベルアップ`, exact: true });
      const optionBounds = await option.boundingBox();
      const levelBounds = await level.boundingBox();
      if (!optionBounds || !levelBounds) throw new Error(`Skills row ${row} is not pointer-reachable`);
      await expect(option).toBeEnabled();
      await expect(level).toBeEnabled();
      expect(optionBounds.y, `${skillNames[row]} option top`).toBeGreaterThanOrEqual(skillsBounds.y + 18);
      expect(optionBounds.y + optionBounds.height, `${skillNames[row]} option bottom`).toBeLessThanOrEqual(skillsBounds.y + 162);
      expect(levelBounds.y, `${skillNames[row]} level top`).toBeGreaterThanOrEqual(skillsBounds.y + 18);
      expect(levelBounds.y + levelBounds.height, `${skillNames[row]} level bottom`).toBeLessThanOrEqual(skillsBounds.y + 162);

      await option.click({ position: { x: optionBounds.width - 30, y: optionBounds.height / 2 } });
      await expect(option).toHaveAttribute("aria-selected", "true");
      await expect(listbox).toHaveAttribute("aria-activedescendant", `skill-option-${row}`);
      await expect(skills.locator('[role="option"][aria-selected="true"]')).toHaveCount(1);

      await level.click();
      await expect(level).toHaveAttribute("aria-pressed", "true");
      await expect(skills.getByRole("status")).toHaveText(`${skillNames[row]} Lv+1`);
      await expect(skills.locator('.skill-source-level[aria-pressed="true"]')).toHaveCount(1);
      await level.click();
      await expect(level).toHaveAttribute("aria-pressed", "false");
      await expect(skills.locator('.skill-source-level[aria-pressed="true"]')).toHaveCount(0);
    }
  }

  expect((await page.screenshot({ clip: titleClip })).equals(titleAuthority), "Skills row actions changed the title").toBe(true);
  expect((await page.screenshot({ clip: footerClip })).equals(footerAuthority), "Skills row actions changed the footer").toBe(true);
});
