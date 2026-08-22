import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function visiblePixelBounds(path: string, crop: string) {
  return execFileSync("convert", [path, "-crop", crop, "+repage", "-fuzz", "2%", "-trim", "-format", "%@", "info:"], {
    encoding: "utf8",
  }).trim();
}

function nonBackgroundPixelCount(path: string, crop: string) {
  return Number(execFileSync("convert", [path, "-crop", crop, "+repage", "-fuzz", "2%", "-transparent", "white", "-format", "%[fx:mean.a*w*h]", "info:"], {
    encoding: "utf8",
  }).trim());
}

function darkPixelCount(path: string, crop: string) {
  return Number(execFileSync("convert", [path, "-crop", crop, "+repage", "-colorspace", "Gray", "-threshold", "20%", "-negate", "-format", "%[fx:mean*w*h]", "info:"], {
    encoding: "utf8",
  }).trim());
}

function normalizedMae(actualPath: string, expectedPath: string, crop: string) {
  const result = execFileSync("bash", ["-lc", `compare -metric MAE '${expectedPath}[${crop}]' '${actualPath}[${crop}]' null: 2>&1 || true`], {
    encoding: "utf8",
  });
  const match = result.match(/\(([^)]+)\)/);
  if (!match) throw new Error(`ImageMagick did not return normalized MAE: ${result}`);
  return Number(match[1]);
}

function absoluteErrorPixels(actualPath: string, expectedPath: string, expectedCrop: string) {
  const result = execFileSync("bash", ["-lc", `compare -metric AE '${expectedPath}[${expectedCrop}]' '${actualPath}' null: 2>&1 || true`], {
    encoding: "utf8",
  }).trim();
  return Number(result);
}

test("checkbox state changes preserve the visible source anchor without stray pixels", async ({ page }) => {
  await page.goto("/");

  const evidenceDir = mkdtempSync(join(tmpdir(), "japanese-options-checkbox-"));
  try {
    const panel = page.getByRole("region", { name: "オプション" });
    const bgm = page.getByRole("checkbox", { name: "BGM on" });
    const beforePath = join(evidenceDir, "before.png");
    const afterPath = join(evidenceDir, "after.png");

    await panel.screenshot({ path: beforePath });
    expect(visiblePixelBounds(beforePath, "11x11+237+43")).toBe("10x10+0+0");
    await bgm.click();
    await panel.screenshot({ path: afterPath });

    // The source checkbox silhouette is 10x10 at x=237, y=24. State art may
    // change inside that footprint, but it must never shift or paint above it.
    expect(visiblePixelBounds(beforePath, "11x11+237+24")).toBe("10x10+0+0");
    expect(visiblePixelBounds(afterPath, "11x11+237+24")).toBe("10x10+0+0");
    expect(nonBackgroundPixelCount(afterPath, "11x1+237+23")).toBe(0);

    const panelBox = await panel.boundingBox();
    if (!panelBox) throw new Error("Options panel has no geometry");
    for (const [row, expected] of [
      ["bgm", { checkboxY: 24, labelY: 22 }],
      ["effect", { checkboxY: 43, labelY: 41 }],
    ] as const) {
      const checkboxBox = await page.locator(`.volume-row--${row} .on-toggle input`).boundingBox();
      const labelBox = await page.locator(`.volume-row--${row} .on-toggle span`).boundingBox();
      if (!checkboxBox || !labelBox) throw new Error(`${row} toggle has no geometry`);
      expect(Math.round(checkboxBox.y - panelBox.y)).toBe(expected.checkboxY);
      expect(Math.round(labelBox.y - panelBox.y)).toBe(expected.labelY);
      expect(checkboxBox.x + checkboxBox.width).toBeLessThanOrEqual(labelBox.x);
    }
  } finally {
    rmSync(evidenceDir, { recursive: true, force: true });
  }
});

test("bottom checkbox states never paint a dead pixel above their visible boxes", async ({ page }) => {
  await page.goto("/");

  const evidenceDir = mkdtempSync(join(tmpdir(), "japanese-options-footer-checkbox-"));
  try {
    const panel = page.getByRole("region", { name: "オプション" });
    const states = [
      ["initial", join(evidenceDir, "initial.png")],
      ["toggled", join(evidenceDir, "toggled.png")],
    ] as const;

    await panel.screenshot({ path: states[0][1] });
    for (const name of ["opaque", "attack", "skill", "item"]) {
      await page.getByRole("checkbox", { name }).click();
    }
    await panel.screenshot({ path: states[1][1] });

    for (const [, screenshot] of states) {
      for (const x of [11, 112, 163, 204]) {
        expect(darkPixelCount(screenshot, `10x1+${x}+101`)).toBe(0);
        expect(visiblePixelBounds(screenshot, `10x10+${x}+102`)).toBe("10x10+0+0");
      }
    }
  } finally {
    rmSync(evidenceDir, { recursive: true, force: true });
  }
});

