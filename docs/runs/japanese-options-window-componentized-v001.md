# Japanese Options window componentized tracer v001

Date: 2026-08-22

Status: superseded for acceptance by the additive
[v002 visual remediation](japanese-options-window-visual-remediation-v002.md).
Retained as the historical v001 implementation and failure record.

## Scope

This tracer reconstructs only the 280x122 Japanese Options window from the
locked FigJam source. It does not place the original window screenshot beneath
the runtime. The title, tabs, labels, arrows, tracks, thumbs, checkboxes,
dropdown, and footer labels are independently movable bitmap layers. The WSL
runtime supplies behavior; Figma Design supplies the editable visual review
assembly.

The source crop is
`benchmarks/japanese-rpg-options-v001/regions/options-window/reference.png`
with SHA-256
`a89550a02883f34dcc0d993089c8bc6869fccc741680b9e98d24535ef3ae8e77`.

## Qwen decomposition

All model edits used Qwen Image 3 Pro. Direct Alibaba generated the initial
clean-plate batch, the focused BGM removal batch, and the focused title-text
batch. OpenRouter supplied the same Qwen model for the Effect, Skin, footer,
and title/tab passes after the user made that route available.

The global clean-plate prompt removed most foreground content but retained
controls, so it was rejected as a complete result. The pipeline course-
corrected to bounded removal passes. The BGM, Effect, Skin, and footer passes
provided usable local background continuation. The title/tab pass removed the
icons but retained title text and was accepted only as partial evidence; a
focused Alibaba title-text pass then removed the text. Qwen output establishes
newly exposed surfaces. Bounded source-neighbor correction restores palette
drift without being represented as model output.

OpenRouter produced fourteen candidates at a recorded total provider cost of
$0.575: Effect $0.163, Skin $0.083, footer $0.083, title/tabs $0.083, and the
selected-info-tab experiment $0.163.
Prompts, requests, responses, candidates, hashes, seeds, and provider identity
remain under `artifacts/runs/japanese-options-window-*`.

The selected-info-tab experiment was deliberately rejected: all four Qwen
candidates changed tab height, duplicated state, or distorted the exact small
lettering. The promoted inactive-option and selected-info assets instead use a
reproducible palette-role transform of the locked source crops. Their provenance
and the rejected Qwen run are recorded in
`benchmarks/japanese-rpg-options-v001/regions/options-window/tab-state-provenance.json`.
This correction is not represented as Qwen output.

The final clean plate is
`prototype/public/assets/japanese-options-v001/clean-plate.png`, SHA-256
`d8907eb229e290443c6b7c5a11498e5e40592c7c3e46d12cd962a37e31ca03b7`.
Foreground coordinates are frozen in
`benchmarks/japanese-rpg-options-v001/regions/options-window/components.json`.

## Executable WSL prototype

The React/Vite prototype is in `prototype/`. Both sliders use numeric values
from 0 through 100 at step 1; they are not four-frame animations. BGM starts at
62 and Effect at 43 to match the source resting state. Arrow buttons change by
one step. Both on checkboxes, all footer checkboxes, the Japanese Skin dropdown,
option/info tabs, minimize, close, and window dragging are operational.

From WSL:

```bash
npm --prefix prototype run dev:mac
```

Open port 4175 on the WSL machine's Tailscale address from the Mac.

## Figma Design review layer

