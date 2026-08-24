import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "../../prototype/node_modules/@playwright/test/index.mjs";

const projectRoot = resolve(import.meta.dirname, "../..");
const evidenceDir = resolve(projectRoot, "artifacts/qa/godot-options-v001");
const sourceWindow = resolve(
  projectRoot,
  "benchmarks/japanese-rpg-options-v001/regions/options-window/reference.png",
);
const sourceDesktop = resolve(
  projectRoot,
  "benchmarks/japanese-rpg-options-v001/reference.png",
);
const sourceInventory = resolve(
  projectRoot,
  "benchmarks/japanese-rpg-options-v001/regions/inventory/reference.png",
);
const windowRegistry = JSON.parse(readFileSync(resolve(
  projectRoot,
  "benchmarks/japanese-rpg-options-v001/windows.json",
), "utf8"));
const componentManifest = JSON.parse(readFileSync(resolve(
  projectRoot,
  "artifacts/qa/runtime-component-manifest.json",
), "utf8"));
const windowVerification = JSON.parse(readFileSync(resolve(
  projectRoot,
  "prototype/qa/window-verification.json",
), "utf8"));

const INITIAL_WINDOW = { x: 345, y: 182, width: 280, height: 122 };
const BASIC_INFO_WINDOW = { x: 0, y: 0, width: 280, height: 120 };
const BASIC_INFO_COMPONENTS = [
  "page-status",
  "page-option",
  "page-items",
  "page-equip",
  "page-skill",
  "page-map",
  "page-chat",
  "page-friend",
];

function canvasPoint(canvas, localX, localY) {
  return {
    x: canvas.x + (localX / 849) * canvas.width,
    y: canvas.y + (localY / 564) * canvas.height,
  };
}

function canvasClip(canvas, localX, localY, width, height) {
  const point = canvasPoint(canvas, localX, localY);
  return {
    x: point.x,
    y: point.y,
    width: (width / 849) * canvas.width,
    height: (height / 564) * canvas.height,
  };
}

function imageMagick(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) throw result.error;
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
}

async function state(page) {
  return page.evaluate(() => window.godotQaState);
}

async function clickCanvas(page, canvas, x, y) {
  const point = canvasPoint(canvas, x, y);
  await page.mouse.click(point.x, point.y);
}

async function settleRenderedFrames(page, count = 3) {
  await page.evaluate(async (frameCount) => {
    for (let index = 0; index < frameCount; index += 1) {
      await new Promise(requestAnimationFrame);
    }
  }, count);
}

test.beforeEach(async ({ page }) => {
  // Godot replaces the initial document while bootstrapping the Web export.
  // Waiting for the browser's final `load` event makes that intentional frame
  // replacement look like a failed navigation. Commit the response, then use
  // the engine-owned canvas and QA state as the real readiness authorities.
  try {
    await page.goto("./", { waitUntil: "commit", timeout: 15_000 });
  } catch (error) {
    if (!/ERR_ABORTED|frame was detached/i.test(String(error))) throw error;
  }
  await page.locator("canvas").waitFor({ state: "visible" });
  await expect.poll(() => state(page)).toMatchObject({ ready: true });
});

test("isolated Options boots on the final Godot surface before desktop assembly", async ({ page }) => {
  try {
    await page.goto("?isolate=options", { waitUntil: "commit", timeout: 15_000 });
  } catch (error) {
    if (!/ERR_ABORTED|frame was detached/i.test(String(error))) throw error;
  }
  const canvas = page.locator("canvas");
  await canvas.waitFor({ state: "visible" });
  await expect.poll(() => state(page), { timeout: 5_000 }).toMatchObject({
    ready: true,
    background: "#ff00fe",
    isolated_window: "options",
    visible_window_ids: ["options"],
  });

  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Godot canvas has no geometry");
  const sourcePinkPoint = canvasPoint(bounds, 300, 160);
  const pixelPath = resolve(evidenceDir, "godot-options-isolated-source-pink.png");
  await page.screenshot({
    path: pixelPath,
    clip: { x: sourcePinkPoint.x, y: sourcePinkPoint.y, width: 1, height: 1 },
  });
  expect(imageMagick("convert", [pixelPath, "-format", "%[hex:p{0,0}]", "info:"])).toBe("FF00FE");
});

