import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  reporter: "line",
  use: {
    baseURL: "http://10.255.255.254:4174",
    browserName: "chromium",
    headless: true,
    launchOptions: {
      executablePath: "/usr/bin/google-chrome",
    },
    viewport: { width: 560, height: 300 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://10.255.255.254:4174",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
