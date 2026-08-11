import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const WEB_ROOT = fileURLToPath(new URL("../", import.meta.url));
const HOST = "10.255.255.254";
const MIME = {
  ".css": "text/css",
  ".html": "text/html",
  ".mjs": "text/javascript",
  ".png": "image/png",
};

class ChromePipe {
  constructor() {
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = Buffer.alloc(0);
    this.process = spawn("google-chrome", [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      "--window-size=474,403",
      "--remote-debugging-pipe",
      "--user-data-dir=/tmp/golfstudio-browser-interactions",
      "about:blank",
    ], { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });
    this.process.stdio[4].on("data", (chunk) => this.#receive(chunk));
  }

  #receive(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    let separator;
    while ((separator = this.buffer.indexOf(0)) !== -1) {
      const raw = this.buffer.subarray(0, separator).toString();
      this.buffer = this.buffer.subarray(separator + 1);
      if (!raw) continue;
      const message = JSON.parse(raw);
      const waiter = this.pending.get(message.id);
      if (!waiter) continue;
      this.pending.delete(message.id);
      if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
      else waiter.resolve(message.result);
    }
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const message = { id, method, params };
    if (sessionId) message.sessionId = sessionId;
    const promise = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.process.stdio[3].write(`${JSON.stringify(message)}\0`);
    return promise;
  }

  close() {
    this.process.kill("SIGTERM");
  }
}

function createServer() {
  return http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, "http://golfstudio.local").pathname;
      const relative = pathname === "/" ? "index.html" : pathname.slice(1);
      const resolved = normalize(join(WEB_ROOT, relative));
      if (!resolved.startsWith(normalize(WEB_ROOT))) throw new Error("Invalid path");
      response.setHeader("Content-Type", MIME[extname(resolved)] || "application/octet-stream");
      response.end(await readFile(resolved));
    } catch {
      response.statusCode = 404;
      response.end("Not found");
    }
  });
}

async function openApp(url) {
  const chrome = new ChromePipe();
  const { targetId } = await chrome.send("Target.createTarget", { url });
  const { sessionId } = await chrome.send("Target.attachToTarget", { targetId, flatten: true });
  await chrome.send("Page.enable", {}, sessionId);
  await chrome.send("Runtime.enable", {}, sessionId);
  await chrome.send("Emulation.setDeviceMetricsOverride", {
    width: 474,
    height: 403,
    deviceScaleFactor: 1,
    mobile: false,
  }, sessionId);

  const evaluate = async (expression) => {
    const result = await chrome.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    }, sessionId);
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    }
    return result.result.value;
  };

  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate("document.readyState === 'complete' && Boolean(window.__GOLFSTUDIO_UI__)")) break;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  const point = async (selector, ratio = 0.5) => evaluate(`(() => {
    const rect = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
    return { x: rect.left + rect.width * ${ratio}, y: rect.top + rect.height / 2 };
  })()`);

  const click = async (selector, ratio = 0.5) => {
    const { x, y } = await point(selector, ratio);
    await chrome.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 }, sessionId);
    await chrome.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 }, sessionId);
  };

  const drag = async (selector, fromRatio, toRatio) => {
    const from = await point(selector, fromRatio);
    const to = await point(selector, toRatio);
    await chrome.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...from, button: "none", buttons: 0 }, sessionId);
    await chrome.send("Input.dispatchMouseEvent", { type: "mousePressed", ...from, button: "left", buttons: 1, clickCount: 1 }, sessionId);
    for (let step = 1; step <= 6; step += 1) {
      await chrome.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: from.x + (to.x - from.x) * step / 6,
        y: from.y,
        button: "left",
        buttons: 1,
      }, sessionId);
    }
    await chrome.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...to, button: "left", buttons: 0, clickCount: 1 }, sessionId);
  };

  const key = async (key, code = key) => {
    await chrome.send("Input.dispatchKeyEvent", { type: "keyDown", key, code }, sessionId);
    await chrome.send("Input.dispatchKeyEvent", { type: "keyUp", key, code }, sessionId);
  };

  return { chrome, sessionId, evaluate, click, drag, key };
}

