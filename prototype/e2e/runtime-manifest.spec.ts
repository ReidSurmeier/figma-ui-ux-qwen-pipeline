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