File: [Japanese Options Window - Qwen Componentized Prototype v001](https://www.figma.com/design/v0bBUYUtCz88dfG2IMgho4?node-id=4-2)

- imported executable reference: `2:2`
- editable assembly: `4:2`
- independent BGM track/thumb: `4:46`, `4:47`
- independent Effect track/thumb: `4:48`, `4:49`
- Skin dropdown: `4:28`
- option/info tabs: `4:39`, `4:43`
- editable info state: `7:2`
- info-state option/info tabs: `7:37`, `7:41`
- inferred Japanese info message: `7:51`
- editable minimized state: `11:3`
- minimized restore control: `11:7`

The default info tab navigates to `7:2`; the info-state option tab navigates
back to `4:2`. Both reactions were read back from Figma as `ON_CLICK` smart-
animate navigation. Focused exports of the two frames have distinct hashes, so
the selected state can no longer silently collapse to the default state.

Both full-window minimize controls navigate to `11:3` with a 208 ms smart-
animate review transition; its minimize control returns with `BACK`. The
minimized Figma readback is pixel-identical to the final WSL minimized frame.
Figma and WSL now use `DotGothic16 Regular` for inferred Japanese text. The
source-authored Japanese title and labels remain their unchanged bitmap assets.

The editable assembly contains no nodes named `Range Slider`; those flattened
capture layers were removed and replaced by separate track and thumb image
nodes. Figma cannot be the authority for continuous numeric slider behavior,
so its layer structure and focused export are checked separately from the WSL
interaction flow.

## Verification evidence

Run:

```bash
npm --prefix prototype run test:all
```

Current results:

- 13/13 Vitest tests pass.
- production TypeScript/Vite build passes.
- the contract gate passes source hash, provider, no-underlay, slider-step,
  state-asset hash/geometry/alpha, and rejected-candidate provenance checks.
- 17/17 Chrome interaction and temporal-rendering flows pass.
- a real slider drag emits more than four distinct numeric values.
- state persists across tab changes and minimize/restore.
- the Skin menu is an app-owned accessible combobox/listbox with pointer,
  arrow-key, and Escape coverage; its bottom item remains reachable outside the
  122px window.
- the selected info tab retains its bitmap and produces distinct pixel output.
- the complete flow reports zero browser console errors.
- arrow, window, tab, and Skin controls have visibly distinct pointer-down
  frames before their actions fire.
- dragging is clamped at all four viewport edges, so the complete 280x122
  window remains reachable.
- inferred Japanese text uses bundled `DotGothic16`; dropdown and info glyph bounds are
  checked against their pixel-layout regions and the Skin arrow exclusion zone.
- minimize and restore animate through thirteen stepped heights over 208 ms;
  the body stays mounted while clipping and is removed only after collapse.
- the title remains at `x=16, y=4, 54x11` during drag and mid-minimize.
- direct-Chrome visual gate passes with normalized MAE 0.0261421 against the
  locked reference and a maximum of 0.030000.
- the exact-copy title subregion has zero changed pixels.
- focused Figma export has normalized MAE 0.0260713 and NCC 0.834616.
- Figma-to-runtime visual MAE is 0.000173578.
- Figma structure audit found zero flattened range layers and all required
  named nodes.
- Figma contains linked editable default, info, and minimized states. Tab,
  minimize, and restore reactions plus the DotGothic16 message layer were read
  back successfully.

## Independently discovered regressions

The expanded suite found the following before human hints were supplied:

1. BGM/Skin/footer state reset after option to info to option navigation.
2. The same state reset after minimize and restore.
3. The selected info tab lost its bitmap and supplied no visible state change.
4. The Skin selector delegated its menu to a native select, preventing reliable
   theme ownership and listbox geometry checks.
5. The page emitted a favicon 404 in the console.
6. Figma had no separate editable info state or tab navigation destination.
7. Pointer-down frames were visually identical to idle frames.
8. Unconstrained dragging allowed the window to move to negative coordinates
   and become mostly cut off.
9. Minimize removed the body and jumped from 122 px to 18 px in the first
   sampled frame.
10. Inferred Japanese text did not declare an available pixel-font authority,
    and no test bounded glyphs against their control regions.
11. Header placement was covered only by the whole-window similarity score,
    which could hide local title drift.
12. Loading the shared pixel font changed the inline combobox baseline and
    shifted the complete Skin control from source `y=65` to `y=67`; the visual
    gate rejected it and an exact geometry regression now prevents recurrence.

Each issue now has a durable regression assertion in the unit, browser, visual,
contract, or Figma-readback layer.

The visual scores are similarity evidence, not a pixel-identity claim. Human
acceptance remains required before this tracer becomes the style authority for
the other three benchmark screens.
