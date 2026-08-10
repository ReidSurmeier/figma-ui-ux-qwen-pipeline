# GolfStudio Exact Interactive Replica v002

## Outcome

v002 corrects the visual-regression failure in v001. The engineered view uses
the approved v003 Assembly as its 474×403 baseline, changes only declared golf
text, graph, and club-motion regions, and preserves every pixel outside those
regions in the browser Fidelity Check.

## Corrected Figma file

- File: [GolfStudio Exact Interactive Replica — v002](https://www.figma.com/design/TWPIEIOVyLjDEnlzWLcnIw)
- `01 Source & Capture` (`0:1`) contains the four retained exact-state sources.
- `02 Exact Components` (`6:2`) contains the `GolfStudio / Exact Swing State`
  component set (`6:9`) and reusable interaction hotspot (`6:10`).
- `03 Exact Prototype` (`6:3`) contains Address (`7:2`), Backswing (`7:4`),
  Impact (`7:6`), and Follow-through (`7:8`).
- `04 Fidelity Contract` (`6:4`) explains which regions may change.
- Flow: `GolfStudio Exact Swing Sequence`, starting on Address.

Each prototype frame is exactly 474×403, contains one exact-state component
instance, nine wired interaction targets, no placeholder nodes, and no live text
that could silently substitute the original Windows typeface. The timeline is
represented by four canonical click regions; the browser retains the real range
input.

## ComfyUI reference components

ComfyUI prompt `5805051e-9e85-46e2-bd4b-7d78f74ea7ec` extracted the title bar,
menu bar, toolbar controls, library, graph, Animate button, and bottom tabs from
the approved Assembly using `ImageCrop` nodes. No image-model redraw occurred.
Exact-crop checks report zero absolute-error pixels.

## Browser behavior

- The Address baseline is byte-identical to the approved v003 Assembly.
- Play advances Address → Backswing → Impact → Follow-through and stops.
- Previous, Next, Reset, timeline seek, Space, and arrow keys are deterministic.
- The original buttons remain visible; transparent accessible controls align to
  their exact rectangles and display a pressed inset while active.
- The club animates over a deterministic clean plate and respects reduced motion.

## Verification

- `npm --prefix web test`: 5 passing state-machine tests.
- `python3 -m pytest -q`: 26 passing pipeline, ComfyUI, browser, and fidelity tests.
- Browser Fidelity Check: zero changed pixels outside declared mutable regions.
- ComfyUI component crop check: zero changed pixels for tested exact crops.
- Figma audit: four 474×403 frames, 36 wired interactions, two conditional
  timed frames, no placeholders, and one exact-state component per frame.
- Visual evidence: `artifacts/figma/golfstudio-exact-v002-figma-state-matrix.png`
  and `artifacts/figma/golfstudio-exact-v002-figma-fidelity-contract.png`.
