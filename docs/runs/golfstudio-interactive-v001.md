# GolfStudio interactive prototype v001

## Outcome

The approved exact-preservation golf-club Assembly is now an editable,
interactive specification and a working browser UI. Both share the four-phase
Swing Sequence defined by ADR 0003.

## Figma delivery

- File: [GolfStudio Interactive Prototype — v001](https://www.figma.com/design/BweTGtmOCkm1su78vJOEiO)
- `01 Reference` (`0:1`) retains the approved v003 Assembly.
- `02 Components` (`2:2`) contains reusable button, tab, and timeline-state
  components.
- `03 Prototype` (`2:3`) contains Address (`6:2`), Backswing (`10:17`), Impact
  (`10:93`), and Follow-through (`10:169`).
- `04 Interaction Spec` (`2:4`) documents the phase and control contracts.
- Flow start: `GolfStudio Swing Sequence` on Address.

The four frames are exactly 474×403, use Inter consistently, and contain no
placeholder nodes. Each frame has nine wired transport controls. Address,
Backswing, and Impact also have conditional timed reactions for Play; the final
frame stops playback.

The coded Address screen was captured back into Figma as a disposable
pixel-reference. After visual comparison with the component-built prototype,
the raw capture was removed so the deliverable remains editable and structured.

## Browser behavior

The implementation in `web/` provides:

- play, pause, previous, next, and reset in both transport locations;
- an actual range input that seeks to the nearest canonical phase;
- Swing, Club, and Data inspector tabs;
- an active-club selector;
- Space to play or pause and arrow keys to step;
- native CSS club-position and rotation transitions; and
- an immediate-transition path for reduced-motion users.

## Verification

- `npm --prefix web test`: 5 passing state-machine tests.
- `python3 -m pytest -q`: 20 passing pipeline tests.
- Browser exercise: Play reached Follow-through and stopped; Reset returned to
  Address; timeline value 61 selected Impact; Club and Data tabs revealed their
  panels; ArrowRight stepped; Space played and paused.
- Browser geometry: the app region measured exactly 474×403.
- Browser console after a clean reload: zero errors and zero warnings.
- Visual evidence: `artifacts/figma/golfstudio-state-matrix.png`,
  `artifacts/figma/golfstudio-interaction-contract.png`, and
  `artifacts/figma/golfstudio-web-capture-reference.png`.
