import { defineConfig } from "../prototype/node_modules/@playwright/test/index.mjs";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: process.env.GODOT_WEB_URL ?? "http://100.103.164.128:4176",
    viewport: { width: 849, height: 564 },
    deviceScaleFactor: 1,
    colorScheme: "light",
    reducedMotion: "no-preference",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  reporter: [["line"]],
  outputDir: "../artifacts/qa/godot-options-v001/playwright",
});