test("volume checkboxes leave the source gap before a complete on label", async ({ page }) => {
  await page.goto("/");

  const evidenceDir = mkdtempSync(join(tmpdir(), "japanese-options-on-label-"));
  try {
    const screenshot = join(evidenceDir, "window.png");
    await page.getByRole("region", { name: "オプション" }).screenshot({ path: screenshot });

    for (const labelY of [22, 41]) {
      expect(darkPixelCount(screenshot, `1x15+247+${labelY}`)).toBe(0);
      expect(darkPixelCount(screenshot, `11x5+248+${labelY}`)).toBe(0);
      expect(darkPixelCount(screenshot, `11x6+248+${labelY + 5}`)).toBe(29);
    }
  } finally {
    rmSync(evidenceDir, { recursive: true, force: true });
  }
});

test("slider thumbs reach both source track endpoints without native inset", async ({ page }) => {
  await page.goto("/");

  const panel = page.getByRole("region", { name: "オプション" });
  const slider = page.getByRole("slider", { name: "BGM" });
  const thumb = page.getByTestId("bgm-visual-thumb");
  const panelBox = await panel.boundingBox();
  if (!panelBox) throw new Error("Options panel has no geometry");
  expect(await thumb.count()).toBe(1);

  await slider.fill("0");
  const minimum = await thumb.boundingBox();
  if (!minimum) throw new Error("BGM visual thumb has no minimum geometry");
  expect(minimum.x + minimum.width / 2 - panelBox.x).toBe(83);

  await slider.fill("100");
  const maximum = await thumb.boundingBox();
  if (!maximum) throw new Error("BGM visual thumb has no maximum geometry");
  expect(maximum.x + maximum.width / 2 - panelBox.x).toBe(225);
  await expect(slider).toHaveValue("100");
});

test("the editable Japanese title has no rectangular boundary seam", async ({ page }) => {
  await page.goto("/");

  const evidenceDir = mkdtempSync(join(tmpdir(), "japanese-options-title-"));
  try {
    const actualPath = join(evidenceDir, "window.png");
    const referencePath = join(process.cwd(), "..", "benchmarks", "japanese-rpg-options-v001", "regions", "options-window", "reference.png");
    await page.getByRole("region", { name: "オプション" }).screenshot({ path: actualPath });

    // Include a one-pixel perimeter around the editable title. Testing only
    // the opaque 54x11 interior allowed a visibly boxed crop to pass.
    expect(normalizedMae(actualPath, referencePath, "56x13+15+3")).toBeLessThanOrEqual(0.015);
  } finally {
    rmSync(evidenceDir, { recursive: true, force: true });
  }
});

test("an arrow button has a visible pointer-down state", async ({ page }) => {
  await page.goto("/");

  const increment = page.getByRole("button", { name: "BGMを上げる" });
  const box = await increment.boundingBox();
  if (!box) throw new Error("BGM increment button has no geometry");

  const idle = await increment.screenshot();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const pressed = await increment.screenshot();
  await page.mouse.up();

  expect(pressed.equals(idle)).toBe(false);
});

test("a window button has a visible pointer-down state before it acts", async ({ page }) => {
  await page.goto("/");

  const minimize = page.getByRole("button", { name: "最小化" });
  const box = await minimize.boundingBox();
  if (!box) throw new Error("minimize button has no geometry");

  const idle = await minimize.screenshot();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const pressed = await minimize.screenshot();
  await page.mouse.move(0, 0);
  await page.mouse.up();

  expect(pressed.equals(idle)).toBe(false);
  await expect(page.getByRole("tabpanel")).toBeVisible();
});

test("a tab has a visible pointer-down state before selection changes", async ({ page }) => {
  await page.goto("/");

  const info = page.getByRole("tab", { name: "info" });
  const box = await info.boundingBox();
  if (!box) throw new Error("info tab has no geometry");

  const idle = await info.screenshot();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const pressed = await info.screenshot();
  await page.mouse.move(0, 0);
  await page.mouse.up();

  expect(pressed.equals(idle)).toBe(false);
  await expect(info).toHaveAttribute("aria-selected", "false");
});

