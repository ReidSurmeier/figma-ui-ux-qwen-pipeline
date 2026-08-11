import { expect, test } from "@playwright/test";

test("P1-01 Application menus switch exclusively and dismiss outside or with Escape", async ({ page }) => {
  await page.goto("/");

  const headings = ["File", "Edit", "Club", "Layout", "Options", "Window", "Help"];
  for (const heading of headings) {
    await page.getByRole("button", { name: heading, exact: true }).click();
    await expect(page.locator(".golfstudio")).toHaveAttribute("data-open-menu", heading.toLowerCase());
    await expect(page.locator(".menu-popup:visible")).toHaveCount(1);
  }

  await page.locator("#canvas-control").click();
  await expect(page.locator(".menu-popup:visible")).toHaveCount(0);
  await page.getByRole("button", { name: "File" }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".menu-popup:visible")).toHaveCount(0);
});

test("P1-02 Global keyboard controls play, step, and toggle presentation", async ({ page }) => {
  await page.goto("/");

  const root = page.locator(".golfstudio");
  await page.keyboard.press("Space");
  await expect(root).toHaveAttribute("data-playing", "true");
  await page.keyboard.press("Space");
  await expect(root).toHaveAttribute("data-playing", "false");

  await page.keyboard.press("ArrowRight");
  await expect(root).toHaveAttribute("data-phase", "backswing");
  await page.keyboard.press("ArrowLeft");
  await expect(root).toHaveAttribute("data-phase", "address");

  await page.keyboard.press("F11");
  await expect(root).toHaveAttribute("data-window-mode", "presentation");
  await page.keyboard.press("Escape");
  await expect(root).toHaveAttribute("data-window-mode", "normal");
});

