# Godot Japanese desktop v001

Date: 2026-08-23

## Outcome

The Godot 4.7.2 web prototype now reconstructs the complete 849x564 Japanese
Reference Screen over its original `#ff00fe` pink desktop. All 15 visible
windows are assembled from the existing source-locked runtime manifest rather
than a full-screen screenshot underlay.

The scene exposes:

- 15 independently movable windows;
- 263 independent visual authorities, including Qwen clean plates and isolated
  source-derived labels, icons, rows, buttons, and thumbs;
- 150 mapped interaction surfaces; and
- the accepted 33-authority, 18-control Options implementation unchanged as
  the canonical BGM/Effect quality floor.

The browser evidence is retained in
`artifacts/qa/godot-options-v001/full-desktop-report.json`. The initial full
composition passed the bounded integration gate at normalized MAE `0.0513851`
and high-error pixel rate `0.1571247776`. Options independently retained MAE
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
to a screenshot comparison. The current local run passes both engine contracts
and all seven exported-canvas journeys.

## Generation and compact-state corrections

A later Stagehand replay found two defects that the initial browser journey did
not cover. First, the runtime manifest dropped all eight Basic Info navigation
rasters because their stable component IDs lived on child spans while their
background images lived on the owning buttons. Capture now resolves that public
control owner, and engine plus Web-export tests lock the exact eight IDs. The
desktop inventory increased from 255 to 263 visual authorities.

Second, generic minimized windows loaded their Qwen-generated compact plates
but hid every independent title component, producing a blank blue bar. Godot
now retains the window-specific title icon, Japanese title, minimize/close
artwork, and generated plate; right-anchored controls travel with every one of
the 13 geometry steps and return to exact expanded coordinates. The engine
contract checks Basic Info, Status, Inventory, and Equipment, while Stagehand
drives the public Basic Info gesture and retains the 180 by 18 settled frame.

The Web gate now emits `per-window-fidelity-report.json`. It compares every
source-relative window crop to the accepted Options/BGM normalized-MAE floor
of `0.03668`, then repeats the comparison against an offline clean-plate plus
component assembly. Basic Info, Status, Inventory, Game Menu, Compact Info, and
Party fail before Godot and are routed to `qwen-asset-pass`; this prevents an
asset-generation defect from being misreported as a Web or engine-rendering
bug.

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