test("isolated Chat owns its complete form state on the final Godot surface", async ({ page }) => {
	// This is a state-filmstrip gate, not only a semantic state assertion. It
	// catches the native-editor overflow that previously covered the Room row.
  mkdirSync(evidenceDir, { recursive: true });
  try {
    await page.goto("?isolate=chat", { waitUntil: "commit", timeout: 15_000 });
  } catch (error) {
    if (!/ERR_ABORTED|frame was detached/i.test(String(error))) throw error;
  }
  const canvas = page.locator("canvas");
  await canvas.waitFor({ state: "visible" });
  await expect.poll(() => state(page)).toMatchObject({
    isolated_window: "chat",
    visible_window_ids: ["chat"],
    windows: {
      chat: {
        chat_form: {
          topic: "",
          room: "チャット・ルーム",
          privacy: "公開",
          room_menu_open: false,
          feedback: "",
        },
      },
    },
  });

  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Godot canvas has no geometry");
  const chat = { x: 285, y: 279 };
  const windowClip = canvasClip(bounds, chat.x, chat.y, 280, 120);
  const titleClip = canvasClip(bounds, chat.x, chat.y, 280, 18);
  const topicClip = canvasClip(bounds, chat.x + 44, chat.y + 26, 232, 19);
  const privacyClip = canvasClip(bounds, chat.x + 40, chat.y + 65, 61, 20);
  const initialWindow = await page.screenshot({
    path: resolve(evidenceDir, "godot-chat-idle.png"),
    clip: windowClip,
  });
  const initialTitle = await page.screenshot({ clip: titleClip });
  const initialTopic = await page.screenshot({ clip: topicClip });
  const initialPrivacy = await page.screenshot({ clip: privacyClip });

  await clickCanvas(page, bounds, chat.x + 100, chat.y + 35);
  await expect(page.locator("#godot-chat-topic")).toBeFocused({ timeout: 3_000 });
  await page.keyboard.insertText("内部テスト");
  await expect(page.locator("#godot-chat-topic")).toHaveValue("内部テスト");
  await expect.poll(async () => (await state(page)).windows.chat.chat_form.topic, { timeout: 5_000 }).toBe("内部テスト");
  const typedTopic = await page.screenshot({
    path: resolve(evidenceDir, "godot-chat-typed.png"),
    clip: topicClip,
  });
  expect(typedTopic.equals(initialTopic), "Japanese topic text did not visibly change its source field").toBe(false);
  expect((await page.screenshot({ clip: titleClip })).equals(initialTitle), "topic entry changed Chat title pixels").toBe(true);

  await clickCanvas(page, bounds, chat.x + 225, chat.y + 55);
  await expect.poll(async () => (await state(page)).windows.chat.chat_form.room_menu_open, { timeout: 3_000 }).toBe(true);
  await page.screenshot({ path: resolve(evidenceDir, "godot-chat-room-menu.png"), clip: windowClip });
  await clickCanvas(page, bounds, chat.x + 220, chat.y + 91);
  await expect.poll(async () => (await state(page)).windows.chat.chat_form.room).toBe("パーティー");

  await clickCanvas(page, bounds, chat.x + 90, chat.y + 75);
  await expect.poll(async () => (await state(page)).windows.chat.chat_form.privacy).toBe("非公開");
  const privateState = await page.screenshot({
    path: resolve(evidenceDir, "godot-chat-private.png"),
    clip: privacyClip,
  });
  expect(privateState.equals(initialPrivacy), "privacy ownership changed semantically but not visually").toBe(false);
  await page.screenshot({ path: resolve(evidenceDir, "godot-chat-settled.png"), clip: windowClip });
  await clickCanvas(page, bounds, chat.x + 211, chat.y + 108);
  await expect.poll(async () => (await state(page)).windows.chat.chat_form.feedback)
    .toBe("非公開 パーティー「内部テスト」を作成しました");

  await clickCanvas(page, bounds, chat.x + 255, chat.y + 108);
  await expect.poll(async () => (await state(page)).windows.chat.chat_form).toEqual({
    topic: "",
    room: "チャット・ルーム",
    privacy: "公開",
    room_menu_open: false,
    feedback: "キャンセルしました",
  });
  const resetWindow = await page.screenshot({
    path: resolve(evidenceDir, "godot-chat-reset.png"),
    clip: windowClip,
  });
  expect(resetWindow.equals(initialWindow), "cancel did not restore the complete Chat visual state").toBe(true);
});

test("isolated Card animates, scrolls real copy, and restores exact pixels on final Godot", async ({ page }) => {
  mkdirSync(evidenceDir, { recursive: true });
  try {
    await page.goto("?isolate=card", { waitUntil: "commit", timeout: 15_000 });
  } catch (error) {
    if (!/ERR_ABORTED|frame was detached/i.test(String(error))) throw error;
  }
  const canvas = page.locator("canvas");
  await canvas.waitFor({ state: "visible" });
  await expect.poll(() => state(page)).toMatchObject({
    isolated_window: "card",
    visible_window_ids: ["card"],
    windows: {
      card: {
        card_state: { rotated: false, scroll: 0, slot_active: false },
      },
    },
  });

  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Godot canvas has no geometry");
  const card = { x: 285, y: 0 };
  const windowClip = canvasClip(bounds, card.x, card.y, 280, 150);
  const titleClip = canvasClip(bounds, card.x, card.y, 280, 18);
  const artClip = canvasClip(bounds, card.x + 5, card.y + 18, 82, 96);
  const copyClip = canvasClip(bounds, card.x + 90, card.y + 20, 155, 92);
  const titleAuthority = await page.screenshot({ clip: titleClip });
  const artAuthority = await page.screenshot({ clip: artClip });
  const copyAuthority = await page.screenshot({ clip: copyClip });
  await page.screenshot({ path: resolve(evidenceDir, "godot-card-idle.png"), clip: windowClip });

  const dragStart = canvasPoint(bounds, card.x + 150, card.y + 9);
  await page.mouse.move(dragStart.x, dragStart.y);
  await page.mouse.down();
  await page.mouse.move(dragStart.x + 10, dragStart.y + 10, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await state(page)).windows.card.position).toEqual([295, 10]);
  const movedStart = canvasPoint(bounds, card.x + 160, card.y + 19);
  await page.mouse.move(movedStart.x, movedStart.y);
  await page.mouse.down();
  await page.mouse.move(movedStart.x - 10, movedStart.y - 10, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await state(page)).windows.card.position).toEqual([285, 0]);
  expect((await page.screenshot({ clip: titleClip })).equals(titleAuthority), "Card drag/restore changed title pixels").toBe(true);

  await clickCanvas(page, bounds, card.x + 46, card.y + 66);
  await expect.poll(async () => (await state(page)).windows.card.card_state.rotated).toBe(true);
  expect((await page.screenshot({ clip: artClip })).equals(artAuthority), "Card art did not visibly animate").toBe(false);
  expect((await page.screenshot({ clip: titleClip })).equals(titleAuthority), "Card animation changed title pixels").toBe(true);
  expect((await page.screenshot({ clip: copyClip })).equals(copyAuthority), "Card animation changed copy pixels").toBe(true);
  await page.screenshot({ path: resolve(evidenceDir, "godot-card-rotated.png"), clip: windowClip });
  await clickCanvas(page, bounds, card.x + 46, card.y + 66);
  await expect.poll(async () => (await state(page)).windows.card.card_state.rotated).toBe(false);
  expect((await page.screenshot({ clip: artClip })).equals(artAuthority), "Card art did not restore exactly").toBe(true);

  const copyStates = new Set();
  for (let step = 1; step < 10; step += 1) {
    await clickCanvas(page, bounds, card.x + 262, card.y + 34 + 79 * (step / 10));
    copyStates.add((await page.screenshot({ clip: copyClip })).toString("base64"));
    expect((await page.screenshot({ clip: titleClip })).equals(titleAuthority), `Card scroll step ${step} entered title`).toBe(true);
    expect((await page.screenshot({ clip: artClip })).equals(artAuthority), `Card scroll step ${step} changed art`).toBe(true);
    if (step === 5) await page.screenshot({ path: resolve(evidenceDir, "godot-card-scroll-mid.png"), clip: windowClip });
  }
  expect(copyStates.size, "Card scroll exposed four or fewer copy states").toBeGreaterThan(4);

  await clickCanvas(page, bounds, card.x + 150, card.y + 134);
  await expect.poll(async () => (await state(page)).windows.card.card_state).toMatchObject({ scroll: 70, slot_active: true });
  await page.screenshot({ path: resolve(evidenceDir, "godot-card-slot-active.png"), clip: windowClip });
  await clickCanvas(page, bounds, card.x + 150, card.y + 134);
  await expect.poll(async () => (await state(page)).windows.card.card_state).toMatchObject({ scroll: 30, slot_active: false });
  await clickCanvas(page, bounds, card.x + 272, card.y + 9);
  await expect.poll(async () => (await state(page)).windows.card.visible).toBe(false);
  await expect.poll(async () => (await state(page)).visible_window_ids).toEqual([]);
});

