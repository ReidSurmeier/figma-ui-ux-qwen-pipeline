import assert from "node:assert/strict";
import test from "node:test";

import { createUIState, reduceUI } from "../src/ui-machine.mjs";

test("menu headings open, switch, and close deterministically", () => {
  let state = createUIState();

  state = reduceUI(state, { type: "TOGGLE_MENU", menu: "file" });
  assert.equal(state.openMenu, "file");

  state = reduceUI(state, { type: "TOGGLE_MENU", menu: "edit" });
  assert.equal(state.openMenu, "edit");

  state = reduceUI(state, { type: "TOGGLE_MENU", menu: "edit" });
  assert.equal(state.openMenu, null);
});

test("toolbar tools and zoom controls update the canvas view", () => {
  let state = createUIState();

  state = reduceUI(state, { type: "SET_TOOL", tool: "pan" });
  assert.equal(state.tool, "pan");

  state = reduceUI(state, { type: "SET_ZOOM", zoom: 256 });
  assert.equal(state.zoom, 256);

  state = reduceUI(state, { type: "SET_ZOOM", zoom: 999 });
  assert.equal(state.zoom, 256);

  state = reduceUI(state, { type: "SCALE_TO_FIT" });
  assert.equal(state.zoom, 100);
});

test("club selection, library scrolling, age, and panning stay bounded", () => {
  let state = createUIState();

  state = reduceUI(state, { type: "SELECT_CLUB", club: "driver" });
  assert.equal(state.club, "driver");

  state = reduceUI(state, { type: "SCROLL_LIBRARY", start: 4 });
  assert.equal(state.libraryStart, 4);

  state = reduceUI(state, { type: "SET_AGE", age: 200 });
  assert.equal(state.age, 120);
  state = reduceUI(state, { type: "STEP_AGE", delta: -1 });
  assert.equal(state.age, 119);

  state = reduceUI(state, { type: "PAN_VIEW", x: 500, y: -500 });
  assert.deepEqual(state.viewOffset, { x: 80, y: -60 });
});

test("each lower panel owns working slider and selector state", () => {
  let state = createUIState();

  state = reduceUI(state, { type: "SET_PANEL", panel: "rotation" });
  state = reduceUI(state, { type: "SET_PARAMETER", name: "rotation", value: 38 });
  assert.equal(state.panel, "rotation");
  assert.equal(state.parameters.rotation, 38);

  state = reduceUI(state, { type: "SET_PANEL", panel: "parameters" });
  state = reduceUI(state, { type: "SET_PARAMETER", name: "loft", value: 42 });
  state = reduceUI(state, { type: "SET_PARAMETER", name: "tempo", value: 90 });
  assert.deepEqual(
    { loft: state.parameters.loft, tempo: state.parameters.tempo },
    { loft: 42, tempo: 90 },
  );

  state = reduceUI(state, { type: "SET_PANEL", panel: "parts" });
  state = reduceUI(state, { type: "SET_PART", name: "shaft", value: "stiff" });
  assert.equal(state.parts.shaft, "stiff");
});

test("layout, motion, dialogs, and window controls expose recoverable states", () => {
  let state = createUIState();

  state = reduceUI(state, { type: "TOGGLE_REGION", region: "library" });
  assert.equal(state.visibleRegions.library, false);
  state = reduceUI(state, { type: "TOGGLE_REDUCED_MOTION" });
  assert.equal(state.reducedMotion, true);

  state = reduceUI(state, { type: "OPEN_DIALOG", dialog: "about" });
  assert.equal(state.dialog, "about");
  state = reduceUI(state, { type: "CLOSE_DIALOG" });
  assert.equal(state.dialog, null);

  state = reduceUI(state, { type: "SET_WINDOW_MODE", mode: "minimized" });
  assert.equal(state.windowMode, "minimized");
  state = reduceUI(state, { type: "SET_WINDOW_MODE", mode: "normal" });
  assert.equal(state.windowMode, "normal");
});