test("the Skin button has a visible pointer-down state before its menu opens", async ({ page }) => {
  await page.goto("/");

  const skin = page.getByRole("combobox", { name: "Skin" });
  const box = await skin.boundingBox();
  if (!box) throw new Error("Skin button has no geometry");

  const idle = await skin.screenshot();
  await page.mouse.move(box.x + 20, box.y + box.height / 2);
  await page.mouse.down();
  const pressed = await skin.screenshot();
  await page.mouse.move(0, 0);
  await page.mouse.up();

  expect(pressed.equals(idle)).toBe(false);
  await expect(skin).toHaveAttribute("aria-expanded", "false");
});

test("dragging keeps the complete window inside the interaction viewport", async ({ page }) => {
  await page.goto("/");

  const panel = page.getByRole("region", { name: "オプション" });
  const titleBar = page.locator(".title-bar");
  const start = await titleBar.boundingBox();
  if (!start) throw new Error("title bar has no drag geometry");

  await page.mouse.move(start.x + 100, start.y + 8);
  await page.mouse.down();
  await page.mouse.move(-120, -80, { steps: 6 });
  await page.mouse.up();

  const negative = await panel.boundingBox();
  if (!negative) throw new Error("panel disappeared after negative drag");
  expect(negative.x).toBeGreaterThanOrEqual(0);
  expect(negative.y).toBeGreaterThanOrEqual(0);

  const movedTitle = await titleBar.boundingBox();
  if (!movedTitle) throw new Error("title bar disappeared after negative drag");
  await page.mouse.move(movedTitle.x + 100, movedTitle.y + 8);
  await page.mouse.down();
  await page.mouse.move(800, 500, { steps: 6 });
  await page.mouse.up();

  const positive = await panel.boundingBox();
  const viewport = page.viewportSize();
  if (!positive || !viewport) throw new Error("missing positive-drag geometry");
  expect(positive.x + positive.width).toBeLessThanOrEqual(viewport.width);
  expect(positive.y + positive.height).toBeLessThanOrEqual(viewport.height);
});

test("inferred Japanese text uses the shared pixel-font contract", async ({ page }) => {
  await page.goto("/");

  await page.evaluate(() => document.fonts.load('11px "DotGothic16"'));
  const dotGothicAvailable = await page.evaluate(() => document.fonts.check('11px "DotGothic16"'));
  expect(dotGothicAvailable).toBe(true);

  const skin = page.getByRole("combobox", { name: "Skin" });
  await skin.click();
  await page.getByRole("option", { name: "ブルー" }).click();
  await expect(skin).toHaveCSS("font-family", /DotGothic16/);

  await page.getByRole("tab", { name: "info" }).click();
  await expect(page.locator(".info-message")).toHaveCSS("font-family", /DotGothic16/);
});

test("the Skin control stays on its source pixel geometry regardless of font metrics", async ({ page }) => {
  await page.goto("/");

  const panel = page.getByRole("region", { name: "オプション" });
  const skin = page.getByRole("combobox", { name: "Skin" });
  const panelBox = await panel.boundingBox();
  const skinBox = await skin.boundingBox();
  if (!panelBox || !skinBox) throw new Error("Skin control has no geometry");
  expect({
    x: Math.round(skinBox.x - panelBox.x),
    y: Math.round(skinBox.y - panelBox.y),
    width: Math.round(skinBox.width),
    height: Math.round(skinBox.height),
  }).toEqual({ x: 75, y: 65, width: 184, height: 18 });
});

