# Godot Japanese desktop v001

Date: 2026-08-23

## Outcome

The Godot 4.7.2 web prototype now reconstructs the complete 849x564 Japanese
Reference Screen over its original `#ff00fe` pink desktop. Fifteen
screenshot-derived windows and one inferred Map destination are assembled from
the source-locked runtime manifest rather than a full-screen screenshot
underlay.

The scene exposes:

- 16 independently movable windows;
- 275 independent visual authorities, including Qwen clean plates and isolated
  source-derived labels, icons, rows, buttons, and thumbs;
- 151 mapped interaction surfaces; and
- the accepted 33-authority, 18-control Options implementation unchanged as
  the canonical BGM/Effect quality floor.

The current browser evidence is retained in
`artifacts/qa/godot-options-v001/full-desktop-report.json`. The full composition
passes at normalized MAE `0.0239729` and high-error pixel rate
`0.0756918862`. The isolated Options window retains source-owned MAE
`0.0194981`, below the accepted BGM/Effect ceiling of `0.03668`.

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

The Web gate now emits `isolated-window-fidelity-report.json`. It compares each
of the 15 screenshot-derived windows to the accepted Options/BGM normalized-MAE
ceiling of `0.03668`. The comparison uses the canonical source-ownership mask:
raw source rectangles are invalid authorities when they contain donor-magenta
or pixels owned by an overlapping neighbor. All 15 windows currently pass and
`revisionRequired` is empty; the worst result is Skills at `0.025988`.

The final repair does not accept a complete screenshot crop as a movable
window. `build-qwen-structural-clean-plates.mjs` derives blank structural chrome
from the repository's actual Qwen Image 3 Pro runs, and
`build-qwen-owned-window-assets.mjs` restores only canonical source-owned pixels
through each component's declared alpha footprint. The deterministic ownership
pass is recorded separately from generation. This removed baked Japanese copy,
duplicate rows, donor-magenta borders, and neighboring-window pixels without
pretending that deterministic assembly was Qwen output.

That repair also exposed stale engine asset copies: the offline assembly passed
while the exported runtime remained unchanged. `scripts/sync_godot_window_assets.sh`
now synchronizes and byte-checks all 273 PNG authorities plus the runtime
manifest before every engine test/export. A detected Qwen fix therefore cannot
be stranded in the prototype asset tree while Godot silently packages an older
copy.

The final Godot Web suite passes 25 tests. It includes all 16 isolated runtime
journeys, the 15-window fidelity matrix, full assembly, move and z-order
gestures, minimize/restore, scroll, tabs, dropdowns, reversible checkboxes,
continuous slider endpoints, and hidden Map close/reopen. The learned
correction replay separately passes 15/15 source windows and 139/139 contracted
source controls with zero uncontracted controls. A fresh hosted Figma parity
audit was not part of this run, so this is an executable Godot verification and
not a new claim about hosted Figma state.

## Provenance boundary

The pink desktop is native Godot color, not a crop. Qwen Image 3 Pro structural
plates and source-owned component assets are synchronized into the engine
project with the runtime manifest hash preserved. The structural inputs are
the recorded `japanese-status-clean-plate-v001` and
`japanese-status-derived-stats-v004` Qwen runs. Their deterministic ownership
finishing, source-mask inputs, and affected windows are recorded in
`artifacts/runs/japanese-godot-qwen-owned-plates-v001/selection.json`; no
generated output is represented as deterministic code or SVG.
