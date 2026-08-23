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
- Figma inventory: 15 windows, 192 independent raster instances, 147 linked hotspots, 15 review destinations, and 7 Qwen compact endpoints.

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

## Verification

The final run passed:

- 18 unit tests;
- production TypeScript/Vite build;
- Options, Basic Info, Status, Inventory, and remaining-window asset contracts;
- 47 browser interaction and geometry tests;
- Options visual MAE `0.0231548` with focused title/alpha checks;
- full desktop source-relative masked MAE `0.0403683`, plus 11 focused window gates;
- live Figma audits for Options, Basic Info, Status, and the complete desktop;
- complete Figma/runtime screenshot MAE `0.00639739`;
- correction replay of all 17 learned prompts for all 15 windows.

Run the same promotion sequence with:

```bash
npm --prefix prototype run test:all:live
npm --prefix prototype run qa:promote
npm --prefix prototype test
```
