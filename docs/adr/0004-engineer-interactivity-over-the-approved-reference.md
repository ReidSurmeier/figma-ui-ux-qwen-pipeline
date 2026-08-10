# Engineer interactivity over the approved Reference Screen

Status: accepted on 2026-08-10. Supersedes the visual-reconstruction approach
used by GolfStudio prototype v001.

## Context

The first Interactive Replica used the correct 474×403 dimensions but rebuilt
the interface as a generic late-1990s application. Compared with the approved
v003 Assembly, normalized RMSE was 0.313 and all 191,022 pixels differed. The
implementation preserved a genre, not the Reference Screen.

Generating each title bar, icon, button, label, and graph again would repeat the
same failure, especially at the required 10 px detail scale.

## Decision

Use a hybrid reference-preserving architecture:

1. Keep the approved v003 Assembly as the immutable Address baseline.
2. Declare every permitted text, graph, and club-motion rectangle in
   `web/fidelity-contract.json`.
3. Use ComfyUI lossless crops for source-specific reusable components. Do not
   ask Qwen to redraw reference chrome or small text.
4. Use Qwen only for Asset Passes in regions that genuinely require generated
   golf imagery.
5. Build club motion from a clean plate and isolated club sprite while keeping
   accessible DOM controls as transparent hit targets over the original pixels.
6. Require a real 474×403 browser screenshot to have zero changed pixels outside
   the declared mutable regions.
7. In Figma, use exact raster state components plus reusable interaction
   hotspots. Do not substitute a modern design-system component for a
   source-specific Windows control.

## Consequences

- The resting Address state retains the accepted generated Assembly exactly.
- Golf text remains editable in the browser, but the unavailable historical
  Windows font is not silently replaced inside Figma prototype states; the
  validated raster is authoritative there.
- Motion can temporarily affect the declared object area without licensing a
  redraw of the rest of the screen.
- A future fully native reconstruction is allowed only if it passes the same
  screenshot Fidelity Check.
