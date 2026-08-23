import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const output = new URL("../../artifacts/qa/source-visuals/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/google-chrome" });
try {
  const page = await browser.newPage({ viewport: { width: 849, height: 564 }, deviceScaleFactor: 1 });
  await page.goto("http://10.255.255.254:4174/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
  await page.screenshot({ path: new URL("full.png", output).pathname });
  for (const id of ["card", "skills", "equipment", "chat", "exchange", "game-menu", "quickbar", "compact-info", "bottom-bar", "notification", "party"]) {
    const window = page.locator(`[data-window-id="${id}"]`);
    // Party extends beneath Quickbar in the source composition. Raise it for
    // its focused 160px panel comparison; other focused crops intentionally
    // retain the source screenshot's occlusion context (notably Chat).
    if (id === "party") {
      await window.evaluate((element) => element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
      await page.waitForTimeout(0);
    }
    await window.screenshot({ path: new URL(`${id}.png`, output).pathname });
  }
} finally {
  await browser.close();
}
