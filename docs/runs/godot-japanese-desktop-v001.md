# Godot Japanese desktop v001

Date: 2026-08-23

## Outcome

The Godot 4.7.2 web prototype now reconstructs the complete 849x564 Japanese
Reference Screen over its original `#ff00fe` pink desktop. All 15 visible
windows are assembled from the existing source-locked runtime manifest rather
than a full-screen screenshot underlay.

The scene exposes:

- 15 independently movable windows;
- 255 independent visual authorities, including Qwen clean plates and isolated
  source-derived labels, icons, rows, buttons, and thumbs;
- 150 mapped interaction surfaces; and
- the accepted 33-authority, 18-control Options implementation unchanged as
  the canonical BGM/Effect quality floor.

The browser evidence is retained in
`artifacts/qa/godot-options-v001/full-desktop-report.json`. The initial full
composition passed the bounded integration gate at normalized MAE `0.0531846`
and high-error pixel rate `0.1620283354`. Options independently retained MAE
`0.033354`, high-error pixel rate `0.1248243560`, and largest high-error
component rate `0.0640807963`.

## Failure found by gesture replay

The first all-window pointer replay failed on `Return to last save point` even
though the Game Menu control existed and its rectangle was correct. The Skills
window had rendered its second-page component textures below its 184px body,
covering the Game Menu and stealing its hit surface. Regular windows now clip
owned visual and hit layers to their declared geometry; Party alone retains
overflow because its three external buttons are explicitly owned satellites.

This is why the desktop gate contains real drag and click journeys in addition
to a screenshot comparison. The final local run passed both engine contracts
and all six exported-canvas journeys.

The correction replay also passed all 15 windows with zero uncontracted
controls. The stricter cross-window BGM fidelity promotion remains honest:
Options is still the only `benchmark-pass` window and the 14 siblings remain
`revision-required` in `prototype/qa/window-verification.json`. The complete
Godot desktop is therefore an executable integration ready for review, not a
claim that every sibling has already earned final visual acceptance.

## Provenance boundary

The pink desktop is native Godot color, not a crop. Existing Qwen Image 3 Pro
clean plates and component assets were copied into the engine project with the
runtime manifest hash preserved. No new image-model Render Pass was necessary
for this integration; no generated output is represented as deterministic
code or SVG.
