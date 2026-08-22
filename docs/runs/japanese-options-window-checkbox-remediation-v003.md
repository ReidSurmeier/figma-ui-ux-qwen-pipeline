# Japanese Options checkbox remediation v003

Date: 2026-08-22

Status: superseded by v004; retained as additive failure and remediation
history.

## Outcome

The WSL runtime and additive Figma v003 states correct the two defects that
remained after v002:

- the bottom checked asset no longer includes the unrelated source pixel at
  source coordinate `115,101`; every footer state has a clear row at y=101 and
  a source-locked 10x10 visible silhouette beginning at y=102; and
- the BGM and Effect `on` label is isolated from source x=248 rather than x=249,
  preserving the complete first glyph. Its clear gap column remains x=247 and
  the raster contains the expected 29 dark glyph pixels.

The Figma review nodes are:

- [default `23:2`](https://www.figma.com/design/v0bBUYUtCz88dfG2IMgho4?node-id=23-2)
- [info `23:48`](https://www.figma.com/design/v0bBUYUtCz88dfG2IMgho4?node-id=23-48)
- [Qwen minimized `23:98`](https://www.figma.com/design/v0bBUYUtCz88dfG2IMgho4?node-id=23-98)

The v001 and v002 states remain unchanged as additive failure history. The new
asset shelf nodes are `22:2` through `22:4`.

## Systemic cause

The previous asset pipeline verified transparency and approximate placement,
but not the negative space immediately outside each visible silhouette. The
checked footer crop began one pixel too high and captured a neighboring label
pixel. The `on` crop began one pixel too far right and clipped the first glyph.

The Figma audit also originally measured the checkbox node but not the nested
label raster. A generic `Text` lookup was ambiguous, and the nested auto-layout
wrapper retained one pixel of left padding. v003 scopes the lookup through each
`Label` and `Text:margin` subtree and measures the final root-relative raster
position.

## Durable verification

Two browser tests were added before the fixes:

1. toggle every footer checkbox, then require zero dark pixels in the row above
   all four boxes and the exact 10x10 visible footprint in both states;
2. require a clear x=247 gap, no early glyph pixels, and exactly 29 dark pixels
   in the complete `on` glyph at x=248 for both volume rows.

The extraction manifest, extraction script, local contracts, frozen Figma
readback, and live remote-MCP audit now encode the same coordinates and hashes.
The current stack contains 13 unit tests and 21 Playwright flows.

No new Qwen Render Pass was needed for this correction. Both repaired elements
already exist completely in the locked source; this pass isolates their exact
pixels. Qwen remains the required method when an independent state exposes
pixels that the source does not contain, as with the generated minimized
endpoint.

Run all deterministic and hosted checks with:

```bash
npm --prefix prototype run test:all:live
```

Frozen evidence is recorded in
`benchmarks/japanese-rpg-options-v001/regions/options-window/figma-v003-readback.json`.
