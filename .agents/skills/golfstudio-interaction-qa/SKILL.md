---
name: golfstudio-interaction-qa
description: Audit GolfStudio browser and Figma interactions with executable evidence. Use when controls are added or changed, when a menu, dropdown, slider, club selector, timeline, animation, or prototype hotspot is reported broken, or before claiming the GolfStudio UI is interactive or complete.
---

# GolfStudio interaction QA

Do not infer usability from reducer tests, screenshots, or reaction counts. Exercise the same gesture a user performs and require observable feedback.

## Required workflow

1. Read [acceptance-matrix.md](references/acceptance-matrix.md). Run P0 rows before P1.
2. When changing timing or control visuals, read [classic-win32-behavior.md](references/classic-win32-behavior.md).
3. Separate the two surfaces:
   - Browser: authoritative for native file selection, downloads, continuous sliders, keyboard input, and non-blocking animation.
   - Figma Present mode: authoritative for the demonstrated prototype path. Mark OS file selection as simulated; never claim it is native.
4. Use the installed Playwright MCP to reproduce the reported failure with a real click, drag, key, or file-chooser event before editing. Do not build a raw CDP driver while Playwright is available.
5. Add one failing `@playwright/test` test at the narrowest user-visible seam. Retain a trace, screenshot, and video for failures.
6. Implement one behavior at a time. Preserve the approved 474×403 fidelity contract outside declared mutable regions.
7. Replay the exact gesture through Playwright MCP after the focused test turns green, then rerun the complete browser suite. Do not begin the next fix until both pass.
8. Test Figma twice:
   - structurally inspect variants, destinations, triggers, and flow starting points;
   - operate the published flow in Preview, Present, or an Embed API harness using the same gestures in the matrix.
9. Report each row as `PASS`, `FAIL`, `SIMULATED`, or `UNAVAILABLE`, with the exact evidence artifact or assertion.

## Mandatory error loop

For every failure, run this loop without batching unrelated fixes:

1. `RED`: reproduce the failed user gesture in Playwright MCP and in one durable Playwright test.
2. `FIX`: make the smallest behavior change that addresses that failure.
3. `GREEN`: rerun only the focused test until it passes.
4. `REPLAY`: perform the same gesture again in the live MCP browser and inspect the observable result.
5. `REGRESS`: run the full Playwright and unit suites.
6. Continue to the next control only after all five steps succeed.

Use Figma's REST `interactions` data to inventory prototype edges. When an Embed API client ID and allowed origin are available, use `INITIAL_LOAD`, `MOUSE_PRESS_OR_RELEASE`, `PRESENTED_NODE_CHANGED`, and `NEW_STATE` events as the prototype oracle. Treat `LOGIN_SCREEN_SHOWN` as an authentication failure, never as interaction evidence.

## Figma implementation notes

- `upload_assets` may complete a batch out of order. Do not infer file identity from sequential node IDs; screenshot each promoted component and match its rendered pixels to the source before wiring instances.
- The hosted reaction API rejected `ON_DRAG` navigation in the v004 build. Use clickable low/reference/high zones in the raster-authoritative Figma prototype and keep continuous drag authoritative in the browser test. Do not claim Figma continuous dragging passed.
- Keep active prototype actions at `transition: null`. Archive superseded frames away from the current flow instead of leaving their Smart Animate reactions reachable.

## Hard gates

- A screenshot is not interaction evidence.
- State-machine coverage is not pointer or keyboard evidence.
- A Figma reaction count is not Present-mode evidence.
- A Playwright process exit without discovered tests or assertions is not a pass.
- Every visible interactive browser element must appear in the executable control inventory and have at least one pointer, keyboard, drag, file, or selection gesture assertion.
- A transparent hotspot may augment the approved raster but must match the visible control bounds.
- Sliders must respond to drag and keyboard input and update their value label immediately.
- Menus and combo boxes must open visibly, support Escape, and commit a selection.
- Animation must visibly advance, remain interruptible, allow other controls, stop on request, and be replayable.
- Classic state changes use instant or discrete feedback. Do not use Smart Animate or long CSS interpolation for menu, slider, tab, or club-selection state.

## Evidence order

Prefer evidence in this order:

1. deterministic Playwright end-to-end assertion with trace-on-failure;
2. live Playwright MCP replay of the same gesture;
3. Figma Present/Embed click observation with emitted node/state event;
4. Figma structural audit of variants/reactions;
5. focused screenshot comparison;
6. unit state test.

If a required surface cannot be exercised, record `UNAVAILABLE` and do not convert it to a pass.
