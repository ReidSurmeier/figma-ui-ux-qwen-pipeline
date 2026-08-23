# Godot Japanese Options v001

Date: 2026-08-23

## Outcome

The accepted Japanese Options window now runs as a real Godot 4.7.2 web export
at 849x564. The live assembly contains 33 independent visual authorities and 18
mapped interaction surfaces. It does not use the full screenshot as a runtime
layer and it contains no magenta screenshot background.

The exact source-relative report is
`artifacts/qa/godot-options-v001/report.json`. The final run passed:

- normalized MAE: `0.0337518` at a maximum of `0.03668`;
- high-error pixel rate: `0.1251463700` at a maximum of `0.1277`;
- largest high-error component rate: `0.0640807963` at a maximum of
  `0.06409`;
- engine contract: all assertions passed;
- exported browser contract: 4 of 4 journeys passed; and
- control-to-visual mapping: 18 of 18.

## Failures caught by the new loop

The test-first port detected and corrected failures that a static screenshot
would not have found:

1. Raw Tailscale HTTP was not a secure context, so Godot refused to boot. The
   review build now uses an additive Tailscale Serve HTTPS path.
2. The exported canvas defaulted to 300x150. Adaptive web canvas sizing now
   produces the declared 849x564 surface.
3. The Effect drag began on the adjacent right arrow. The test now uses and
   scans the exact non-overlapping slider interval.
4. The open Skin list initially lost its click to a footer surface. The menu is
   promoted above the dense controls before selection.
5. Godot alpha blending put the componentized assembly just outside the BGM
   quality floor. A rounded desaturated edge underlay and four tiny opaque
   checkbox state crops corrected the engine-specific blend without restoring
   the pink screenshot background or flattening the window.
6. The final interior slider pixel mapped to 99. The value function now divides
   by the usable `width - 1` interval, and both engine and browser tests lock the
   exact 100 endpoint.
7. Footer hit regions were initially generalized to 50 pixels and caused a
   Skill/Item overlap. They now use the source widths 60, 50, 43, and 40, with
   both left and right edges replayed in the browser.

## Remaining scope

This is deliberately the first Options-window quality gate, not a claim that
the remaining Japanese desktop windows have been ported to Godot. The next
vertical slice should reuse the same scene inventory, endpoint, full-surface
mapping, reversible-journey, and source-relative pixel gates before a sibling
window is admitted.
