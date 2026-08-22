# Japanese Options tab and slider remediation v004

Date: 2026-08-22

Status: generated and fully tested; awaiting human visual and behavior
acceptance.

## Outcome

The WSL runtime and additive Figma v004 states correct the two remaining
interaction/appearance defects:

- option and info retain the source's two-pixel visual overlap, but their input
  regions no longer overlap. Option owns root y=18 through 54 and info owns
  y=55 through 94; and
- each slider now uses a transparent 15x15 source-derived delta rather than an
  opaque crop containing the grey track. Its visible center travels from root
  x=83 at value 0 to x=225 at value 100, independent of the browser's native
  range-thumb inset.

The Figma review nodes are:

- [default `27:3`](https://www.figma.com/design/v0bBUYUtCz88dfG2IMgho4?node-id=27-3)
- [info `27:49`](https://www.figma.com/design/v0bBUYUtCz88dfG2IMgho4?node-id=27-49)
- [Qwen minimized `27:99`](https://www.figma.com/design/v0bBUYUtCz88dfG2IMgho4?node-id=27-99)

The v001 through v003 states remain unchanged beside v004 as additive history.

## Systemic cause

The tab implementation used the exact source-image heights as both visual and
input geometry. Because the source crops overlap by two pixels and the later
DOM element painted above the first, info incorrectly owned shared option
pixels. Earlier tests clicked only tab centers, so they never exercised the
boundary.

The slider implementation delegated visual placement to a native range input
and used a raw 15x15 source crop for its thumb. Browsers inset a native thumb by
half its width, so the visible center could not reach the declared source
endpoints. The raw crop also carried grey track pixels which moved with the
thumb.

During the Figma fix, a live MCP audit found a second authoring defect: new
hotspots appended to auto-layout roots were reflowed below each frame. The
nodes now use absolute layout positioning and the audit checks their final
root-relative coordinates, not merely their requested values.

## Durable verification

Two Playwright tests were written red-first:

1. click the final option pixel at root y=54 and the first info pixel at y=55,
   while asserting adjacent 14x37 and 14x40 hitbox geometry; and
2. set BGM to values 0 and 100 and require the independent visual thumb center
   to equal root x=83 and x=225 respectively.

The extraction script derives the thumb as source-minus-clean-track delta. The
asset is transparent, has alpha bounds `8x9+5+2`, and is hashed in both the
local contract and Figma readback. The live remote-MCP audit also checks that
the visible tab layers have no reactions and that only the transparent hotspot
layers navigate.

No new Qwen Render Pass was needed. The complete slider thumb and its covered
track already exist in the locked source, so this correction is a deterministic
separation of known source pixels. It is not represented as Qwen output. Qwen
Image 3 Pro remains required when a requested state exposes pixels absent from
the source, such as the independently generated minimized endpoint.

The acceptance stack now contains 13 unit tests and 23 Playwright flows. Run
the deterministic runtime gates and the hosted Figma audit with:

```bash
npm --prefix prototype run test:all:live
```

Frozen evidence is recorded in
`benchmarks/japanese-rpg-options-v001/regions/options-window/figma-v004-readback.json`.