test("isolated Skills exposes both clipped pages and every real control on final Godot", async ({ page }) => {
  mkdirSync(evidenceDir, { recursive: true });
  try {
    await page.goto("?isolate=skills", { waitUntil: "commit", timeout: 15_000 });
  } catch (error) {
    if (!/ERR_ABORTED|frame was detached/i.test(String(error))) throw error;
  }
  const canvas = page.locator("canvas");
  await canvas.waitFor({ state: "visible" });
  await expect.poll(() => state(page), { timeout: 5_000 }).toMatchObject({
    isolated_window: "skills",
    visible_window_ids: ["skills"],
    windows: {
      skills: {
        skills_state: { scroll: 34, selected_index: 0, leveled_indices: [], feedback: "" },
      },
    },
  });
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Godot canvas has no geometry");
  const skills = { x: 568, y: 0 };
  const windowClip = canvasClip(bounds, skills.x, skills.y, 281, 184);
  const titleClip = canvasClip(bounds, skills.x, skills.y, 281, 18);
  const listClip = canvasClip(bounds, skills.x + 2, skills.y + 18, 261, 144);
  const footerClip = canvasClip(bounds, skills.x, skills.y + 162, 281, 22);
  const titleAuthority = await page.screenshot({ clip: titleClip });
  const footerAuthority = await page.screenshot({ clip: footerClip });
  const listStates = new Set();
  await page.screenshot({ path: resolve(evidenceDir, "godot-skills-idle.png"), clip: windowClip });

  for (let step = 1; step < 10; step += 1) {
    await clickCanvas(page, bounds, skills.x + 271, skills.y + 18 + 143 * (step / 10));
    listStates.add((await page.screenshot({ clip: listClip })).toString("base64"));
    expect((await page.screenshot({ clip: titleClip })).equals(titleAuthority), `Skills scroll ${step} entered title`).toBe(true);
    expect((await page.screenshot({ clip: footerClip })).equals(footerAuthority), `Skills scroll ${step} entered footer`).toBe(true);
    if (step === 5) await page.screenshot({ path: resolve(evidenceDir, "godot-skills-scroll-mid.png"), clip: windowClip });
  }
  expect(listStates.size, "Skills exposed four or fewer list states").toBeGreaterThan(4);

  const names = ["ディバインプロテクション", "ワープポータル", "ニューマ", "ヒール", "エンジェラス", "ブレッシング", "速度増加", "ルアフ"];
  for (const pageStart of [0, 4]) {
    const targetScroll = pageStart === 0 ? 34 : 100;
    const scrollY = skills.y + 18 + 143 * (targetScroll / 100);
    await clickCanvas(page, bounds, skills.x + 271, scrollY);
    await expect.poll(async () => (await state(page)).windows.skills.skills_state.scroll).toBe(targetScroll);
    for (let visibleRow = 0; visibleRow < 4; visibleRow += 1) {
      const index = pageStart + visibleRow;
      const rowY = skills.y + 18 + visibleRow * 36 + 18;
      await clickCanvas(page, bounds, skills.x + 190, rowY);
      await expect.poll(async () => (await state(page)).windows.skills.skills_state.selected_index).toBe(index);
      await clickCanvas(page, bounds, skills.x + 89, rowY);
      await expect.poll(async () => (await state(page)).windows.skills.skills_state.leveled_indices).toContain(index);
      await clickCanvas(page, bounds, skills.x + 89, rowY);
      await expect.poll(async () => (await state(page)).windows.skills.skills_state.leveled_indices).not.toContain(index);
    }
  }
  await page.screenshot({ path: resolve(evidenceDir, "godot-skills-page-two.png"), clip: windowClip });
  await clickCanvas(page, bounds, skills.x + 196, skills.y + 174);
  await expect.poll(async () => (await state(page)).windows.skills.skills_state.feedback).toBe(`use ${names[7]}`);
  await page.screenshot({ path: resolve(evidenceDir, "godot-skills-use.png"), clip: windowClip });
  expect((await page.screenshot({ clip: titleClip })).equals(titleAuthority), "Skills actions changed title pixels").toBe(true);
  expect((await page.screenshot({ clip: footerClip })).equals(footerAuthority), "Skills actions changed footer pixels").toBe(false);
  await clickCanvas(page, bounds, skills.x + 241, skills.y + 174);
  await expect.poll(async () => (await state(page)).windows.skills.visible).toBe(false);
});

