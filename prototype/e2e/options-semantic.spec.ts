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

test("Options generated minimize and close complete their reversible desktop lifecycle", async ({ page }) => {
  await page.goto("/");
  const options = page.getByRole("region", { name: "オプション" });
  await activateWindow(options);
  const minimize = options.getByRole("button", { name: "最小化", exact: true });
  const close = options.getByRole("button", { name: "閉じる", exact: true });
  await expect(minimize).toHaveAttribute("data-minimize-endpoint", "/assets/japanese-options-v001/components/minimized-plate.png");
  await expect(minimize).toHaveAttribute("data-visual-component", "options-minimize");
  await expect(close).toHaveAttribute("data-close-window", "options");
  await expect(close).toHaveAttribute("data-visual-component", "options-close");
  const expanded = await options.screenshot();

  await minimize.click();
  const geometries = new Set<string>();
  for (let frame = 0; frame < 16; frame += 1) {
    await page.waitForTimeout(16);
    const bounds = await options.boundingBox();
    if (bounds) geometries.add(`${Math.round(bounds.width)}x${Math.round(bounds.height)}`);
  }
  expect(geometries.size).toBeGreaterThan(4);
  await expect(options).toHaveCSS("width", "180px");
  await expect(options).toHaveCSS("height", "18px");
  await expect(options.getByRole("tabpanel")).toBeHidden();
  await minimize.click();
  await expect(options).toHaveCSS("width", "280px");
  await expect(options).toHaveCSS("height", "122px");
  expect((await options.screenshot()).equals(expanded), "Options did not restore its exact expanded pixels").toBe(true);

  await close.click();
  await expect(options).toHaveCount(0);
  await page.getByRole("region", { name: "基本情報" }).getByRole("button", { name: "option", exact: true }).click();
  await expect(options).toBeVisible();
  await expect(options).toHaveCSS("width", "280px");
  await expect(options.getByRole("tabpanel")).toBeVisible();
});

test("Options tabs own exact source strips and reverse to the original option panel", async ({ page }) => {
  await page.goto("/?view=options");
  const options = page.getByRole("region", { name: "オプション" });
  const bounds = await options.boundingBox();
  if (!bounds) throw new Error("Options geometry is unavailable");
  const option = options.getByRole("tab", { name: "option", exact: true });
  const info = options.getByRole("tab", { name: "info", exact: true });
  await expect(option).toHaveAttribute("data-visual-component", "options-tab-option");
  await expect(info).toHaveAttribute("data-visual-component", "options-tab-info");
  expect(await option.boundingBox()).toMatchObject({ x: bounds.x + 5, y: bounds.y + 18, width: 14, height: 37 });
  expect(await info.boundingBox()).toMatchObject({ x: bounds.x + 5, y: bounds.y + 55, width: 14, height: 40 });
  const source = await options.screenshot();
  await info.click();
  await expect(info).toHaveAttribute("aria-selected", "true");
  await expect(options.getByRole("tabpanel")).toContainText("情報はありません");
  await option.click();
  await expect(option).toHaveAttribute("aria-selected", "true");
  expect((await options.screenshot()).equals(source), "Options tabs did not restore the source option panel").toBe(true);
});