test("P1-03 Window controls minimize, maximize, close, and recover", async ({ page }) => {
  await page.goto("/");

  const root = page.locator(".golfstudio");
  await page.getByRole("button", { name: "Minimize GolfStudio" }).click();
  await expect(root).toHaveAttribute("data-window-mode", "minimized");
  await page.getByRole("button", { name: "Restore GolfStudio" }).click();
  await expect(root).toHaveAttribute("data-window-mode", "normal");

  await page.getByRole("button", { name: "Maximize GolfStudio" }).click();
  await expect(root).toHaveAttribute("data-window-mode", "maximized");
  await page.getByRole("button", { name: "Maximize GolfStudio" }).click();
  await expect(root).toHaveAttribute("data-window-mode", "normal");

  await page.getByRole("button", { name: "Close GolfStudio" }).click();
  await expect(page.getByRole("dialog", { name: "Close GolfStudio" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(root).toHaveAttribute("data-window-mode", "normal");
  await page.getByRole("button", { name: "Close GolfStudio" }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(root).toHaveAttribute("data-window-mode", "closed");
  await page.getByRole("button", { name: "Reopen GolfStudio" }).click();
  await expect(root).toHaveAttribute("data-window-mode", "normal");
});

test("P1-04 Parts selectors retain independent head, shaft, and grip choices", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Parts", exact: true }).click();

  const head = page.getByLabel("Head");
  const shaft = page.getByLabel("Shaft");
  const grip = page.getByLabel("Grip");
  await head.selectOption({ label: "blade" });
  await shaft.selectOption({ label: "stiff" });
  await grip.selectOption({ label: "oversize" });

  await expect(head).toHaveValue("blade");
  await expect(shaft).toHaveValue("stiff");
  await expect(grip).toHaveValue("oversize");
});

test("P1-05 Library scrollbar exposes and selects all eleven clubs without moving chrome", async ({ page }) => {
  await page.goto("/");

  const fileBoxBefore = await page.getByRole("button", { name: "File" }).boundingBox();
  const firstClubs = ["7 iron", "6 iron", "5 iron", "4 iron", "3 wood", "driver", "putter"];
  for (const club of firstClubs) {
    const row = page.getByRole("button", { name: `Select ${club}` });
    await row.click();
    await expect(row).toHaveAttribute("aria-pressed", "true");
  }

  const scrollbar = page.getByRole("slider", { name: "Scroll club library" });
  await scrollbar.press("End");
  await expect(scrollbar).toHaveValue("4");
  for (const club of ["pitching wedge", "sand wedge", "hybrid", "lob wedge"]) {
    const row = page.getByRole("button", { name: `Select ${club}` });
    await row.click();
    await expect(row).toHaveAttribute("aria-pressed", "true");
  }

  expect(await page.getByRole("button", { name: "File" }).boundingBox()).toEqual(fileBoxBefore);
});

test("P1-06 Trackbars, combos, and menus retain square classic control styling", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Rotation", exact: true }).click();

  const trackbarStyle = await page.getByRole("slider", { name: "Face angle" }).evaluate((element) => ({
    appearance: getComputedStyle(element).appearance,
    trackRadius: getComputedStyle(element, "::-webkit-slider-runnable-track").borderRadius,
    thumbRadius: getComputedStyle(element, "::-webkit-slider-thumb").borderRadius,
  }));
  expect(trackbarStyle).toEqual({ appearance: "none", trackRadius: "0px", thumbRadius: "0px" });

  await page.getByRole("button", { name: "File" }).click();
  const popupStyle = await page.getByRole("menu").filter({ has: page.getByRole("menuitem", { name: /New swing/ }) }).evaluate((element) => ({
    borderRadius: getComputedStyle(element).borderRadius,
    topBorder: getComputedStyle(element).borderTop,
    bottomBorder: getComputedStyle(element).borderBottom,
  }));
  expect(popupStyle.borderRadius).toBe("0px");
  expect(popupStyle.topBorder).toContain("rgb(255, 255, 255)");
  expect(popupStyle.bottomBorder).toContain("rgb(0, 0, 0)");
  await expect(page.getByRole("combobox", { name: "Zoom percentage" })).toHaveCSS("border-radius", "0px");
});

test("P1-07 Control state changes are immediate and swing frames do not tween", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Rotation", exact: true }).click();
  await expect(page.locator(".golfstudio")).toHaveAttribute("data-panel", "rotation");
  await page.getByRole("slider", { name: "Face angle" }).fill("20");
  await expect(page.locator("#rotation-output")).toHaveText("20°");
  await expect(page.locator(".club-sprite")).toHaveCSS("transition-duration", "0s");

  await page.getByRole("button", { name: "File" }).click();
  await expect(page.getByRole("menuitem", { name: /New swing/ })).toBeVisible();
  await expect(page.locator(".menu-popup:visible")).toHaveCSS("transition-duration", "0s");
});

test("P1-10 Toolbar, canvas, age, fit, and every lower tab have gesture evidence", async ({ page }) => {
  await page.goto("/");

  const root = page.locator(".golfstudio");
  const canvas = page.locator("#canvas-control");
  await page.getByRole("button", { name: "Pan tool" }).click();
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error("Interactive canvas is not visible");
  await page.mouse.move(canvasBox.x + 180, canvasBox.y + 80);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + 220, canvasBox.y + 100, { steps: 5 });
  await page.mouse.up();
  expect(await page.evaluate(() => window.__GOLFSTUDIO_UI__().ui.viewOffset)).not.toEqual({ x: 0, y: 0 });

  await page.getByRole("button", { name: "Rotate tool" }).click();
  await canvas.click();
  await expect.poll(() => page.evaluate(() => window.__GOLFSTUDIO_UI__().ui.parameters.rotation)).toBe(5);
  await page.getByRole("button", { name: "Zoom tool" }).click();
  await canvas.click();
  await expect(root).toHaveAttribute("data-zoom", "192");
  await page.getByRole("button", { name: "Scale to Fit" }).click();
  await expect(root).toHaveAttribute("data-zoom", "100");
  await page.getByRole("button", { name: "Select tool" }).click();
  await canvas.click();
  await expect(page.locator("#live-status")).toContainText("selected");

  const age = page.getByRole("spinbutton", { name: "Club age in days" });
  await age.fill("40");
  await age.press("Tab");
  await expect(age).toHaveValue("40");
  await page.getByRole("button", { name: "Increase age" }).click();
  await expect(age).toHaveValue("41");
  await page.getByRole("button", { name: "Decrease age" }).click();
  await expect(age).toHaveValue("40");

  for (const [tab, panel] of [["Swing", "swing"], ["Rotation", "rotation"], ["Parameters", "parameters"], ["Parts", "parts"]]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    await expect(root).toHaveAttribute("data-panel", panel);
  }
});