test("minimize transitions to a generated compact state instead of cropping the full window", async ({ page }) => {
  await page.goto("/");

  const panel = page.getByRole("region", { name: "オプション" });
  const minimize = page.getByRole("button", { name: "最小化" });
  const evidenceDir = mkdtempSync(join(tmpdir(), "japanese-options-minimize-"));
  const beforePath = join(evidenceDir, "before.png");
  const afterPath = join(evidenceDir, "after.png");
  const sampleGeometry = async () => {
    const geometries: Array<{ width: number; height: number }> = [];
    for (let frame = 0; frame < 15; frame += 1) {
      const box = await panel.boundingBox();
      if (box) geometries.push({ width: Math.round(box.width), height: Math.round(box.height) });
      await page.waitForTimeout(16);
    }
    return geometries;
  };

  try {
    await panel.screenshot({ path: beforePath });
    await minimize.click();
    const collapsing = await sampleGeometry();
    expect(new Set(collapsing.map(({ height }) => height)).size).toBeGreaterThan(4);
    expect(new Set(collapsing.map(({ width }) => width)).size).toBeGreaterThan(4);
    expect(collapsing.at(-1)).toEqual({ width: 180, height: 18 });
    await expect(page.getByRole("tabpanel")).toBeHidden();
    await panel.screenshot({ path: afterPath });

    // A separately rendered minimized endpoint must differ from the equivalent
    // top-left crop of the full state.
    expect(absoluteErrorPixels(afterPath, beforePath, "180x18+0+0")).toBeGreaterThan(10);

    await minimize.click();
    const expanding = await sampleGeometry();
    expect(new Set(expanding.map(({ height }) => height)).size).toBeGreaterThan(4);
    expect(new Set(expanding.map(({ width }) => width)).size).toBeGreaterThan(4);
    expect(expanding.at(-1)).toEqual({ width: 280, height: 122 });
    await expect(page.getByRole("tabpanel")).toBeVisible();
  } finally {
    rmSync(evidenceDir, { recursive: true, force: true });
  }
});

test("the source-locked header title stays aligned while moving and minimizing", async ({ page }) => {
  await page.goto("/");

  const panel = page.getByRole("region", { name: "オプション" });
  const title = page.locator(".title-bar h1");
  const titleBar = page.locator(".title-bar");
  const assertAlignment = async () => {
    const panelBox = await panel.boundingBox();
    const titleBox = await title.boundingBox();
    if (!panelBox || !titleBox) throw new Error("header title has no geometry");
    expect({
      x: Math.round(titleBox.x - panelBox.x),
      y: Math.round(titleBox.y - panelBox.y),
      width: Math.round(titleBox.width),
      height: Math.round(titleBox.height),
    }).toEqual({ x: 16, y: 4, width: 54, height: 11 });
    await expect(title).toHaveCSS("background-image", /title-text\.png/);
  };

  await assertAlignment();
  const titleBarBox = await titleBar.boundingBox();
  if (!titleBarBox) throw new Error("title bar has no geometry");
  await page.mouse.move(titleBarBox.x + 100, titleBarBox.y + 8);
  await page.mouse.down();
  await page.mouse.move(titleBarBox.x + 160, titleBarBox.y + 50, { steps: 6 });
  await page.mouse.up();
  await assertAlignment();

  await page.getByRole("button", { name: "最小化" }).click();
  await page.waitForTimeout(80);
  await assertAlignment();
});

test("Japanese dropdown and info text stay inside their pixel-layout regions", async ({ page }) => {
  await page.goto("/");

  const skin = page.getByRole("combobox", { name: "Skin" });
  await skin.click();
  await page.getByRole("option", { name: "クラシック" }).click();
  await skin.click();

  const textGeometry = await page.evaluate(() => {
    const textRect = (element: HTMLElement) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const text = range.getBoundingClientRect();
      const box = element.getBoundingClientRect();
      return {
        text: { left: text.left, top: text.top, right: text.right, bottom: text.bottom },
        box: { left: box.left, top: box.top, right: box.right, bottom: box.bottom },
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      };
    };
    const skinButton = document.querySelector<HTMLElement>(".skin-combobox-button");
    const options = [...document.querySelectorAll<HTMLElement>(".skin-listbox button")];
    if (!skinButton || options.length === 0) throw new Error("Skin text regions are missing");
    return { skin: textRect(skinButton), options: options.map(textRect) };
  });

  expect(textGeometry.skin.scrollWidth).toBeLessThanOrEqual(textGeometry.skin.clientWidth);
  expect(textGeometry.skin.scrollHeight).toBeLessThanOrEqual(textGeometry.skin.clientHeight);
  expect(textGeometry.skin.text.right).toBeLessThanOrEqual(textGeometry.skin.box.right - 24);
  for (const option of textGeometry.options) {
    expect(option.scrollWidth).toBeLessThanOrEqual(option.clientWidth);
    expect(option.scrollHeight).toBeLessThanOrEqual(option.clientHeight);
    expect(option.text.left).toBeGreaterThanOrEqual(option.box.left);
    expect(option.text.right).toBeLessThanOrEqual(option.box.right);
    expect(option.text.top).toBeGreaterThanOrEqual(option.box.top);
    expect(option.text.bottom).toBeLessThanOrEqual(option.box.bottom);
  }

  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "info" }).click();
  const infoGeometry = await page.locator(".info-message").evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const text = range.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return {
      text: { left: text.left, top: text.top, right: text.right, bottom: text.bottom },
      box: { left: box.left, top: box.top, right: box.right, bottom: box.bottom },
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    };
  });
  expect(infoGeometry.scrollWidth).toBeLessThanOrEqual(infoGeometry.clientWidth);
  expect(infoGeometry.scrollHeight).toBeLessThanOrEqual(infoGeometry.clientHeight);
  expect(infoGeometry.text.left).toBeGreaterThanOrEqual(infoGeometry.box.left);
  expect(infoGeometry.text.right).toBeLessThanOrEqual(infoGeometry.box.right);
  expect(infoGeometry.text.top).toBeGreaterThanOrEqual(infoGeometry.box.top);
  expect(infoGeometry.text.bottom).toBeLessThanOrEqual(infoGeometry.box.bottom);
});

