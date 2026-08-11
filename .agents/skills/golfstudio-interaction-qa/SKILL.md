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
4. Reproduce the reported failure with a real click, drag, key, or file-chooser event before editing.
5. Add a failing automated test at the narrowest useful seam. Prefer a headless-browser interaction over reducer-only coverage.
6. Implement one behavior at a time. Preserve the approved 474×403 fidelity contract outside declared mutable regions.
7. Test Figma twice:
   - structurally inspect variants, destinations, triggers, and flow starting points;
   - operate the published flow in Preview or Present mode using the same gestures in the matrix.
8. Report each row as `PASS`, `FAIL`, `SIMULATED`, or `UNAVAILABLE`, with the exact evidence artifact or assertion.

## Figma implementation notes

- `upload_assets` may complete a batch out of order. Do not infer file identity from sequential node IDs; screenshot each promoted component and match its rendered pixels to the source before wiring instances.
- The hosted reaction API rejected `ON_DRAG` navigation in the v004 build. Use clickable low/reference/high zones in the raster-authoritative Figma prototype and keep continuous drag authoritative in the browser test. Do not claim Figma continuous dragging passed.
- Keep active prototype actions at `transition: null`. Archive superseded frames away from the current flow instead of leaving their Smart Animate reactions reachable.

## Hard gates

- A screenshot is not interaction evidence.
- State-machine coverage is not pointer or keyboard evidence.
- A Figma reaction count is not Present-mode evidence.
- A transparent hotspot may augment the approved raster but must match the visible control bounds.
- Sliders must respond to drag and keyboard input and update their value label immediately.
- Menus and combo boxes must open visibly, support Escape, and commit a selection.
- Animation must visibly advance, remain interruptible, allow other controls, stop on request, and be replayable.
- Classic state changes use instant or discrete feedback. Do not use Smart Animate or long CSS interpolation for menu, slider, tab, or club-selection state.

## Evidence order

Prefer evidence in this order:

1. deterministic browser end-to-end assertion;
2. Figma Present-mode click/drag observation;
3. Figma structural audit of variants/reactions;
4. focused screenshot comparison;
5. unit state test.

If a required surface cannot be exercised, record `UNAVAILABLE` and do not convert it to a pass.
