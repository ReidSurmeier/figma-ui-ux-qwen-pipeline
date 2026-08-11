import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright";

const HARNESS_URL = "https://reidsurmeier.github.io/qwen-image-ui-pipeline/embed-qa/";
const HARNESS_ORIGIN = new URL(HARNESS_URL).origin;
const CLIENT_ID_STORAGE_KEY = "golfstudio.embed.clientId";

export function extractClientId(rawCredential) {
  if (typeof rawCredential !== "string" || rawCredential.length === 0) {
    throw new Error("Figma Embed API credential is missing");
  }

  for (const line of rawCredential.split(/\r?\n/)) {
    const match = line.match(/^\s*Client ID\s*:\s*(\S+)\s*$/i);
    if (match) return match[1];
  }

  throw new Error("Figma Embed API credential has no labeled Client ID");
}

function parseArgs(argv) {
  const options = {
    headless: true,
    timeoutMs: 30_000,
    profileDir: path.join(os.homedir(), ".local", "state", "golfstudio-embed-qa", "chrome-profile"),
    out: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--headed") options.headless = false;
    else if (arg === "--timeout-ms") options.timeoutMs = Number(argv[++index]);
    else if (arg === "--profile-dir") options.profileDir = path.resolve(argv[++index]);
    else if (arg === "--out") options.out = path.resolve(argv[++index]);
    else throw new Error("Unsupported runtime QA option");
  }

  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new Error("Runtime QA timeout must be a positive number");
  }

  return options;
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const clientId = extractClientId(process.env.FIGMA_EMBED_API);
  await mkdir(options.profileDir, { recursive: true, mode: 0o700 });

  const context = await chromium.launchPersistentContext(options.profileDir, {
    executablePath: "/usr/bin/google-chrome",
    headless: options.headless,
    viewport: { width: 1280, height: 900 },
  });

  try {
    await context.addInitScript(
      ({ origin, storageKey, value }) => {
        if (location.origin === origin) sessionStorage.setItem(storageKey, value);
      },
      { origin: HARNESS_ORIGIN, storageKey: CLIENT_ID_STORAGE_KEY, value: clientId },
    );

    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(HARNESS_URL, { waitUntil: "domcontentloaded" });

    let timedOut = false;
    try {
      await page.waitForFunction(
        () => ["READY", "AUTH_REQUIRED"].includes(document.querySelector("[role=status]")?.textContent),
        undefined,
        { timeout: options.timeoutMs },
      );
    } catch (error) {
      if (error?.name !== "TimeoutError") throw error;
      timedOut = true;
    }

    const state = await page.evaluate(() => ({
      status: document.querySelector("[role=status]")?.textContent ?? "MISSING_STATUS",
      currentNode: document.querySelector("#current-node")?.textContent?.replace("Current node: ", "") ?? null,
      events: (window.__golfstudioEmbedQa?.events ?? []).map(({ type, data }) => ({
        type,
        presentedNodeId: data?.presentedNodeId ?? null,
      })),
    }));

    const outcome = timedOut
      ? "ORIGIN_OR_EVENT_UNAVAILABLE"
      : state.status === "AUTH_REQUIRED"
        ? "AUTH_REQUIRED"
        : state.status === "READY"
          ? "READY"
          : "UNEXPECTED_STATUS";
    const evidence = {
      outcome,
      status: state.status,
      currentNode: state.currentNode === "—" ? null : state.currentNode,
      events: state.events,
      harnessUrl: HARNESS_URL,
      checkedAt: new Date().toISOString(),
    };

    if (options.out) {
      await mkdir(path.dirname(options.out), { recursive: true });
      await writeFile(options.out, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
      const screenshotPath = options.out.toLowerCase().endsWith(".json")
        ? options.out.replace(/\.json$/i, ".png")
        : `${options.out}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }

    process.stdout.write(`${JSON.stringify(evidence)}\n`);
    process.exitCode = outcome === "READY" ? 0 : outcome === "AUTH_REQUIRED" ? 2 : 3;
  } finally {
    await context.close();
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  run().catch((error) => {
    process.stderr.write(`${JSON.stringify({ outcome: "RUNNER_ERROR", error: error?.name ?? "Error" })}\n`);
    process.exitCode = 4;
  });
}