test("the Japanese Options window supports the complete first-test flow", async ({ page }) => {
  await page.goto("/");

  const panel = page.getByRole("region", { name: "オプション" });
  await expect(panel).toBeVisible();

  const bgm = page.getByRole("slider", { name: "BGM" });
  await bgm.evaluate((element) => {
    const values: string[] = [];
    element.addEventListener("input", () => values.push((element as HTMLInputElement).value));
    (window as typeof window & { bgmDragValues?: string[] }).bgmDragValues = values;
  });
  const sliderBox = await bgm.boundingBox();
  if (!sliderBox) throw new Error("BGM slider has no browser geometry");
  await page.mouse.move(sliderBox.x + 4, sliderBox.y + sliderBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sliderBox.x + sliderBox.width - 4, sliderBox.y + sliderBox.height / 2, { steps: 24 });
  await page.mouse.up();
  const dragValues = await page.evaluate(() => (window as typeof window & { bgmDragValues?: string[] }).bgmDragValues ?? []);
  expect(new Set(dragValues).size).toBeGreaterThan(4);
  await expect(bgm).toHaveValue("100");
  await bgm.press("Home");
  await expect(bgm).toHaveValue("0");
  await bgm.press("End");
  await expect(bgm).toHaveValue("100");

  await page.getByRole("button", { name: "Effectを上げる" }).click();
  await expect(page.getByRole("slider", { name: "Effect" })).toHaveValue("44");
  await page.getByRole("checkbox", { name: "Effect on" }).uncheck();
  await expect(page.getByRole("checkbox", { name: "Effect on" })).not.toBeChecked();

  await page.getByRole("combobox", { name: "Skin" }).click();
  await page.getByRole("option", { name: "ブルー" }).click();
  await expect(page.getByRole("combobox", { name: "Skin" })).toContainText("ブルー");
  await page.getByRole("checkbox", { name: "skill" }).check();
  await expect(page.getByRole("checkbox", { name: "skill" })).toBeChecked();

  await page.getByRole("tab", { name: "info" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("情報はありません");
  await page.getByRole("tab", { name: "option" }).click();

  const before = await panel.boundingBox();
  const titleBar = page.locator(".title-bar");
  const titleBox = await titleBar.boundingBox();
  if (!before || !titleBox) throw new Error("Options window has no drag geometry");
  await page.mouse.move(titleBox.x + 90, titleBox.y + 8);
  await page.mouse.down();
  await page.mouse.move(titleBox.x + 130, titleBox.y + 28, { steps: 8 });
  await page.mouse.up();
  const after = await panel.boundingBox();
  expect(after?.x).toBeGreaterThan(before.x + 30);
  expect(after?.y).toBeGreaterThan(before.y + 10);

  const minimize = page.getByRole("button", { name: "最小化" });
  await minimize.click();
  await expect(page.getByRole("tabpanel")).toBeHidden();
  await minimize.click();
  await expect(page.getByRole("tabpanel")).toBeVisible();
});

test("the selected info tab keeps visible source-matched chrome", async ({ page }) => {
  await page.goto("/");

  const infoTab = page.getByRole("tab", { name: "info" });
  await infoTab.click();

  await expect(infoTab).toHaveAttribute("aria-selected", "true");
  const selectedVisual = await infoTab.evaluate((element) => (
    getComputedStyle(element, "::before").backgroundImage
  ));
  expect(selectedVisual).toContain("tab-info-selected.png");
});

test("tab selection transfers visible state feedback to the selected tab", async ({ page }) => {
  await page.goto("/");

  const optionTab = page.getByRole("tab", { name: "option" });
  const infoTab = page.getByRole("tab", { name: "info" });
  const optionSelected = await optionTab.screenshot();
  const infoIdle = await infoTab.screenshot();

  await infoTab.click();

  const optionIdle = await optionTab.screenshot();
  const infoSelected = await infoTab.screenshot();
  expect(optionIdle.equals(optionSelected)).toBe(false);
  expect(infoSelected.equals(infoIdle)).toBe(false);
});

test("option and info pixels map to non-overlapping tab hit regions", async ({ page }) => {
  await page.goto("/");

  const panel = page.getByRole("region", { name: "オプション" });
  const optionTab = page.getByRole("tab", { name: "option" });
  const infoTab = page.getByRole("tab", { name: "info" });
  const panelBox = await panel.boundingBox();
  const optionBox = await optionTab.boundingBox();
  const infoBox = await infoTab.boundingBox();
  if (!panelBox || !optionBox || !infoBox) throw new Error("tab geometry is unavailable");

  expect({
    x: optionBox.x - panelBox.x,
    y: optionBox.y - panelBox.y,
    width: optionBox.width,
    height: optionBox.height,
  }).toEqual({ x: 5, y: 18, width: 14, height: 37 });
  expect({
    x: infoBox.x - panelBox.x,
    y: infoBox.y - panelBox.y,
    width: infoBox.width,
    height: infoBox.height,
  }).toEqual({ x: 5, y: 55, width: 14, height: 40 });
  expect(optionBox.y + optionBox.height).toBe(infoBox.y);

  await page.mouse.click(panelBox.x + 12, panelBox.y + 54);
  await expect(optionTab).toHaveAttribute("aria-selected", "true");
  await page.mouse.click(panelBox.x + 12, panelBox.y + 55);
  await expect(infoTab).toHaveAttribute("aria-selected", "true");
});

test("the Skin dropdown opens a source-themed application-owned menu", async ({ page }) => {
  await page.goto("/");

  const skin = page.getByRole("combobox", { name: "Skin" });
  await skin.click();

  await expect(skin).toHaveAttribute("aria-expanded", "true");
  const menu = page.getByRole("listbox", { name: "Skin" });
  await expect(menu).toBeVisible();
  const menuBox = await menu.boundingBox();
  expect(menuBox?.height).toBeGreaterThan(50);
  const menuBottomIsReachable = await menu.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const target = document.elementFromPoint(rect.left + rect.width / 2, rect.bottom - 2);
    return target === element || Boolean(target && element.contains(target));
  });
  expect(menuBottomIsReachable).toBe(true);
  await page.getByRole("option", { name: "ブルー" }).click();
  await expect(skin).toContainText("ブルー");
  await expect(menu).toBeHidden();
});

