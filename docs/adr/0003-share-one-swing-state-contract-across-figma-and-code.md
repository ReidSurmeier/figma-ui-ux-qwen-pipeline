# Share one swing-state contract across Figma and code

Status: accepted on 2026-08-10.

## Context

The approved golf-club Assembly is a static composition. The next deliverable
must explain how the interface changes when controls are used, provide a
clickable Figma prototype, and produce an Interactive Replica whose controls
and club animation are real rather than baked into another raster image.

Generating a complete screenshot for every interaction would reintroduce text
drift and make the controls impossible to reuse. Designing the Figma prototype
and application as unrelated animations would create two conflicting behavior
specifications.

## Decision

Use one four-phase Swing Sequence in both Figma and application code:

1. `address` at 0%, 0 degrees, x=0, y=0;
2. `backswing` at 32%, -24 degrees, x=-7, y=-4;
3. `impact` at 58%, 6 degrees, x=2, y=0;
4. `follow-through` at 100%, 32 degrees, x=12, y=-8.

The x/y values are offsets from the approved 37×165 club object region, not
absolute coordinates in a replacement layout.

Play moves through the ordered phases. Pause stops at the current phase. Step
backward, step forward, reset, and timeline seek are deterministic transitions.
Each phase updates the club pose, status copy, selected phase indicator, and
measurement values together.

The Figma prototype uses named matching layers and Smart Animate between phase
frames. The Interactive Replica uses the same phase values in a tested state
module. Reduced-motion users receive immediate phase changes rather than the
timed sequence.

## Consequences

- Qwen Image remains the source for approved visual assets, while interaction
  state, Exact Copy, and motion stay editable and deterministic.
- Figma is an inspectable behavior specification, not the production runtime.
- The web timeline is a real range input. Figma represents its four canonical
  stops because Figma prototypes cannot provide the same continuous runtime
  semantics as a browser range control.
- A change to phase order, angles, timing, or copy must update the contract,
  the Figma prototype, and the state-machine tests together.
