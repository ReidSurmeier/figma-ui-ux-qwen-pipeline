import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

export async function captureRuntimeComponentManifest(page) {
  await page.evaluate(() => document.fonts.ready);
  const windows = await page.locator("[data-window-id]").evaluateAll((nodes) => nodes.map((window) => {
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
    const assetPathFromStyle = (style) => {
      const match = style.backgroundImage.match(/url\(["']?(.*?)["']?\)/);
      if (!match) return null;
      const url = new URL(match[1], location.href);
      return url.pathname;
    };
    const assetAuthority = (node) => {
      const direct = assetPathFromStyle(getComputedStyle(node));
      if (direct) return { assetPath: direct, geometry: relative(node), authority: "element-background" };
      for (const pseudo of ["::before", "::after"]) {
        const style = getComputedStyle(node, pseudo);
        const assetPath = assetPathFromStyle(style);
        if (!assetPath) continue;
        const bounds = node.getBoundingClientRect();
        const px = (value, fallback) => Number.parseFloat(value) || fallback;
        return {
          assetPath,
          geometry: {
            x: Math.round((bounds.x - root.x + px(style.left, 0)) * 100) / 100,
            y: Math.round((bounds.y - root.y + px(style.top, 0)) * 100) / 100,
            width: Math.round(px(style.width, bounds.width) * 100) / 100,
            height: Math.round(px(style.height, bounds.height) * 100) / 100,
          },
          authority: pseudo === "::before" ? "pseudo-before-background" : "pseudo-after-background",
        };
      }
      // Some controls keep the stable component ID on an inert child while
      // the owning button carries the raster background. Preserve the child's
      // exact geometry but resolve the visual authority from that public
      // control surface so engine exports do not turn visible buttons into
      // transparent hotspots.
      const controlOwner = node.closest("button, [role=tab], [role=option]");
      if (controlOwner && controlOwner !== node) {
        const assetPath = assetPathFromStyle(getComputedStyle(controlOwner));
        if (assetPath) {
          return {
            assetPath,
            geometry: relative(node),
            authority: "control-owner-background",
          };
        }
      }
      return null;
    };

    const cleanPlate = window.dataset.cleanPlate;
    const ownedRoots = [...document.querySelectorAll(`[data-control-owner="${CSS.escape(window.dataset.windowId)}"]`)];
    const ownedNodes = (selector) => [
      ...window.querySelectorAll(selector),
      ...ownedRoots.flatMap((root) => [...root.querySelectorAll(selector)]),
    ];
    return {
      id: window.dataset.windowId,
      ariaLabel: window.getAttribute("aria-label"),
      geometry: {
        x: Math.round(root.x * 100) / 100,
        y: Math.round(root.y * 100) / 100,
        width: Math.round(root.width * 100) / 100,
        height: Math.round(root.height * 100) / 100,
      },
      ...(cleanPlate ? { cleanPlate } : {}),
      components: ownedNodes("[data-component-id]").map((node) => {
        const authority = assetAuthority(node);
        return authority ? { id: node.dataset.componentId, ...authority } : null;
      }).filter(Boolean),
      controls: ownedNodes("button, input, [role=tab], [role=option]")
        .filter((node) => node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0)
        .map((node, index) => {
          const ownedVisual = node.matches("[data-component-id]")
            ? node
            : node.querySelector("[data-component-id]");
          const visualComponent = node.getAttribute("data-visual-component")
            || ownedVisual?.getAttribute("data-component-id");
          const minimizeEndpoint = node.getAttribute("data-minimize-endpoint");
          const closeWindow = node.getAttribute("data-close-window");
          return {
            id: node.getAttribute("aria-label") || node.textContent?.trim().replace(/\s+/g, " ") || `control-${index}`,
            role: node.getAttribute("role") || node.tagName.toLowerCase(),
            geometry: relative(node),
            ...(visualComponent ? { visualComponent } : {}),
            ...(minimizeEndpoint ? { minimizeEndpoint } : {}),
            ...(closeWindow ? { closeWindow } : {}),
          };
        }),
    };
  }));

  return {
    schemaVersion: "1.0",
    canvas: { width: 849, height: 564 },
    windows,
  };
}

async function main() {
  const prototypeDir = resolve(import.meta.dirname, "..");
  const output = resolve(prototypeDir, "../artifacts/qa/runtime-component-manifest.json");
  await mkdir(dirname(output), { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/google-chrome" });
  try {
    const page = await browser.newPage({ viewport: { width: 849, height: 564 }, deviceScaleFactor: 1 });
    await page.goto(process.env.COMPONENT_MANIFEST_URL ?? "http://10.255.255.254:4174/", { waitUntil: "networkidle" });
    const manifest = await captureRuntimeComponentManifest(page);
    await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`);
    process.stdout.write(`captured ${manifest.windows.length} windows and ${manifest.windows.reduce((sum, window) => sum + window.components.length, 0)} component instances\n`);
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