test("isolated Status changes only local values and uses its generated minimize endpoint", async ({ page }) => {
  mkdirSync(evidenceDir, { recursive: true });
  try {
    await page.goto("?isolate=status", { waitUntil: "commit", timeout: 15_000 });
  } catch (error) {
    if (!/ERR_ABORTED|frame was detached/i.test(String(error))) throw error;
  }
  const canvas = page.locator("canvas");
  await canvas.waitFor({ state: "visible" });
  await expect.poll(() => state(page), { timeout: 5_000 }).toMatchObject({
    isolated_window: "status",
    visible_window_ids: ["status"],
    windows: { status: { status_state: { values: [1, 1, 1, 0, 1, 1] } } },
  });
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Godot canvas has no geometry");
  const statusWindow = { x: 0, y: 120 };
  const windowClip = canvasClip(bounds, statusWindow.x, statusWindow.y, 280, 126);
  const rows = [0, 1, 2, 4, 5];
  await settleRenderedFrames(page);
  await page.screenshot({ path: resolve(evidenceDir, "godot-status-idle.png"), clip: windowClip });
  const rowAuthorities = new Map();
  for (const row of rows) {
    const authority = await page.screenshot({ clip: canvasClip(bounds, statusWindow.x + 20, statusWindow.y + 18 + row * 18, 258, 18) });
    rowAuthorities.set(row, authority);
    writeFileSync(resolve(evidenceDir, `godot-status-row-${row}-authority.png`), authority);
  }
  for (const row of rows) {
    const labelClip = canvasClip(bounds, statusWindow.x + 20, statusWindow.y + 18 + row * 18, 30, 18);
    const valueClip = canvasClip(bounds, statusWindow.x + 50, statusWindow.y + 18 + row * 18, 52, 18);
    const derivedClip = canvasClip(bounds, statusWindow.x + 102, statusWindow.y + 18 + row * 18, 176, 18);
    const labelBefore = await page.screenshot({ clip: labelClip });
    const valueBefore = await page.screenshot({ clip: valueClip });
    const derivedBefore = await page.screenshot({ clip: derivedClip });
    await clickCanvas(page, bounds, statusWindow.x + 96, statusWindow.y + 26 + row * 18);
    await expect.poll(async () => (await state(page)).windows.status.status_state.values[row]).toBe(2);
    await settleRenderedFrames(page);
    expect((await page.screenshot({ clip: labelClip })).equals(labelBefore), `Status row ${row} changed its label`).toBe(true);
    expect((await page.screenshot({ clip: valueClip })).equals(valueBefore), `Status row ${row} did not visibly change its value`).toBe(false);
    expect((await page.screenshot({ clip: derivedClip })).equals(derivedBefore), `Status row ${row} changed its derived value`).toBe(true);
    for (const other of rows.filter((candidate) => candidate !== row)) {
      const otherClip = canvasClip(bounds, statusWindow.x + 20, statusWindow.y + 18 + other * 18, 258, 18);
      if ((await state(page)).windows.status.status_state.values[other] === 1) {
        const otherAfter = await page.screenshot({ clip: otherClip });
        if (!otherAfter.equals(rowAuthorities.get(other))) {
          const afterPath = resolve(evidenceDir, `godot-status-row-${other}-after-row-${row}.png`);
          writeFileSync(afterPath, otherAfter);
          const errorPixels = Number(imageMagick("compare", [
            "-metric", "AE",
            resolve(evidenceDir, `godot-status-row-${other}-authority.png`),
            afterPath,
            "null:",
          ]).match(/\d+/)?.[0]);
          expect(errorPixels, `Status row ${row} visibly changed row ${other}`).toBeLessThanOrEqual(4);
        }
      }
    }
  }
  await page.screenshot({ path: resolve(evidenceDir, "godot-status-incremented.png"), clip: windowClip });

  await clickCanvas(page, bounds, statusWindow.x + 258, statusWindow.y + 9);
  await expect.poll(async () => (await state(page)).windows.status.minimized).toBe(true);
  const minimizedState = (await state(page)).windows.status;
  expect(minimizedState.size).toEqual([180, 18]);
  expect(new Set(minimizedState.minimize_samples).size).toBeGreaterThan(4);
  await page.screenshot({
    path: resolve(evidenceDir, "godot-status-minimized.png"),
    clip: canvasClip(bounds, statusWindow.x, statusWindow.y, 180, 18),
  });
  await clickCanvas(page, bounds, statusWindow.x + 90, statusWindow.y + 9);
  await expect.poll(async () => (await state(page)).windows.status.minimized).toBe(false);
  await expect.poll(async () => (await state(page)).windows.status.size).toEqual([280, 126]);
  await page.screenshot({ path: resolve(evidenceDir, "godot-status-restored.png"), clip: windowClip });
  await clickCanvas(page, bounds, statusWindow.x + 272, statusWindow.y + 9);
  await expect.poll(async () => (await state(page)).windows.status.visible).toBe(false);
});

