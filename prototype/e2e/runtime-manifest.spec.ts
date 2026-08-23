import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { captureRuntimeComponentManifest } from "../scripts/capture-component-manifest.mjs";

test("the committed runtime component manifest is a fresh browser capture", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const captured = await captureRuntimeComponentManifest(page);
  const committed = JSON.parse(await readFile(resolve("../artifacts/qa/runtime-component-manifest.json"), "utf8"));

  expect(captured).toEqual(committed);
});

test("the BGM fidelity benchmark resolves every Options control to an independent visual component", async ({ page }) => {
  await page.goto("/?view=options");
  const captured = await captureRuntimeComponentManifest(page);
  const options = captured.windows.find((window) => window.id === "options");
  if (!options) throw new Error("Options benchmark window is absent from the runtime manifest");

  const componentIds = new Set(options.components.map((component) => component.id));
  const unresolved = options.controls
    .filter((control) => !control.visualComponent || !componentIds.has(control.visualComponent))
    .map((control) => control.id);

  expect(unresolved).toEqual([]);
});
