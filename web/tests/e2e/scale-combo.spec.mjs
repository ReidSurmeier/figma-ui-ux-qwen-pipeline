import { expect, test } from "@playwright/test";

test("P0-02 Scale combo opens a classic option list and commits 200 percent", async ({ page }) => {
  await page.goto("/");

  const scaleCombo = page.getByRole("combobox", { name: "Zoom percentage" });
  await scaleCombo.click();

  const optionList = page.getByRole("listbox", { name: "Zoom percentage options" });
  await expect(optionList).toBeVisible();
  await expect(optionList.getByRole("option")).toHaveText(["64%", "100%", "128%", "200%", "256%"]);

  await optionList.getByRole("option", { name: "200%" }).click();
  await expect(scaleCombo).toHaveText("200%");
  await expect(page.locator(".golfstudio")).toHaveAttribute("data-zoom", "200");
  await expect(page.locator("#zoom-readout")).toHaveText("200%");
  await expect(optionList).toBeHidden();
});

test("P0-02 Scale combo commits the next option from the keyboard", async ({ page }) => {
  await page.goto("/");

  const scaleCombo = page.getByRole("combobox", { name: "Zoom percentage" });
  await scaleCombo.click();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");

  await expect(scaleCombo).toHaveText("200%");
  await expect(page.locator(".golfstudio")).toHaveAttribute("data-zoom", "200");
});

test("P0-02 Scale combo cancels without changing zoom on Escape", async ({ page }) => {
  await page.goto("/");

  const scaleCombo = page.getByRole("combobox", { name: "Zoom percentage" });
  const optionList = page.getByRole("listbox", { name: "Zoom percentage options" });
  await scaleCombo.click();
  await expect(optionList).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(optionList).toBeHidden();
  await expect(scaleCombo).toHaveText("128%");
});