test("isolated Inventory clips every scroll state, owns categories, and restores its generated endpoint", async ({ page }) => {
  mkdirSync(evidenceDir, { recursive: true });
  try {
    await page.goto("?isolate=inventory", { waitUntil: "commit", timeout: 15_000 });
  } catch (error) {
    if (!/ERR_ABORTED|frame was detached/i.test(String(error))) throw error;
  }
  const canvas = page.locator("canvas");
  await canvas.waitFor({ state: "visible" });
  await expect.poll(() => state(page), { timeout: 5_000 }).toMatchObject({
    isolated_window: "inventory",
    visible_window_ids: ["inventory"],
    windows: {
      inventory: {
        inventory_state: {
          category: "item",
          visible_cells: 21,
          selected_cells: { item: -1, equip: -1, etc: -1 },
          scroll: 0,
        },
      },
    },
  });

  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Godot canvas has no geometry");
  const inventory = { x: 0, y: 247 };
  const windowClip = canvasClip(bounds, inventory.x, inventory.y, 280, 137);
  const titleClip = canvasClip(bounds, inventory.x, inventory.y, 263, 18);
  const bodyClip = canvasClip(bounds, inventory.x + 36, inventory.y + 18, 227, 103);
  const scrollbarClip = canvasClip(bounds, inventory.x + 263, inventory.y + 18, 17, 101);
  const idlePath = resolve(evidenceDir, "godot-inventory-idle.png");
  const idle = await page.screenshot({ path: idlePath, clip: windowClip });
  expect(Number(imageMagick("compare", ["-metric", "MAE", sourceInventory, idlePath, "null:"]).match(/\(([^)]+)\)/)?.[1] ?? "0"))
    .toBeLessThanOrEqual(0.01);
  const titleAuthority = await page.screenshot({ clip: titleClip });

  const categoryStates = new Set();
  for (const [category, y, count] of [["equip", 70, 14], ["etc", 105, 7], ["item", 35, 21]]) {
    await clickCanvas(page, bounds, inventory.x + 19, inventory.y + y);
    await expect.poll(async () => (await state(page)).windows.inventory.inventory_state)
      .toMatchObject({ category, visible_cells: count });
    expect((await page.screenshot({ clip: titleClip })).equals(titleAuthority), `${category} tab changed Inventory title pixels`).toBe(true);
    const categoryFrame = await page.screenshot({
      path: resolve(evidenceDir, `godot-inventory-${category}.png`),
      clip: windowClip,
    });
    categoryStates.add(categoryFrame.toString("base64"));
  }
  expect(categoryStates.size, "Inventory categories did not own three visually distinct settled states").toBe(3);

  await clickCanvas(page, bounds, inventory.x + 53, inventory.y + 36);
  await expect.poll(async () => (await state(page)).windows.inventory.inventory_state.selected_cells.item).toBe(0);
  await clickCanvas(page, bounds, inventory.x + 87, inventory.y + 36);
  await expect.poll(async () => (await state(page)).windows.inventory.inventory_state.selected_cells.item).toBe(1);
  await expect.poll(async () => (await state(page)).windows.inventory.inventory_state.selected_visible_indices).toEqual([1]);

  const bodyStates = new Set();
  const scrollbarStates = new Set();
  for (let step = 1; step < 10; step += 1) {
    await clickCanvas(page, bounds, inventory.x + 271, inventory.y + 18 + 101 * (step / 10));
    const inventoryState = (await state(page)).windows.inventory.inventory_state;
    bodyStates.add((await page.screenshot({ clip: bodyClip })).toString("base64"));
    scrollbarStates.add((await page.screenshot({ clip: scrollbarClip })).toString("base64"));
    expect((await page.screenshot({ clip: titleClip })).equals(titleAuthority), `Inventory scroll ${inventoryState.scroll} leaked into the title`).toBe(true);
  }
  expect(bodyStates.size, "Inventory exposed four or fewer body states").toBeGreaterThan(4);
  expect(scrollbarStates.size, "Inventory thumb exposed four or fewer positions").toBeGreaterThan(4);
  await page.screenshot({ path: resolve(evidenceDir, "godot-inventory-scroll-end.png"), clip: windowClip });

  await clickCanvas(page, bounds, inventory.x + 258, inventory.y + 9);
  await expect.poll(async () => (await state(page)).windows.inventory.minimized).toBe(true);
  const minimized = (await state(page)).windows.inventory;
  expect(minimized.size).toEqual([180, 18]);
  expect(new Set(minimized.minimize_samples).size).toBeGreaterThan(4);
  await page.screenshot({
    path: resolve(evidenceDir, "godot-inventory-minimized.png"),
    clip: canvasClip(bounds, inventory.x, inventory.y, 180, 18),
  });
  await clickCanvas(page, bounds, inventory.x + 90, inventory.y + 9);
  await expect.poll(async () => (await state(page)).windows.inventory.minimized).toBe(false);
  await expect.poll(async () => (await state(page)).windows.inventory.size).toEqual([280, 137]);
  await page.screenshot({ path: resolve(evidenceDir, "godot-inventory-restored.png"), clip: windowClip });
  await clickCanvas(page, bounds, inventory.x + 272, inventory.y + 9);
  await expect.poll(async () => (await state(page)).windows.inventory.visible).toBe(false);
});