for (const [name, initial] of [["BGM", 62], ["Effect", 43]] as const) {
  test(`Options ${name} controls own one continuous reversible row`, async ({ page }) => {
    await page.goto("/?view=options");
    const options = page.getByRole("region", { name: "オプション" });
    const decrease = options.getByRole("button", { name: `${name}を下げる`, exact: true });
    const slider = options.getByRole("slider", { name, exact: true });
    const increase = options.getByRole("button", { name: `${name}を上げる`, exact: true });
    const toggle = options.getByRole("checkbox", { name: `${name} on`, exact: true });
    const prefix = name.toLowerCase();
    await expect(decrease).toHaveAttribute("data-visual-component", `options-${prefix}-down`);
    await expect(slider).toHaveAttribute("data-visual-component", `options-${prefix}-thumb`);
    await expect(increase).toHaveAttribute("data-visual-component", `options-${prefix}-up`);
    await expect(toggle).toHaveAttribute("data-visual-component", `options-${prefix}-on`);
    const otherName = name === "BGM" ? "Effect" : "BGM";
    const otherRow = options.locator(`.volume-row--${otherName.toLowerCase()}`);
    const otherAuthority = await otherRow.screenshot();

    await decrease.click();
    await expect(slider).toHaveValue(String(initial - 1));
    await increase.click();
    await expect(slider).toHaveValue(String(initial));
    const initialChecked = await toggle.isChecked();
    await toggle.click();
    expect(await toggle.isChecked()).toBe(!initialChecked);
    await toggle.click();
    expect(await toggle.isChecked()).toBe(initialChecked);

    await slider.evaluate((element) => {
      const samples: string[] = [];
      element.addEventListener("input", () => samples.push((element as HTMLInputElement).value));
      (window as typeof window & { optionSamples?: string[] }).optionSamples = samples;
    });
    const sliderBounds = await slider.boundingBox();
    if (!sliderBounds) throw new Error(`${name} slider geometry is unavailable`);
    await page.mouse.move(sliderBounds.x + 4, sliderBounds.y + sliderBounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(sliderBounds.x + sliderBounds.width - 4, sliderBounds.y + sliderBounds.height / 2, { steps: 24 });
    await page.mouse.up();
    const samples = await page.evaluate(() => (window as typeof window & { optionSamples?: string[] }).optionSamples ?? []);
    expect(new Set(samples).size).toBeGreaterThan(4);
    await expect(slider).toHaveValue("100");
    await slider.press("Home");
    await expect(slider).toHaveValue("0");
    expect((await otherRow.screenshot()).equals(otherAuthority), `${name} changed the other volume row`).toBe(true);
  });
}

test("Options Skin is application-owned and keyboard reversible", async ({ page }) => {
  await page.goto("/?view=options");
  const options = page.getByRole("region", { name: "オプション" });
  const skin = options.getByRole("combobox", { name: "Skin", exact: true });
  await expect(skin).toHaveAttribute("data-visual-component", "options-skin");
  await skin.click();
  await expect(skin).toHaveAttribute("aria-expanded", "true");
  await expect(options.getByRole("listbox", { name: "Skin" })).toBeVisible();
  await options.getByRole("option", { name: "ブルー", exact: true }).click();
  await expect(skin).toContainText("ブルー");
  await skin.press("ArrowDown");
  await expect(skin).toContainText("グレー");
  await skin.press("ArrowUp");
  await expect(skin).toContainText("ブルー");
  await skin.press("Escape");
  await expect(skin).toHaveAttribute("aria-expanded", "false");
});

test("Every Options footer checkbox changes only itself and restores cleanly", async ({ page }) => {
  await page.goto("/?view=options");
  const options = page.getByRole("region", { name: "オプション" });
  const labels = ["opaque", "attack", "skill", "item"];
  const controls = labels.map((label) => options.getByRole("checkbox", { name: label, exact: true }));
  const neutral = await Promise.all(controls.map((control) => control.screenshot()));
  for (let index = 0; index < controls.length; index += 1) {
    const control = controls[index];
    await expect(control).toHaveAttribute("data-visual-component", `options-footer-${labels[index]}`);
    const initial = await control.isChecked();
    await control.click();
    expect(await control.isChecked()).toBe(!initial);
    for (let sibling = 0; sibling < controls.length; sibling += 1) {
      const current = await controls[sibling].screenshot();
      expect(current.equals(neutral[sibling]), `${labels[sibling]} changed while toggling ${labels[index]}`).toBe(sibling !== index);
    }
    await control.click();
    expect(await control.isChecked()).toBe(initial);
    expect((await control.screenshot()).equals(neutral[index]), `${labels[index]} did not restore`).toBe(true);
  }
});
