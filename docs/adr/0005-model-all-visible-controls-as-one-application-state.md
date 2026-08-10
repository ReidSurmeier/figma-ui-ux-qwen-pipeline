# Model all visible controls as one Application State

Status: accepted on 2026-08-10.

## Context

The exact v002 Interactive Replica made the Swing Sequence functional but left
most of the Reference Screen as inert pixels. Menus, tool buttons, zoom,
library scrolling, age controls, lower tabs, parameter controls, and window
buttons therefore looked actionable without changing application state.

Adding isolated click handlers directly to the screenshot would make the
browser and Figma prototype disagree and would make cross-control behavior
impossible to test.

## Decision

Use two coordinated deterministic state modules:

1. Swing State owns Address, Backswing, Impact, Follow-through, playback, and
   graph seeking.
2. Application State owns open menu, selected tool, zoom, pan offset, club,
   library scroll, age, selected lower panel, panel parameters, selected parts,
   region visibility, reduced motion, dialogs, and window mode.

The approved 474×403 Assembly remains the default visual baseline. Transient
menus and dialogs are native browser overlays in the source Windows style.
Zoom and pan replace only the main canvas rectangle. Rotation, Parameters, and
Parts replace only the declared lower-panel rectangle. Default-state Fidelity
Checks remain unchanged.

Figma represents canonical observable states as exact raster variants with
transparent reusable interaction hotspots. Continuous browser inputs such as
range sliders remain real HTML controls; Figma represents their named states
and navigation rather than pretending to reproduce continuous runtime input.

## Control contract

| Surface | Observable behavior |
| --- | --- |
| File, Edit, Club, Layout, Options, Window, Help | Open and switch menus; menu commands mutate state or perform the named browser operation. |
| Select, Pan, Rotate, Zoom | Change canvas interaction mode; pan drags, rotate changes face angle, zoom changes magnification. |
| Zoom percentage, Scale to Fit | Set a bounded magnification or restore the fit view. |
| Club rows and scrollbar | Select among eleven clubs and scroll the seven-row viewport. |
| Age field and spinner | Set or step a bounded 1–120 day value. |
| Swing timeline and Animate | Seek or play the canonical Swing Sequence. |
| Swing, Rotation, Parameters, Parts | Switch lower views; every alternate view owns working inputs. |
| Minimize, maximize, close, presentation | Enter recoverable window states; close uses a confirmation dialog. |

## Consequences

- A visible control without an Application State transition is now a failed
  acceptance condition.
- Browser behavior can be expanded without redrawing the Reference Screen.
- Figma remains a canonical-state specification; the browser remains the
  authoritative continuous interaction runtime.
