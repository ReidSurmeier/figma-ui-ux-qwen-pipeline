# Japanese Options window visual remediation v002

Date: 2026-08-22

Status: superseded after human review by v003. The title and minimized-state
work remains valid; the footer checkbox crop and `on` label spacing did not
meet acceptance.

## Outcome

The WSL runtime and the additive Figma v002 states correct the four reported
failure classes:

- BGM and Effect checkboxes keep fixed source anchors and use transparent
  state assets with no BGM stray pixel.
- the Japanese title is a transparent glyph layer over a repaired clean plate,
  so there is no opaque white/blue rectangle around it;
- minimize animates both width and height through thirteen steps and resolves
  to a separately rendered 180x18 Qwen endpoint instead of clipping the top of
  the 280x122 source state; and
- Figma v002 uses exact root-relative title, checkbox, and window-control
  geometry with live reaction-destination readback.

The historical v001 Figma frames remain unchanged. Current review nodes are:

- [default `16:48`](https://www.figma.com/design/v0bBUYUtCz88dfG2IMgho4?node-id=16-48)
- [info `16:94`](https://www.figma.com/design/v0bBUYUtCz88dfG2IMgho4?node-id=16-94)
- [Qwen minimized `16:144`](https://www.figma.com/design/v0bBUYUtCz88dfG2IMgho4?node-id=16-144)

The independent corrected asset shelf is nodes `14:2` through `14:8`.

## Why v001 testing missed the defects

The previous checks were dominated by whole-window similarity, asset
existence, reaction counts, and final resting states. Those checks could pass
while a small high-contrast defect remained. Specifically:

1. Checkbox state assets were screenshot crops. Alpha and visible-silhouette
   invariants were not tested, so the checked crop could contain an unrelated
   pixel and a different internal anchor.
2. The title test compared only the 54x11 interior. It did not include a
   one-pixel boundary ring, so an opaque rectangular seam could hide behind a
   locally similar interior.
3. Minimize asserted only height and final clipping. Width was static and the
   endpoint was the original header crop; no test required a new visual state.
4. Figma checks proved nodes and reactions existed but did not assert exact
   root-relative checkbox positions. The first v002 live readback exposed an
   inherited BGM y=25 and Effect y=50; they were then corrected to y=24 and
   y=43.

## Qwen endpoint

The minimized state uses the actual `qwen/qwen-image-3-pro` model through
Alibaba. Prompt ID:
`6340905d-4b06-46c1-b843-95cb7927a50a`.

OpenRouter was attempted with the same Qwen model, but the valid route returned
HTTP 402 for insufficient credits. No OpenAI image model or SVG/Python image
generator was substituted. The selected Qwen donor, rejected attempts, hashes,
and promotion decision are in
`benchmarks/japanese-rpg-options-v001/regions/options-window/minimized-state-provenance.json`.

## Durable verification

Run the deterministic WSL stack:

```bash
npm --prefix prototype run test:all
```

Run the hosted Figma drift audit:

```bash
npm --prefix prototype run test:figma-live
```

Or run both:

```bash
npm --prefix prototype run test:all:live
```

The local stack contains 13 unit tests, 19 browser flows, a production build,
source/provider/asset contracts, and a direct-Chrome visual gate. The live
Figma audit checks node IDs, image hashes, exact anchors, DotGothic16 authority,
the hidden minimized body, and all tab/minimize/restore destinations.

Current readback evidence is frozen in
`benchmarks/japanese-rpg-options-v001/regions/options-window/figma-v002-readback.json`.
Measured results include:

- runtime MAE to locked reference: `0.0222747` (gate `<= 0.030000`);
- runtime title-boundary MAE: `0.0129426` (gate `<= 0.015000`);
- Figma default MAE to locked reference: `0.0235342`;
- Figma/runtime minimized MAE: `0.00000685871` at 180x18; and
- generated minimized state differs from the equivalent reference crop by
  2,876 pixels in Figma and 3,240 pixels in the promoted runtime asset.

These are test results, not human acceptance. The state remains
`awaiting-human-acceptance` until visual and interaction review is complete.