test("the Skin dropdown supports keyboard selection and Escape", async ({ page }) => {
  await page.goto("/");

  const skin = page.getByRole("combobox", { name: "Skin" });
  await skin.focus();
  await page.keyboard.press("ArrowDown");
  await expect(skin).toContainText("ブルー");
  await expect(skin).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("ArrowDown");
  await expect(skin).toContainText("グレー");
  await page.keyboard.press("Escape");
  await expect(skin).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("listbox", { name: "Skin" })).toBeHidden();
});

test("the prototype loads without browser console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${message.location().url}: ${message.text()}`);
  });

  await page.goto("/");
  await expect(page.getByRole("region", { name: "オプション" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("user selections survive tab visits and minimize restore", async ({ page }) => {
  await page.goto("/");

  const skin = page.getByRole("combobox", { name: "Skin" });
  await skin.click();
  await page.getByRole("option", { name: "クラシック" }).click();
  await page.getByRole("checkbox", { name: "BGM on" }).check();
  await page.getByRole("checkbox", { name: "Effect on" }).uncheck();
  await page.getByRole("checkbox", { name: "opaque" }).check();
  await page.getByRole("checkbox", { name: "attack" }).uncheck();
  await page.getByRole("checkbox", { name: "skill" }).check();
  await page.getByRole("checkbox", { name: "item" }).uncheck();

  await page.getByRole("tab", { name: "info" }).click();
  await page.getByRole("tab", { name: "option" }).click();
  const minimize = page.getByRole("button", { name: "最小化" });
  await minimize.click();
  await minimize.click();

  await expect(skin).toContainText("クラシック");
  await expect(page.getByRole("checkbox", { name: "BGM on" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Effect on" })).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: "opaque" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "attack" })).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: "skill" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "item" })).not.toBeChecked();
});
