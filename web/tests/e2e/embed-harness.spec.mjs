import { expect, test } from "@playwright/test";

test("embed harness fails closed when no client id is injected", async ({ page }) => {
  await page.goto("/embed-qa/");

  await expect(page.getByRole("status")).toHaveText("CONFIG_REQUIRED");
  await expect(page.getByText("Inject the Figma Embed API client ID to begin QA.")).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
});

test("embed harness mounts the GolfStudio prototype from injected configuration", async ({ page }) => {
  await page.route("https://embed.figma.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Figma stub</title>" }),
  );
  await page.addInitScript(() => {
    sessionStorage.setItem("golfstudio.embed.clientId", "test-public-client-id");
  });

  await page.goto("/embed-qa/");

  const embed = page.getByTitle("GolfStudio v004 interactive prototype");
  await expect(embed).toHaveAttribute(
    "src",
    /https:\/\/embed\.figma\.com\/proto\/LY8R5xSUKGJJ6UEEuCpzPJ\/GolfStudio-v004\?.*client-id=test-public-client-id/,
  );
  await expect(page.getByRole("status")).toHaveText("WAITING_FOR_FIGMA");
  await expect(page.locator("body")).not.toContainText("test-public-client-id");
});

test("trusted Figma initial load marks the harness ready", async ({ page }) => {
  await page.route("https://embed.figma.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Figma stub</title>" }),
  );
  await page.addInitScript(() => {
    sessionStorage.setItem("golfstudio.embed.clientId", "test-public-client-id");
  });
  await page.goto("/embed-qa/");

  await page.evaluate(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://www.figma.com",
        data: { type: "INITIAL_LOAD" },
      }),
    );
  });

  await expect(page.getByRole("status")).toHaveText("READY");
  await expect(page.getByRole("button", { name: "Restart" })).toBeEnabled();
  await expect(page.getByRole("log")).toContainText("INITIAL_LOAD");
});

test("Figma login screen fails the runtime gate", async ({ page }) => {
  await page.route("https://embed.figma.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Figma stub</title>" }),
  );
  await page.addInitScript(() => {
    sessionStorage.setItem("golfstudio.embed.clientId", "test-public-client-id");
  });
  await page.goto("/embed-qa/");

  await page.evaluate(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://www.figma.com",
        data: { type: "LOGIN_SCREEN_SHOWN" },
      }),
    );
  });

  await expect(page.getByRole("status")).toHaveText("AUTH_REQUIRED");
  await expect(page.getByRole("button", { name: "Restart" })).toBeDisabled();
  await expect(page.getByRole("log")).toContainText("LOGIN_SCREEN_SHOWN");
});

test("presented node changes are exposed as runtime evidence", async ({ page }) => {
  await page.route("https://embed.figma.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Figma stub</title>" }),
  );
  await page.addInitScript(() => {
    sessionStorage.setItem("golfstudio.embed.clientId", "test-public-client-id");
  });
  await page.goto("/embed-qa/");

  await page.evaluate(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://www.figma.com",
        data: {
          type: "PRESENTED_NODE_CHANGED",
          data: { presentedNodeId: "19:3", isStoredInHistory: true },
        },
      }),
    );
  });

  await expect(page.getByText("Current node: 19:3")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__golfstudioEmbedQa.events.at(-1)?.data?.presentedNodeId))
    .toBe("19:3");
});

test("events from untrusted origins cannot change the runtime gate", async ({ page }) => {
  await page.route("https://embed.figma.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Figma stub</title>" }),
  );
  await page.addInitScript(() => {
    sessionStorage.setItem("golfstudio.embed.clientId", "test-public-client-id");
  });
  await page.goto("/embed-qa/");

  await page.evaluate(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://attacker.invalid",
        data: { type: "INITIAL_LOAD" },
      }),
    );
  });

  await expect(page.getByRole("status")).toHaveText("WAITING_FOR_FIGMA");
  await expect(page.getByRole("button", { name: "Restart" })).toBeDisabled();
  await expect(page.getByRole("log")).toBeEmpty();
});