test("Godot composes all independent windows over the original pink desktop", async ({ page }) => {
  mkdirSync(evidenceDir, { recursive: true });
  await expect.poll(() => state(page)).toMatchObject({
    background: "qwen-image-3-pro",
    background_asset: "res://assets/windows/japanese-rpg-v001/desktop/background.png",
    window_count: 15,
    component_count: 269,
    control_count: 150,
    desktop_mapped_controls: 150,
    movable_windows: 15,
  });

  const screenshot = resolve(evidenceDir, "godot-full-desktop.png");
  await page.locator("canvas").screenshot({ path: screenshot });
  const comparison = spawnSync(
    "compare",
    ["-metric", "MAE", sourceDesktop, screenshot, "null:"],
    { encoding: "utf8" },
  );
  expect([0, 1]).toContain(comparison.status);
  const normalizedMae = Number(comparison.stderr.trim().match(/\(([^)]+)\)/)?.[1]);
  const highErrorCount = Number(imageMagick("compare", [
    "-metric", "AE", "-fuzz", "10%", sourceDesktop, screenshot, "null:",
  ]).match(/\d+(?:\.\d+)?/)?.[0]);
  const report = {
    sourceSha256: createHash("sha256").update(readFileSync(sourceDesktop)).digest("hex"),
    runtimeSha256: createHash("sha256").update(readFileSync(screenshot)).digest("hex"),
    normalizedMae,
    highErrorPixelRate: highErrorCount / (849 * 564),
    windows: 15,
    components: 269,
    controls: 150,
  };
  writeFileSync(resolve(evidenceDir, "full-desktop-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  expect(report.normalizedMae).toBeLessThanOrEqual(0.055);
  expect(report.highErrorPixelRate).toBeLessThanOrEqual(0.17);

  const acceptedBgmFloor = 0.03668;
  const perWindowDir = resolve(evidenceDir, "windows");
  mkdirSync(perWindowDir, { recursive: true });
  const windowMetrics = [];
  for (const window of windowRegistry.windows) {
    const [x, y, width, height] = window.bounds;
    const sourceCrop = resolve(perWindowDir, `${window.id}-source.png`);
    const runtimeCrop = resolve(perWindowDir, `${window.id}-runtime.png`);
    const sourceMask = resolve(perWindowDir, `${window.id}-source-surface-mask.png`);
    const sourceMasked = resolve(perWindowDir, `${window.id}-source-masked.png`);
    const runtimeMasked = resolve(perWindowDir, `${window.id}-runtime-masked.png`);
    for (const [input, output] of [[sourceDesktop, sourceCrop], [screenshot, runtimeCrop]]) {
      execFileSync("convert", [input, "-crop", `${width}x${height}+${x}+${y}`, "+repage", output]);
    }
    execFileSync("convert", [sourceCrop, "-alpha", "off", "-fx", "((r>0.45)&&(b>0.45)&&(g<0.95)&&(r-g)>0.04&&(b-g)>0.04)?0:1", sourceMask]);
    for (const [input, output] of [[sourceCrop, sourceMasked], [runtimeCrop, runtimeMasked]]) {
      execFileSync("convert", [input, sourceMask, "-alpha", "off", "-compose", "CopyOpacity", "-composite", "-background", "black", "-alpha", "remove", output]);
    }
    const comparison = spawnSync("compare", ["-metric", "MAE", sourceMasked, runtimeMasked, "null:"], {
      encoding: "utf8",
    });
    expect([0, 1]).toContain(comparison.status);
    const normalizedMae = Number(comparison.stderr.trim().match(/\(([^)]+)\)/)?.[1]);
    const verification = windowVerification.windows.find(({ id }) => id === window.id);
    let assemblyNormalizedMae = null;
    if (window.id !== "options") {
      const manifestWindow = componentManifest.windows.find(({ id }) => id === window.id);
      const assembly = resolve(perWindowDir, `${window.id}-offline-assembly.png`);
      execFileSync("convert", [
        resolve(projectRoot, "prototype/public", manifestWindow.cleanPlate.replace(/^\//, "")),
        assembly,
      ]);
      for (const component of manifestWindow.components) {
        execFileSync("composite", [
          "-geometry",
          `+${component.geometry.x}+${component.geometry.y}`,
          resolve(projectRoot, "prototype/public", component.assetPath.replace(/^\//, "")),
          assembly,
          assembly,
        ]);
      }
      const assemblyMasked = resolve(perWindowDir, `${window.id}-offline-assembly-masked.png`);
      execFileSync("convert", [assembly, sourceMask, "-alpha", "off", "-compose", "CopyOpacity", "-composite", "-background", "black", "-alpha", "remove", assemblyMasked]);
      const assemblyComparison = spawnSync(
        "compare",
        ["-metric", "MAE", sourceMasked, assemblyMasked, "null:"],
        { encoding: "utf8" },
      );
      expect([0, 1]).toContain(assemblyComparison.status);
      assemblyNormalizedMae = Number(assemblyComparison.stderr.trim().match(/\(([^)]+)\)/)?.[1]);
    }
    const meetsFloor = normalizedMae <= acceptedBgmFloor;
    const failsBeforeGodot = assemblyNormalizedMae !== null && assemblyNormalizedMae > acceptedBgmFloor;
    windowMetrics.push({
      id: window.id,
      bounds: window.bounds,
      normalizedMae,
      assemblyNormalizedMae,
      acceptedBgmFloor,
      visualStatus: meetsFloor ? "meets-bgm-floor" : "revision-required",
      verificationStatus: verification?.status ?? "missing",
      correctionRoute: meetsFloor ? null : (failsBeforeGodot ? "qwen-asset-pass" : "godot-assembly"),
    });
  }
  const perWindowReport = {
    sourceSha256: report.sourceSha256,
    runtimeSha256: report.runtimeSha256,
    acceptedBgmFloor,
    windows: windowMetrics,
    revisionRequired: windowMetrics.filter(({ visualStatus }) => visualStatus === "revision-required").map(({ id }) => id),
  };
  writeFileSync(resolve(evidenceDir, "per-window-fidelity-report.json"), `${JSON.stringify(perWindowReport, null, 2)}\n`);
  expect(windowMetrics).toHaveLength(15);
  for (const metric of windowMetrics) {
    expect(metric.normalizedMae, `${metric.id} fell below the accepted BGM fidelity floor`).toBeLessThanOrEqual(acceptedBgmFloor);
  }
});

test("Basic Info keeps every source navigation image in the exported Godot scene", async ({ page }) => {
  mkdirSync(evidenceDir, { recursive: true });
  const basicInfo = componentManifest.windows.find((window) => window.id === "basic-info");
  expect(basicInfo).toBeDefined();
  expect(basicInfo.components.map((component) => component.id)).toEqual(
    expect.arrayContaining(BASIC_INFO_COMPONENTS),
  );
  await expect.poll(async () => (await state(page)).windows["basic-info"]).toMatchObject({
    components: 27,
    controls: 11,
    mapped_controls: 11,
  });

  const desktopScreenshot = resolve(evidenceDir, "godot-basic-info-desktop.png");
  const screenshot = resolve(evidenceDir, "godot-basic-info.png");
  await page.locator("canvas").screenshot({ path: desktopScreenshot });
  execFileSync("convert", [
    desktopScreenshot,
    "-crop",
    `${BASIC_INFO_WINDOW.width}x${BASIC_INFO_WINDOW.height}+${BASIC_INFO_WINDOW.x}+${BASIC_INFO_WINDOW.y}`,
    "+repage",
    screenshot,
  ]);
  for (const component of basicInfo.components.filter(({ id }) => BASIC_INFO_COMPONENTS.includes(id))) {
    const pixel = imageMagick("convert", [
      screenshot,
      "-crop",
      `1x1+${component.geometry.x + Math.floor(component.geometry.width / 2)}+${component.geometry.y + Math.floor(component.geometry.height / 2)}`,
      "txt:-",
    ]);
    expect(pixel, `${component.id} must not collapse to the pink desktop`).not.toContain("#FF00FE");
  }
});

test("all source windows move through real pointer gestures and controls answer at their mapped surfaces", async ({ page }) => {
  // This journey intentionally replays 30 drag gestures plus one representative
  // control on every interactive sibling. Software-rendered Godot in CI is
  // slower than the WSL review runtime, so give the exhaustive replay its own
  // budget without weakening any of the per-window assertions below.
  test.setTimeout(90_000);
  const canvas = await page.locator("canvas").boundingBox();
  if (!canvas) throw new Error("Godot canvas has no geometry");
  const topFirst = [...windowRegistry.windows].reverse();
  const dragLocal = {
    "bottom-bar": [50, 10],
    notification: [12, 5],
    quickbar: [96, 70],
  };

  for (const window of topFirst) {
    const [sourceX, sourceY, width, height] = window.bounds;
    const before = (await state(page)).windows[window.id].position;
    const [localX, localY] = dragLocal[window.id] ?? [20, 9];
    const dx = sourceX + width + 6 <= 849 ? 6 : -6;
    const dy = sourceY + height + 5 <= 564 ? 5 : -5;
    const start = canvasPoint(canvas, before[0] + localX, before[1] + localY);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + dx, start.y + dy, { steps: 3 });
    await page.mouse.up();
    await expect.poll(async () => (await state(page)).windows[window.id].position).toEqual([
      before[0] + dx,
      before[1] + dy,
    ]);

    const moved = canvasPoint(canvas, before[0] + dx + localX, before[1] + dy + localY);
    await page.mouse.move(moved.x, moved.y);
    await page.mouse.down();
    await page.mouse.move(moved.x - dx, moved.y - dy, { steps: 3 });
    await page.mouse.up();
    await expect.poll(async () => (await state(page)).windows[window.id].position).toEqual(before);
  }

  for (const window of componentManifest.windows) {
    if (window.id === "options" || window.controls.length === 0) continue;
    const control = window.controls.find((candidate) => !candidate.closeWindow && !candidate.minimizeEndpoint);
    if (!control) continue;
    const position = (await state(page)).windows[window.id].position;
    const point = canvasPoint(
      canvas,
      position[0] + control.geometry.x + control.geometry.width / 2,
      position[1] + control.geometry.y + control.geometry.height / 2,
    );
    await page.mouse.click(point.x, point.y);
    await expect.poll(async () => (await state(page)).windows[window.id].last_action).toContain(control.id);
  }
});

test("Godot exports the accepted Japanese Options assembly without a screenshot underlay", async ({ page }) => {
  mkdirSync(evidenceDir, { recursive: true });
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("width", "849");
  await expect(canvas).toHaveAttribute("height", "564");
  await expect.poll(() => state(page)).toMatchObject({
    bgm: 62,
    effect: 43,
    bgm_on: false,
    effect_on: true,
    tab: "option",
    minimized: false,
    visible: true,
    visual_authorities: 33,
    controls: 18,
    mapped_controls: 18,
  });

  const screenshot = resolve(evidenceDir, "godot-options-initial.png");
  const crop = resolve(evidenceDir, "godot-options-window.png");
  await page.screenshot({ path: screenshot });
  execFileSync("convert", [
    screenshot,
    "-crop",
    `${INITIAL_WINDOW.width}x${INITIAL_WINDOW.height}+${INITIAL_WINDOW.x}+${INITIAL_WINDOW.y}`,
    "+repage",
    crop,
  ]);
  const comparison = spawnSync(
    "compare",
    ["-metric", "MAE", sourceWindow, crop, "null:"],
    { encoding: "utf8" },
  );
  expect([0, 1]).toContain(comparison.status);
  const metric = comparison.stderr.trim();
  const normalizedMae = Number(metric.match(/\(([^)]+)\)/)?.[1]);
  const highErrorCount = Number(imageMagick("compare", [
    "-metric", "AE", "-fuzz", "10%", sourceWindow, crop, "null:",
  ]).match(/\d+(?:\.\d+)?/)?.[0]);
  const components = imageMagick("convert", [
    sourceWindow,
    crop,
    "-compose", "difference",
    "-composite",
    "-colorspace", "gray",
    "-threshold", "10%",
    "-define", "connected-components:verbose=true",
    "-connected-components", "8",
    "null:",
  ]);
  const largestComponent = components.split("\n").reduce((largest, line) => {
    if (!/gray(?:a)?\(255(?:,1)?\)/.test(line)) return largest;
    const match = line.match(/^\s*\d+:\s+\S+\s+\S+\s+(\d+)\s+/);
    return match ? Math.max(largest, Number(match[1])) : largest;
  }, 0);
  const area = INITIAL_WINDOW.width * INITIAL_WINDOW.height;
  const report = {
    sourceSha256: createHash("sha256").update(readFileSync(sourceWindow)).digest("hex"),
    runtimeSha256: createHash("sha256").update(readFileSync(crop)).digest("hex"),
    normalizedMae,
    highErrorPixelRate: highErrorCount / area,
    largestHighErrorComponentRate: largestComponent / area,
    controls: 18,
    mappedControls: 18,
  };
  writeFileSync(resolve(evidenceDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  expect(normalizedMae).toBeLessThanOrEqual(0.03668);
  expect(report.highErrorPixelRate).toBeLessThanOrEqual(0.1277);
  expect(report.largestHighErrorComponentRate).toBeLessThanOrEqual(0.06409);
  expect(report.mappedControls).toBe(report.controls);
});

test("BGM and Effect use continuous exact-endpoint controls with corrected hit mapping", async ({ page }) => {
  const bounds = await page.locator("canvas").boundingBox();
  if (!bounds) throw new Error("Godot canvas has no geometry");

  const rowY = INITIAL_WINDOW.y + 18 + 11;
  const start = canvasPoint(bounds, INITIAL_WINDOW.x + 90, rowY);
  const end = canvasPoint(bounds, INITIAL_WINDOW.x + 222, rowY);
  const samples = [];
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let index = 0; index <= 12; index += 1) {
    const x = start.x + ((end.x - start.x) * index) / 12;
    await page.mouse.move(x, end.y);
    samples.push((await state(page)).bgm);
  }
  await page.mouse.up();
  expect(new Set(samples).size).toBeGreaterThan(4);
  await expect.poll(() => state(page)).toMatchObject({ bgm: 100, effect: 43 });

  await page.keyboard.press("Home");
  await expect.poll(() => state(page)).toMatchObject({ bgm: 0, effect: 43 });
  await page.keyboard.press("End");
  await expect.poll(() => state(page)).toMatchObject({ bgm: 100, effect: 43 });

  const leftArrow = canvasPoint(bounds, INITIAL_WINDOW.x + 80, INITIAL_WINDOW.y + 18 + 9);
  const arrowClip = { x: INITIAL_WINDOW.x + 74, y: INITIAL_WINDOW.y + 20, width: 12, height: 15 };
  const idleArrow = await page.screenshot({ clip: arrowClip });
  await page.mouse.move(leftArrow.x, leftArrow.y);
  await page.mouse.down();
  const downArrow = await page.screenshot({ clip: arrowClip });
  expect(downArrow.equals(idleArrow)).toBe(false);
  await expect.poll(() => state(page)).toMatchObject({ bgm: 100, effect: 43 });
  await page.mouse.up();
  await expect.poll(() => state(page)).toMatchObject({ bgm: 99, effect: 43 });
  const settledArrow = await page.screenshot({ clip: arrowClip });
  expect(settledArrow.equals(idleArrow)).toBe(true);
  await clickCanvas(page, bounds, INITIAL_WINDOW.x + 229, INITIAL_WINDOW.y + 18 + 9);
  await expect.poll(() => state(page)).toMatchObject({ bgm: 100, effect: 43 });
  await clickCanvas(page, bounds, INITIAL_WINDOW.x + 244, INITIAL_WINDOW.y + 18 + 9);
  await expect.poll(() => state(page)).toMatchObject({ bgm_on: true, effect_on: true });

  const effectStart = canvasPoint(bounds, INITIAL_WINDOW.x + 86.5, INITIAL_WINDOW.y + 18 + 36);
  const effectEnd = canvasPoint(bounds, INITIAL_WINDOW.x + 221.5, INITIAL_WINDOW.y + 18 + 36);
  await page.mouse.move(effectEnd.x, effectEnd.y);
  await page.mouse.down();
  await page.mouse.move(effectStart.x, effectStart.y, { steps: 12 });
  await page.mouse.up();
  await expect.poll(() => state(page)).toMatchObject({ effect: 0, bgm: 100 });
});

test("tabs, custom dropdown, checkboxes, movement, and stepped minimize are reversible", async ({ page }) => {
  const bounds = await page.locator("canvas").boundingBox();
  if (!bounds) throw new Error("Godot canvas has no geometry");

  await clickCanvas(page, bounds, INITIAL_WINDOW.x + 12, INITIAL_WINDOW.y + 18 + 57);
  await expect.poll(() => state(page)).toMatchObject({ tab: "info" });
  await clickCanvas(page, bounds, INITIAL_WINDOW.x + 12, INITIAL_WINDOW.y + 18 + 18);
  await expect.poll(() => state(page)).toMatchObject({ tab: "option" });

  await clickCanvas(page, bounds, INITIAL_WINDOW.x + 160, INITIAL_WINDOW.y + 18 + 55);
  await expect.poll(() => state(page)).toMatchObject({ skin_open: true });
  await clickCanvas(page, bounds, INITIAL_WINDOW.x + 160, INITIAL_WINDOW.y + 18 + 55 + 27);
  await expect.poll(() => state(page)).toMatchObject({ skin: "ブルー", skin_open: false });

  for (const [x, key] of [[15, "opaque"], [117, "attack"], [168, "skill"], [209, "item"]]) {
    const before = (await state(page)).footer[key];
    await clickCanvas(page, bounds, INITIAL_WINDOW.x + x, INITIAL_WINDOW.y + 18 + 88);
    await expect.poll(() => state(page)).toMatchObject({ footer: { [key]: !before } });
  }

  const titleStart = canvasPoint(bounds, INITIAL_WINDOW.x + 110, INITIAL_WINDOW.y + 9);
  await page.mouse.move(titleStart.x, titleStart.y);
  await page.mouse.down();
  await page.mouse.move(titleStart.x + 40, titleStart.y + 26, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => state(page)).toMatchObject({ position: [385, 208] });

  const minimize = canvasPoint(bounds, 385 + 258, 208 + 9);
  const restore = canvasPoint(bounds, 385 + 158, 208 + 9);
  await page.mouse.click(minimize.x, minimize.y);
  await expect.poll(() => state(page)).toMatchObject({ minimized: true, window_size: [180, 18] });
  const geometries = new Set((await state(page)).minimize_samples);
  expect(geometries.size).toBeGreaterThan(4);

  await page.mouse.click(restore.x, restore.y);
  await expect.poll(() => state(page)).toMatchObject({ minimized: false, window_size: [280, 122] });

  await clickCanvas(page, bounds, 385 + 272, 208 + 9);
  await expect.poll(() => state(page)).toMatchObject({ visible: false });
});

test("every dense control owns its complete visible hit surface", async ({ page }) => {
  const bounds = await page.locator("canvas").boundingBox();
  if (!bounds) throw new Error("Godot canvas has no geometry");
  const x = INITIAL_WINDOW.x;
  const y = INITIAL_WINDOW.y;

  await clickCanvas(page, bounds, x + 86.5, y + 29);
  await expect.poll(() => state(page)).toMatchObject({ bgm: 0 });
  await clickCanvas(page, bounds, x + 221.5, y + 29);
  await expect.poll(() => state(page)).toMatchObject({ bgm: 100 });

  for (const arrowX of [74.5, 85.5]) {
    const before = (await state(page)).bgm;
    await clickCanvas(page, bounds, x + arrowX, y + 29);
    await expect.poll(() => state(page)).toMatchObject({ bgm: before - 1 });
  }
  for (const arrowX of [222.5, 235.5]) {
    const before = (await state(page)).bgm;
    await clickCanvas(page, bounds, x + arrowX, y + 29);
    await expect.poll(() => state(page)).toMatchObject({ bgm: before + 1 });
  }

  for (const toggleX of [237.5, 270.5]) {
    const before = (await state(page)).bgm_on;
    await clickCanvas(page, bounds, x + toggleX, y + 29);
    await expect.poll(() => state(page)).toMatchObject({ bgm_on: !before });
  }

  for (const [key, left, right] of [
    ["opaque", 10.5, 69.5],
    ["attack", 112.5, 161.5],
    ["skill", 162.5, 203.5],
    ["item", 204.5, 243.5],
  ]) {
    for (const edgeX of [left, right]) {
      const before = (await state(page)).footer[key];
      await clickCanvas(page, bounds, x + edgeX, y + 107);
      await expect.poll(() => state(page)).toMatchObject({ footer: { [key]: !before } });
    }
  }
});
