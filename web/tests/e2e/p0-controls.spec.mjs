import { expect, test } from "@playwright/test";

test("P0-01 File menu resets, opens, saves, and closes with Escape", async ({ page }) => {
  await page.goto("/");

  const fileMenu = page.getByRole("menu").filter({ has: page.getByRole("menuitem", { name: /New swing/ }) });
  await page.getByRole("button", { name: "File" }).click();
  await expect(fileMenu).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(fileMenu).toBeHidden();

  await page.getByRole("button", { name: "Select driver" }).click();
  await page.getByRole("button", { name: "File" }).click();
  await fileMenu.getByRole("menuitem", { name: /New swing/ }).click();
  await expect(page.getByRole("button", { name: "Select 7 iron" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "File" }).click();
  const chooserPromise = page.waitForEvent("filechooser");
  await fileMenu.getByRole("menuitem", { name: /Open session/ }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles([]);
  await expect(fileMenu).toBeHidden();

  await page.getByRole("button", { name: "File" }).click();
  const downloadPromise = page.waitForEvent("download");
  await fileMenu.getByRole("menuitem", { name: /Save snapshot/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("golfstudio-session.json");
});

test("P0-03 Club menu selects putter and driver with visible state", async ({ page }) => {
  await page.goto("/");

  for (const club of ["putter", "driver"]) {
    await page.getByRole("button", { name: "Club", exact: true }).click();
    await page.getByRole("menuitemradio", { name: club, exact: true }).click();
    await expect(page.locator("#graph-club-title")).toHaveText(club);
    await expect(page.getByRole("button", { name: `Select ${club}` })).toHaveAttribute("aria-pressed", "true");
  }
});

test("P0-04 Rotation trackbar updates value, meter, club angle, and keyboard step", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Rotation", exact: true }).click();

  const slider = page.getByRole("slider", { name: "Face angle" });
  const box = await slider.boundingBox();
  if (!box) throw new Error("Rotation trackbar is not visible");

  const dragTo = async (ratio) => {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * ratio, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
  };

  await dragTo(0.8);
  const high = Number(await slider.inputValue());
  expect(high).toBeGreaterThan(0);
  await expect(page.locator("#rotation-output")).toHaveText(`${high}°`);
  const highTransform = await page.locator(".club-sprite").evaluate((element) => getComputedStyle(element).transform);

  await dragTo(0.2);
  const low = Number(await slider.inputValue());
  expect(low).toBeLessThan(0);
  await expect(page.locator("#rotation-output")).toHaveText(`${low}°`);
  await expect(page.locator(".golfstudio")).toHaveCSS("--rotation-meter", `${(low + 45) / 90 * 100}%`);
  const lowTransform = await page.locator(".club-sprite").evaluate((element) => getComputedStyle(element).transform);
  expect(lowTransform).not.toBe(highTransform);

  await slider.press("ArrowRight");
  await expect(slider).toHaveValue(String(low + 1));
  await expect(page.locator("#rotation-output")).toHaveText(`${low + 1}°`);
});

test("P0-05 Loft and tempo track independently during pointer drags", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Parameters", exact: true }).click();

  const loft = page.getByRole("slider", { name: "Loft" });
  const tempo = page.getByRole("slider", { name: "Tempo" });
  const dragTo = async (slider, ratio) => {
    const box = await slider.boundingBox();
    if (!box) throw new Error("Parameter trackbar is not visible");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * ratio, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
  };

  const initialTempo = await tempo.inputValue();
  await dragTo(loft, 0.2);
  const changedLoft = await loft.inputValue();
  expect(changedLoft).not.toBe("34");
  await expect(page.locator("#loft-output")).toHaveText(`${changedLoft}°`);
  await expect(tempo).toHaveValue(initialTempo);

  await dragTo(tempo, 0.85);
  const changedTempo = await tempo.inputValue();
  expect(changedTempo).not.toBe(initialTempo);
  await expect(page.locator("#tempo-output")).toHaveText(`${changedTempo} bpm`);
  await expect(loft).toHaveValue(changedLoft);
});

test("P0-06 Animate advances discretely, stops in place, and replays", async ({ page }) => {
  await page.goto("/");

  const root = page.locator(".golfstudio");
  const animate = page.getByRole("button", { name: "Animate swing" }).last();
  await animate.click();
  await expect(root).toHaveAttribute("data-playing", "true");
  await expect(page.getByRole("button", { name: "Stop swing" }).last()).toBeVisible();
  await expect(root).toHaveAttribute("data-phase", "backswing", { timeout: 350 });
  await expect(root).toHaveAttribute("data-phase", "impact", { timeout: 450 });

  await page.getByRole("button", { name: "Stop swing" }).last().click();
  await expect(root).toHaveAttribute("data-playing", "false");
  const stoppedPhase = await root.getAttribute("data-phase");
  await page.waitForTimeout(300);
  await expect(root).toHaveAttribute("data-phase", stoppedPhase);

  await page.getByRole("button", { name: "Animate swing" }).last().click();
  await expect(root).toHaveAttribute("data-playing", "true");
  await expect.poll(() => root.getAttribute("data-phase")).not.toBe(stoppedPhase);
});

test("P0-07 Timeline drag and arrow keys select canonical swing phases", async ({ page }) => {
  await page.goto("/");

  const root = page.locator(".golfstudio");
  const timeline = page.getByRole("slider", { name: "Swing timeline" });
  const box = await timeline.boundingBox();
  if (!box) throw new Error("Swing timeline is not visible");
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.58, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(root).toHaveAttribute("data-phase", "impact");
  await expect(page.locator("#readout-progress")).toHaveText("58%");

  await timeline.press("ArrowRight");
  await expect(root).toHaveAttribute("data-phase", "follow-through");
  await timeline.press("ArrowLeft");
  await expect(root).toHaveAttribute("data-phase", "impact");
});

test("P0-08 Menus and panels remain responsive during swing playback", async ({ page }) => {
  await page.goto("/");

  const root = page.locator(".golfstudio");
  await page.getByRole("button", { name: "Animate swing" }).last().click();
  await expect(root).toHaveAttribute("data-playing", "true");

  await page.getByRole("button", { name: "File" }).click();
  await expect(page.getByRole("menuitem", { name: /New swing/ })).toBeVisible();
  await expect(root).toHaveAttribute("data-playing", "true");

  await page.getByRole("button", { name: "Parts", exact: true }).click();
  await expect(root).toHaveAttribute("data-panel", "parts");
  await expect(root).toHaveAttribute("data-playing", "true");
  await page.getByRole("button", { name: "Stop swing" }).last().click();
});
