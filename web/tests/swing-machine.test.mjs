import assert from "node:assert/strict";
import test from "node:test";

import {
  SWING_PHASES,
  createSwingState,
  reduceSwing,
  selectPhaseForProgress,
} from "../src/swing-machine.mjs";

test("the Swing Sequence preserves the approved four-phase contract", () => {
  assert.deepEqual(
    SWING_PHASES.map(({ id, progress, angle, x, y }) => ({ id, progress, angle, x, y })),
    [
      { id: "address", progress: 0, angle: 0, x: 0, y: 0 },
      { id: "backswing", progress: 32, angle: -24, x: -7, y: -4 },
      { id: "impact", progress: 58, angle: 6, x: 2, y: 0 },
      { id: "follow-through", progress: 100, angle: 32, x: 12, y: -8 },
    ],
  );
});

test("play and ticks advance the sequence and stop after follow-through", () => {
  let state = reduceSwing(createSwingState(), { type: "PLAY" });
  assert.equal(state.playing, true);

  state = reduceSwing(state, { type: "TICK" });
  assert.equal(state.phase, "backswing");
  state = reduceSwing(state, { type: "TICK" });
  assert.equal(state.phase, "impact");
  state = reduceSwing(state, { type: "TICK" });
  assert.deepEqual(state, { phase: "follow-through", playing: false });
});

test("play from follow-through restarts at address before advancing", () => {
  const state = reduceSwing(
    { phase: "follow-through", playing: false },
    { type: "PLAY" },
  );
  assert.deepEqual(state, { phase: "address", playing: true });
});

test("pause, step, reset, and seek are deterministic", () => {
  assert.deepEqual(
    reduceSwing({ phase: "backswing", playing: true }, { type: "PAUSE" }),
    { phase: "backswing", playing: false },
  );
  assert.equal(
    reduceSwing({ phase: "address", playing: false }, { type: "PREVIOUS" }).phase,
    "address",
  );
  assert.equal(
    reduceSwing({ phase: "address", playing: false }, { type: "NEXT" }).phase,
    "backswing",
  );
  assert.deepEqual(
    reduceSwing({ phase: "impact", playing: true }, { type: "RESET" }),
    { phase: "address", playing: false },
  );
  assert.equal(
    reduceSwing(createSwingState(), { type: "SEEK", progress: 61 }).phase,
    "impact",
  );
});

test("timeline selection resolves to the nearest canonical stop", () => {
  assert.equal(selectPhaseForProgress(-50).id, "address");
  assert.equal(selectPhaseForProgress(17).id, "backswing");
  assert.equal(selectPhaseForProgress(48).id, "impact");
  assert.equal(selectPhaseForProgress(90).id, "follow-through");
  assert.equal(selectPhaseForProgress(500).id, "follow-through");
});