test("P1-10 Every application-menu command has observable gesture evidence", async ({ page }) => {
  await page.goto("/");

  const root = page.locator(".golfstudio");
  const openMenu = (name) => page.getByRole("button", { name, exact: true }).click();

  await page.getByRole("button", { name: "Increase age" }).click();
  await openMenu("Edit");
  await page.getByRole("menuitem", { name: /Undo/ }).click();
  await expect(page.getByRole("spinbutton", { name: "Club age in days" })).toHaveValue("36");
  await page.getByRole("button", { name: "Select driver" }).click();
  await openMenu("Edit");
  await page.getByRole("menuitem", { name: "Reset values" }).click();
  await expect(page.getByRole("button", { name: "Select 7 iron" })).toHaveAttribute("aria-pressed", "true");
  await openMenu("Edit");
  await page.getByRole("menuitem", { name: "Copy metrics" }).click();
  await expect(page.locator("#live-status")).toContainText("copied");

  for (const [label, attribute] of [["Club library", "data-show-library"], ["Analysis panel", "data-show-graph"], ["Toolbar", "data-show-toolbar"]]) {
    await openMenu("Layout");
    await page.getByRole("menuitemcheckbox", { name: new RegExp(label) }).click();
    await expect(root).toHaveAttribute(attribute, "false");
    await openMenu("Layout");
    await page.getByRole("menuitemcheckbox", { name: new RegExp(label) }).click();
    await expect(root).toHaveAttribute(attribute, "true");
  }

  await openMenu("Options");
  await page.getByRole("menuitemcheckbox", { name: /Reduced motion/ }).click();
  await openMenu("Options");
  await expect(page.getByRole("menuitemcheckbox", { name: /Reduced motion/ })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");
  await page.getByRole("combobox", { name: "Zoom percentage" }).click();
  await page.getByRole("option", { name: "200%" }).click();
  await openMenu("Options");
  await page.getByRole("menuitem", { name: "Scale to Fit" }).click();
  await expect(root).toHaveAttribute("data-zoom", "100");

  await openMenu("Window");
  await page.getByRole("menuitem", { name: "Minimize" }).click();
  await page.getByRole("button", { name: "Restore GolfStudio" }).click();
  await openMenu("Window");
  await page.getByRole("menuitem", { name: "Maximize" }).click();
  await expect(root).toHaveAttribute("data-window-mode", "maximized");
  await openMenu("Window");
  await page.getByRole("menuitem", { name: /Presentation view/ }).click();
  await expect(root).toHaveAttribute("data-window-mode", "presentation");
  await page.getByRole("button", { name: /Exit presentation/ }).click();

  await openMenu("Help");
  await page.getByRole("menuitem", { name: "Controls" }).click();
  await expect(page.getByRole("dialog", { name: "GolfStudio controls" })).toBeVisible();
  await page.getByRole("button", { name: "OK" }).click();
  await openMenu("Help");
  await page.getByRole("menuitem", { name: "About GolfStudio" }).click();
  await expect(page.getByRole("dialog", { name: "About GolfStudio" })).toBeVisible();
  await page.getByRole("button", { name: "OK" }).click();

  await openMenu("File");
  await page.getByRole("menuitem", { name: "Exit" }).click();
  await expect(page.getByRole("dialog", { name: "Close GolfStudio" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
});

test("P1-10 The executable control inventory contains no enabled dead controls", async ({ page }) => {
  await page.goto("/");

  const deadControls = await page.locator("button, input, select").evaluateAll((elements) => elements
    .filter((element) => element.getClientRects().length > 0)
    .filter((element) => !element.disabled && element.getAttribute("aria-hidden") !== "true")
    .filter((element) => getComputedStyle(element).pointerEvents === "none")
    .map((element) => element.getAttribute("aria-label") || element.textContent.trim()));

  expect(deadControls).toEqual([]);
});

test("P1-10 Every club-menu and Scale-list choice commits its visible value", async ({ page }) => {
  await page.goto("/");

  const clubs = ["7 iron", "6 iron", "5 iron", "4 iron", "3 wood", "driver", "putter", "pitching wedge", "sand wedge", "hybrid", "lob wedge"];
  for (const club of clubs) {
    await page.getByRole("button", { name: "Club", exact: true }).click();
    await page.getByRole("menuitemradio", { name: club, exact: true }).click();
    await expect(page.locator("#graph-club-title")).toHaveText(club);
  }

  const scaleCombo = page.getByRole("combobox", { name: "Zoom percentage" });
  for (const zoom of [64, 100, 128, 200, 256]) {
    await scaleCombo.click();
    await page.getByRole("option", { name: `${zoom}%` }).click();
    await expect(scaleCombo).toHaveText(`${zoom}%`);
  }
});