test("P0 controls work through real browser gestures", { timeout: 20_000 }, async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, HOST, resolve));
  const browser = await openApp(`http://${HOST}:${server.address().port}/`);
  const { chrome, evaluate, click, drag, key } = browser;

  try {
    await click('[data-menu="file"]');
    assert.equal(await evaluate("document.querySelector('.golfstudio').dataset.openMenu"), "file");
    await evaluate("window.__fileChooserClicks = 0; document.querySelector('#session-file').addEventListener('click', () => window.__fileChooserClicks += 1)");
    await click('[data-command="open"]');
    assert.equal(await evaluate("window.__fileChooserClicks"), 1);

    await click('[data-menu="club"]');
    await evaluate("[...document.querySelectorAll('[data-popup=club] button')].find((button) => button.textContent === 'putter').click()");
    assert.equal(await evaluate("window.__GOLFSTUDIO_UI__().ui.club"), "putter");
    assert.equal(await evaluate("document.querySelector('#graph-club-title').textContent"), "putter");

    await click('[data-tab="rotation"]');
    assert.equal(await evaluate("window.__GOLFSTUDIO_UI__().ui.panel"), "rotation");
    await drag("#rotation-slider", 0.5, 0.82);
    const rotation = await evaluate("window.__GOLFSTUDIO_UI__().ui.parameters.rotation");
    assert.ok(rotation >= 20, `expected a positive dragged rotation, received ${rotation}`);
    assert.equal(await evaluate("document.querySelector('#rotation-output').textContent"), `${rotation}°`);
    await key("ArrowLeft");
    assert.equal(await evaluate("window.__GOLFSTUDIO_UI__().ui.parameters.rotation"), rotation - 1);

    await click('[data-tab="parameters"]');
    await drag("#loft-slider", 0.5, 0.2);
    const loft = await evaluate("window.__GOLFSTUDIO_UI__().ui.parameters.loft");
    await drag("#tempo-slider", 0.5, 0.9);
    assert.equal(await evaluate("window.__GOLFSTUDIO_UI__().ui.parameters.loft"), loft);
    assert.ok(await evaluate("window.__GOLFSTUDIO_UI__().ui.parameters.tempo") > 100);

    await click("#zoom-select");
    await key("ArrowDown");
    await key("Enter");
    assert.equal(await evaluate("window.__GOLFSTUDIO_UI__().ui.zoom"), 200);
    assert.equal(await evaluate("document.querySelector('#zoom-readout').textContent"), "200%");

    await click(".animate-button");
    assert.equal(await evaluate("window.__GOLFSTUDIO_UI__().swing.playing"), true);
    assert.equal(await evaluate("document.querySelector('.animate-button').getAttribute('aria-label')"), "Stop swing");
    await new Promise((resolve) => setTimeout(resolve, 260));
    assert.notEqual(await evaluate("window.__GOLFSTUDIO_UI__().swing.phase"), "address");
    await click('[data-tab="parts"]');
    assert.equal(await evaluate("window.__GOLFSTUDIO_UI__().ui.panel"), "parts");
    await click(".animate-button");
    assert.equal(await evaluate("window.__GOLFSTUDIO_UI__().swing.playing"), false);
    const stoppedPhase = await evaluate("window.__GOLFSTUDIO_UI__().swing.phase");
    await new Promise((resolve) => setTimeout(resolve, 260));
    assert.equal(await evaluate("window.__GOLFSTUDIO_UI__().swing.phase"), stoppedPhase);

    assert.equal(await evaluate("getComputedStyle(document.querySelector('.club-sprite')).transitionDuration"), "0s");
    assert.equal(await evaluate("getComputedStyle(document.querySelector('#rotation-slider')).appearance"), "none");
  } finally {
    chrome.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
