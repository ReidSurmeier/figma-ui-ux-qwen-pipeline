# Japanese RPG desktop componentized v001

## Result

All 15 visible windows in the 849 by 564 Japanese source screenshot are
reconstructed without the pink desktop underlay. Every window is independently
movable in the WSL application, every declared control has a tested settled
effect, and the hosted Figma Design file provides the editable review and
prototype-link layer.

- WSL review: `http://100.103.164.128:4175/` while the repository dev server is running.
- Figma review: <https://www.figma.com/design/v0bBUYUtCz88dfG2IMgho4?node-id=41-2>
- Figma desktop root: `41:2`
- Runtime settled reference: `41:3`
- Figma inventory: 15 windows, 196 runtime-manifest raster instances, 146 linked hotspots, 31 canonical state links, and 7 Qwen compact endpoints.

## Reconstruction authority

Qwen Image 3 Pro supplies the clean plates and newly exposed compact surfaces.
Exact source crops supply small Japanese labels, icons, and source-specific
chrome where a generative rewrite would change identity. Deterministic assembly
enforces geometry, transparency, and edge invariants; it is recorded as
assembly and is not represented as Qwen output.

The Party clean-plate v003 candidate passed the generic empty-plate evaluator
but failed the Party-specific selected-row residue gate. It remains a rejected
candidate. The accepted Party runtime uses a Qwen-derived generic plate plus
independent exact-source components.

## Corrections promoted into the system

- Replacing the complete three-pixel perimeter had flattened the original
  window chrome. Standard windows now preserve the source six-pixel stepped
  corner silhouette, with explicit transparent corner steps and occupied
  border pixels.
- A masked source similarity score hid thin donor seams. Known donor-facing
  rows on Skills, Equipment, Chat, and compact-info assets now have explicit
  zero-alpha contracts.
- Source-baked selected rows could remain visible underneath a newly selected
  state. Skills, Party, and Inventory now clear the baked state before
  promoting another option, and the browser asserts exactly one selection.
- Figma destinations must be committed before reactions are created. The build
  generator now emits separate review-destination and hotspot-link stages.
- The Figma build is derived from the captured runtime component manifest and
  can resynchronize changed asset hashes without recreating geometry.
- Card and Skills no longer contain frozen scrollbar rectangles. Their
  source-derived tracks and thumbs are independent assets, and the visible
  thumbs traverse their exact endpoints across more than four sampled states.
- Compact Info HP and SP are source-faithful readouts, not invisible sliders.
  The verification inventory now distinguishes depicted controls from static
  information rather than adding interaction that the screenshot does not
  support.
- Minimized Status and Inventory states directly load their dedicated generated
  compact plates and unmount the full control trees until restore. This avoids
  cropped full-window art and hidden active hit targets.
- The v002 correction replay was invalid because it could be written from
  synthesized pass data. The canned writer is removed. V003 executes every
  applicable correction against every window and requires fresh browser traces,
  source contracts, boundary-pixel checks, and the live Figma marker before a
  window may be marked `verified`.
- Figma slider, checkbox, privacy, page, and tab hotspots now target editable
  canonical state frames instead of a single unchanged review clone. Options
  additionally has a live outer-boundary donor-magenta gate.

## Historical verification (invalidated)

This earlier final-run claim predates the false-verification diagnosis and must
not be used for promotion:

- 22 unit tests;
- production TypeScript/Vite build;
- Options, Basic Info, Status, Inventory, and remaining-window asset contracts;
- 50 browser interaction and geometry tests;
- Options visual MAE `0.0231548` with focused title/alpha checks;
- full desktop source-relative masked MAE `0.0405295`, plus 11 focused window gates;
- live Figma audits for Options, Basic Info, Status, and the complete desktop;
- complete Figma/runtime screenshot MAE `0.00639723`;
- a correction replay that claimed all 17 learned prompts for all 15 windows.

The replacement audit sequence is:

```bash
npm --prefix prototype run test:all:live
CORRECTION_MATRIX_RUN_ROOT=/tmp/japanese-rpg-correction-audit npm --prefix prototype run qa:replay
npm --prefix prototype test
```

Only omit `CORRECTION_MATRIX_RUN_ROOT` for an intentional canonical replay after
the isolated run completes and its failures have been reviewed.
