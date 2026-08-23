import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const output = new URL("../../artifacts/qa/runtime-component-manifest.json", import.meta.url);
await mkdir(new URL("../../artifacts/qa/", import.meta.url), { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/google-chrome" });
try {
  const page = await browser.newPage({ viewport: { width: 849, height: 564 }, deviceScaleFactor: 1 });
  await page.goto("http://10.255.255.254:4174/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const manifest = await page.locator("[data-window-id]").evaluateAll((windows) => windows.map((window) => {
    const root = window.getBoundingClientRect();
    const relative = (node) => {
      const bounds = node.getBoundingClientRect();
      return {
        x: Math.round((bounds.x - root.x) * 100) / 100,
        y: Math.round((bounds.y - root.y) * 100) / 100,
        width: Math.round(bounds.width * 100) / 100,
        height: Math.round(bounds.height * 100) / 100,
      };
    };
    const assetPath = (node) => {
      const match = getComputedStyle(node).backgroundImage.match(/url\(["']?(.*?)["']?\)/);
      if (!match) return null;
      const url = new URL(match[1], location.href);
      return url.pathname;
    };

    return {
      id: window.dataset.windowId,
      ariaLabel: window.getAttribute("aria-label"),
      geometry: {
        x: Math.round(root.x * 100) / 100,
        y: Math.round(root.y * 100) / 100,
        width: Math.round(root.width * 100) / 100,
        height: Math.round(root.height * 100) / 100,
      },
      cleanPlate: window.dataset.cleanPlate,
      components: [...window.querySelectorAll("[data-component-id]")].map((node) => ({
        id: node.dataset.componentId,
        assetPath: assetPath(node),
        geometry: relative(node),
      })).filter(({ assetPath }) => assetPath),
      controls: [...window.querySelectorAll("button, input, [role=tab], [role=option]")]
        .filter((node) => node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0)
        .map((node, index) => ({
          id: node.getAttribute("aria-label") || node.textContent?.trim().replace(/\s+/g, " ") || `control-${index}`,
          role: node.getAttribute("role") || node.tagName.toLowerCase(),
          geometry: relative(node),
        })),
    };
  }));

  await writeFile(output, `${JSON.stringify({ schemaVersion: "1.0", canvas: { width: 849, height: 564 }, windows: manifest }, null, 2)}\n`);
  process.stdout.write(`captured ${manifest.length} windows and ${manifest.reduce((sum, window) => sum + window.components.length, 0)} component instances\n`);
} finally {
  await browser.close();
}
