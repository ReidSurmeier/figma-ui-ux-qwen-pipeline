import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["line"], ["html", { open: "never", outputFolder: "artifacts/playwright/report" }]],
  outputDir: "artifacts/playwright/results",
  use: {
    baseURL: "http://10.255.255.254:4173",
    browserName: "chromium",
    launchOptions: { executablePath: "/usr/bin/google-chrome" },
    viewport: { width: 474, height: 403 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "python3 -m http.server 4173 --bind 10.255.255.254 --directory .",
    url: "http://10.255.255.254:4173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
