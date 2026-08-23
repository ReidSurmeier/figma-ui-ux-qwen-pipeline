# Componentized reconstruction implementation draft

Status: draft on 2026-08-22. ADR 0008 and ADR 0009 are accepted; two benchmark
sources are registered, while the complete corpus, numeric quality thresholds,
and Godot export details remain open.

## Outcome

Given a Reference Screen, produce:

1. a source manifest describing every visible element, state, and relationship;
2. independently editable native Figma objects and Qwen-generated raster assets;
3. a Figma Design Componentized Reconstruction with no visible full-screen
   screenshot underlay;
4. a WSL-hosted Executable Prototype with continuous controls and complete user
   flows;
5. reproducible evidence for structure, fidelity, interaction, and runtime
   quality; and
6. a versioned handoff that can later be implemented in Godot without deriving
   behavior from screenshots.

The goal is not to turn every pixel into SVG. The goal is to preserve visual
identity while making each meaningful element independently selectable,
movable, replaceable, and stateful.

## Authority map

| Concern | Authority | Required evidence |
| --- | --- | --- |
| Original appearance and layout | Reference Screen | immutable file, checksum, dimensions, source ID |
| Element identity and bounds | source manifest in Git | stable IDs, hierarchy, bounds, z-order, confidence |
| Generated appearance | Qwen Image 3 Pro Render Pass | prompt, inputs, provider/model, seed, output checksum |
| Editable structure | Figma Design | node IDs, component/variant audit, variables, screenshot |
| Runtime behavior | WSL-hosted application | versioned state contract, runnable preview, flow results |
| Regression truth | tests and evidence in Git | deterministic verdicts, traces, diffs, logs |
| Production behavior | Godot project, later | imported assets, state/input mapping, engine tests |

No surface may silently substitute for another. In particular, Figma Design
structure is not application runtime behavior, and a screenshot is not proof of
a user journey.

## Accepted WSL/Mac execution topology

Status: accepted on 2026-08-22. Figma Make is not part of the required pipeline.

Treat WSL as the runtime and repository authority and the Mac as an authoring
and review client:

| Surface | Responsibility |
| --- | --- |
| WSL | Canonical Git checkout, Qwen/ComfyUI, generated assets, manifests, application runtime, Storybook/Vitest/Playwright, Chrome diagnostics, and retained evidence |
| Mac | Figma Design review, annotations, and a browser pointed at the WSL preview |
| Hosted Figma | Design component authority and remote MCP access |
| GitHub | Canonical remote, review history, and WSL code custody |

The Figma remote MCP remains connected from WSL. It reads and writes native
hosted Figma Design structure without requiring the Figma desktop app on WSL.
The same stable component and state IDs connect `design-manifest.json` to the
application runtime manifest.

Figma Make is unavailable and excluded from the required pipeline. The WSL web
application is the only Executable Prototype, so there is no duplicate Make
runtime to synchronize or separately test. Figma Design provides editable
components, visual comparison, variables, variants, and review evidence; WSL
provides actual behavior and executable verdicts.

The existing `web` preview binds to the WSL-only `10.255.255.254` loopback alias.
A later implementation slice must add a distinct Mac-review command that binds
only to the WSL Tailscale address or another authenticated private route. Keep
the existing loopback-bound Playwright server unchanged so remote review and
deterministic automation do not accidentally share network assumptions.

Avoid two-way filesystem mounts, editing the same working tree from both hosts,
and accepting a Figma screenshot or reaction graph as proof that the WSL build
passes.

## Registered test projects

The user-designated [Qwen Image Pro FigJam board](https://www.figma.com/board/v6Rah44MTgZcEE4oSJro1v/Quen-Image-Pro)
currently contains two top-level benchmark sources:

| Order | Screen ID | Node | Export | Role |
| --- | --- | --- | --- | --- |
| 1 | `japanese-rpg-options-v001` | [`1:2`](https://www.figma.com/board/v6Rah44MTgZcEE4oSJro1v/Quen-Image-Pro?node-id=1-2) | 849×564 | First tracer candidate: dense component hierarchy and continuous Options-dialog controls |
| 2 | `korean-gallery-v001` | [`1:6`](https://www.figma.com/board/v6Rah44MTgZcEE4oSJro1v/Quen-Image-Pro?node-id=1-6) | 672×484 | Second tracer: chrome/content separation, repeated gallery cells, category controls, and scrolling |

The Japanese screen is the recommended first tracer. Its Options dialog exposes
two horizontal audio sliders, separate on/off controls, and a skin selector
inside an overlapping movable window. This lets the first slice test element
separation, z-order, Exact Copy, and continuous behavior without first solving
the entire screen.

The accepted first component boundary is one coherent BGM Slider component.
Its label, track, thumb, decrement and increment buttons, and on/off control are
individually editable nested layers. Moving or reusing the Slider component
preserves their alignment, relationships, and shared behavior; editability does
not require scattering those parts as unrelated top-level objects.

The Korean screen is deliberately not treated as merely an easier second image.
It introduces a different boundary problem: photographs inside gallery cells
are content assets, while the cell geometry, chrome, buttons, scrollbar, and
decorative background belong to the interface system.

The accepted fidelity policy is region-specific. Exact Copy and element
geometry are locked. Approved independent raster assets receive strict checks
inside their own bounds. Native editable text and geometry receive only the
declared antialiasing or rendering tolerance required by the target runtime.
The completed screen is not required to be globally pixel-identical, and a
full-screen Reference Screen underlay is forbidden as a way to improve its
score.

Editability is representation-independent. A layer may be a transparent PNG,
a native Figma text/vector node, or a generated raster state as long as it has
its own stable bounds, provenance, name, replacement path, and independent
move/hide/reassemble behavior. SVG is not a requirement. Do not vectorize a
source-specific pixel element merely to call it editable.

The first tracer now implements the following failure-directed gates:

| Risk | Durable oracle |
| --- | --- |
| checkbox crop shifts or carries an unrelated pixel | transparent asset check plus exact visible silhouette and root-relative anchor before/after toggle |
| footer checkbox crop includes a neighboring label pixel | require an empty one-pixel row immediately above every checkbox in every state, and a `10x10+0+0` visible footprint inside the 11x11 asset slot |
| `on` text touches the checkbox or loses part of its first glyph | require an empty source gap column at x=247, the source-locked x=248 raster anchor, and the complete 29-dark-pixel glyph footprint |
| Japanese title looks boxed or misplaced | exact `16,4,54,11` geometry plus a one-pixel perimeter MAE gate |
| button has no press feedback or acts on pointer-down | idle/down/up/settled browser checkpoints |
| minimize is a crop or four-frame jump | separate Qwen endpoint provenance plus more than four sampled widths and heights |
| hosted Figma silently drifts from Git/runtime | recorded export hashes plus a live remote-MCP node/hash/geometry/reaction audit |
| a static readout is mistaken for an interactive control | classify visible affordances from source evidence before adding input semantics; assert the absence of invented controls |
| a scrollbar is frozen into a larger crop | split source track and thumb, then sample the visible thumb at both endpoints and at least five intermediate positions |
| a verification report repeats expected answers without executing the UI | generate reports only from retained browser traces and live Figma evidence; remove canned pass writers |

Asset isolation must use the smallest source-confirmed silhouette, not the
first convenient rectangular crop. Transparency alone is insufficient: a
transparent asset can still contain one unrelated opaque pixel. Each promoted
small asset therefore records both its alpha bounds and one or more explicit
clearance regions around the intended silhouette.

Run the deterministic WSL suite with `npm --prefix prototype run test:all`.
Run the hosted verification layer with
`npm --prefix prototype run test:figma-live`; `test:all:live` executes both.

The two registered sources are an internal study, and the user has confirmed
rights to both images. The interaction goal is to operate the interface already
depicted: move window panels, click buttons, drag sliders continuously, scroll,
and change selections. When a screenshot does not reveal the exact response,
the runtime may implement a Theme-Consistent Inference using the original
interface conventions. It must remain labeled `needs_review`; uncertainty does
not authorize a modern redesign or unrelated functionality.

Focused Figma MCP exports and hashes are frozen under `benchmarks/` and recorded
in [`docs/research/source-register.md`](../research/source-register.md). A later
export mismatch must be reported as source drift rather than automatically
updating the reference or its hash.

## Proposed artifact layout

```text
benchmarks/
  <screen-id>/
    reference.png
    screen.json
    elements/
    states/
briefs/
  <screen-id>/
    reconstruction.json
assets/
  <screen-id>/
    qwen/<asset-id>/<render-pass-id>/
figma/
  <screen-id>/
    design-manifest.json
    runtime-manifest.json
prototype/
  src/
  stories/
  tests/
evidence/
  <screen-id>/<run-id>/
```

Generated variants are additive. A new pass does not replace its source or a
previous candidate. Acceptance is recorded in the manifest.

The new runtime belongs in `prototype/`. The existing `web/` package is retained
as historical GolfStudio evidence and is not expanded into the componentized
reconstruction runtime.

The accepted runtime foundation is React, Vite, and TypeScript. Storybook owns
isolated visual/state examples, Vitest owns component and manifest behavior,
and Playwright owns a thin set of complete user journeys. Exact package versions
will be pinned when the first RED test is scaffolded.

## Source manifest contract

Each screen should define at least:

- immutable source checksum, dimensions, color profile, and scale;
- exact Japanese and other visible copy, with OCR confidence and manual lock;
- element ID, semantic role, parent, bounds, z-order, visibility, and clipping;
- representation choice: native text, native geometry, independent raster, or
  composed element;
- editable properties and the reason each property must remain editable;
- component states, variants, and transition names;
- routes, overlays, focus order, keyboard commands, and scroll regions;
- control semantics such as `min`, `max`, `step`, default value, units, and
  validation rules;
- provenance for every generated or cropped source; and
- confidence plus `needs_review` for ambiguous segmentation or occlusion.

The manifest distinguishes element detection from visual reconstruction.
Detection may propose a rectangle and role; it does not prove that the object
has been isolated with a clean background or recreated faithfully.

## Pipeline stages and gates

### 0. Freeze the benchmark

Begin with `japanese-rpg-options-v001` before expanding to the second registered
screen or any later overnight corpus. Record its original Figma/FigJam node,
exported file, checksum, dimensions, licensing/custody, and any intentionally
cropped region.

Gate: two agents or two independent reads resolve to the same source bytes and
screen ID. Related worktrees and visually similar board nodes are not accepted
as source identity.

### 1. Inventory elements and behaviors

Combine machine proposals with a focused visual audit. Enumerate panels, bars,
text, icons, buttons, menus, sliders, scrollbars, diagrams, decoration, and
background regions. Record occlusion, repeated components, and relationships.

Build a behavior inventory at the same time. A visible control without a state
contract is incomplete even if its static crop is perfect.

Gate: every visible region is assigned to an element, intentional background,
or `needs_review`; every interactive element has a named behavior.

### 2. Choose representation per element

Prefer native Figma text for Exact Copy and native geometry for simple shapes
when they preserve appearance. Use a Qwen Asset Pass for source-specific
textures, icons, illustrations, or controls that native construction cannot
match. Allow a composed element when native text must sit over a generated
surface.

Cropping is evidence and may provide a temporary reference asset. It is not a
complete extraction if the crop includes neighboring pixels, an occluded
background, or baked text that must be editable.

Gate: moving, hiding, and replacing the element does not reveal unrelated
screen pixels inside it.

### 3. Generate and refine independent assets

Use Qwen Image 3 Pro through the established ComfyUI/provider pipeline. Compile
one Asset Pass per bounded visual problem and retain prompt, inputs, seed,
provider response, and checksums. Additional passes may remove baked copy,
recover an occluded edge, create a clean plate, or generate a state variant.

Do not fall back to another image generator or describe deterministic SVG/Python
output as a Qwen result. Deterministic masking and compositing may enforce
declared invariants, but their provenance remains distinct.

Gate: an approved asset passes alpha/background inspection, target-size
readback, Exact Copy rules, and comparison to its source region.

### 4. Build the Figma Design authority

Use native frames, components, component properties, variants, variables, Auto
Layout where source behavior permits it, shared text/paint/effect styles, and
explicit clipping. Preserve source-specific fixed geometry where Auto Layout
would change the reference.

Use the Figma MCP to inspect metadata, variables, screenshots, and structure;
write named native components and variables; and read back the exact nodes that
were changed. Store the node mapping in `design-manifest.json`.

Gate: with the Reference Screen hidden, the reconstruction remains complete;
all required elements are independently selectable and a scripted structure
audit resolves every manifest ID to the expected node and variant.

### 5. Build the WSL Executable Prototype

Implement the same stable IDs and state model in the WSL web application. Use
actual runtime state for drag, scroll, focus, conditional menus, animation,
routes, and error states. Link the live private WSL review URL and retained
evidence from the Figma Design review page while keeping Figma structure and
application runtime visibly labeled as separate authorities.

A slider is continuous engineering behavior. Its thumb position is derived
from its current numeric value and track geometry. Four generated images may
represent four visual checkpoints, but they cannot define the drag model.
For a source-specific bitmap track, distinguish the semantic input from its
visible thumb: retain the native range for pointer, keyboard, and accessibility
semantics, hide its browser-dependent thumb, and position a transparent
source-derived visual thumb from explicit center endpoints. The first tracer's
centers are x=83 at value 0 and x=225 at value 100.

Likewise, source artwork may overlap without giving two controls overlapping
input ownership. Preserve tab pixels in visual pseudo-layers or Figma image
layers, but give option and info adjacent transparent hit regions. For this
tracer the option region is `[5,18,14,37]`, the info region is
`[5,55,14,40]`, and y=55 belongs only to info.

Gate: every declared state is reachable through an intended user action, every
critical flow has a reset path, and the runtime emits inspectable state changes.

For Figma, a hotspot count alone is not evidence of behavior. Each canonical
control must resolve to the intended editable state frame, and the audit must
compare the actual reaction destination ID. Continuous motion remains owned by
the executable WSL prototype; Figma carries exact endpoint and discrete-state
review frames rather than pretending a small set of frames is a continuous
slider implementation.

### 6. Run layered QA

Run the layers in dependency order:

1. schema, provenance, stable-ID, and source-coverage validation;
2. Storybook and Vitest component/state contracts;
3. deterministic screenshot, OCR, geometry, and region-difference checks;
4. a thin Playwright suite covering critical complete user journeys;
5. Chrome DevTools console, network, layout, animation, and performance review;
6. an AI exploratory pass for unexpected paths and visual anomalies; and
7. separate Figma Design structure and WSL runtime audits.

An AI finding becomes a gate only after it has a reproducible fixture and
assertion. `UNAVAILABLE`, `NEEDS_REVIEW`, `FAIL`, and `PASS` are distinct
verdicts.

### 7. Prepare the Godot contract

Before mass generation, define coordinate origin, scaling/DPI, target
resolution, color space, texture filtering, nine-slice regions, font custody,
animation/state names, focus/input mapping, and accepted asset formats. The
first milestone need not build the Godot UI, but it must prove the manifest can
represent what Godot will require.

Gate: one reconstructed component can be exported and instantiated in a small
Godot spike without renaming states or manually guessing its geometry.

## What must be resolved before the first test

### Benchmark and scope

- [x] Identify the exact first Reference Screen candidate and authoritative
      board node: `japanese-rpg-options-v001`, FigJam `1:2`.
- [x] Define the one control and one complete user journey in the tracer slice.
- [x] Record the second user-designated test source: `korean-gallery-v001`,
      FigJam `1:6`.
- [ ] Identify any additional sources required for the complete overnight
      corpus; do not include them in the first RED-GREEN loop.
- [x] Lock source bytes, dimensions, and checksums in `benchmarks/`.
- [ ] Lock crop policy and manually verify Exact Copy transcription.

### Editability and fidelity

- [ ] Define the minimum element granularity; for example, whether a labeled
      button is one component with editable text or two independently movable
      elements.
- [ ] Define treatment of occluded pixels, shadows, antialiasing, and clean
      plates.
- [x] Use region-specific Fidelity Checks instead of global pixel identity.
- [ ] Establish numeric thresholds for bounds, pixels, OCR, color, native text,
      and independent raster assets.
- [ ] Add a destructive editability check: hide, move, recolor, replace, and
      reassemble representative elements with no screenshot underlay.

### Behavior and smoothness

- [x] Define slider `min`, `max`, `step`, default, orientation, keyboard
      increments, pointer capture, snapping, labels, and reset behavior.
- [ ] Decide whether motion is duration-based, spring-based, or frame-based and
      specify interruption/reversal behavior.
- [ ] Define menus, overlays, focus, scroll, routing, loading, empty, disabled,
      and failure states.
- [ ] Set measurable responsiveness and frame-time budgets on target hardware.

### Figma and runtime ownership

- [x] Record the authoritative hosted Figma file, desktop root, reference frame,
      and review URL in the run document and generated design manifest.
- [x] Exclude Figma Make because neither required access mode is available.
- [x] Keep the WSL repository and application as the sole executable authority.
- [x] Derive the Figma raster inventory and stable IDs from the committed runtime
      manifest; require a separate live Figma structure/reaction audit before
      promotion.
- [x] Add a private Tailscale Mac-review URL while retaining the WSL Playwright
      server as the executable test authority.

### Test environment

- [ ] Pin browser versions, viewport, device scale factor, fonts, locale,
      timezone, reduced-motion behavior, and network fixtures.
- [ ] Verify Storybook, Vitest, Playwright, Chrome DevTools access, screenshot
      fonts, and trace retention in a clean install.
- [ ] Define critical journeys before automating them.
- [ ] Define which evidence is retained for pass, failure, and flaky results.
- [ ] Run accessibility semantics and keyboard navigation checks even when the
      source interface predates modern accessibility conventions.

### Overnight-loop safety

- [ ] Set provider/model lock, per-screen generation budget, retry limit, and
      total run budget.
- [ ] Preserve every input and candidate additively; never mutate a Reference
      Screen or overwrite the last accepted asset.
- [ ] Stop on repeated identical failure, uncertain source identity, provider
      drift, authentication failure, or unresolved `needs_review` elements.
- [ ] Require the loop to explain which measured contract changed before it
      launches another Render Pass.
- [ ] Produce a morning report with selected candidates, rejected candidates,
      failure classes, test evidence, costs, and unresolved human decisions.

### Nontechnical acceptance gates

- [x] Classify both Reference Screens as an internal study with user-confirmed
      rights to both images.
- [ ] Decide whether Japanese and Korean Exact Copy must remain verbatim,
      receive translation, or support both source and localized modes.
- [x] Prioritize interaction with the depicted interface: movable panels,
      buttons, continuous sliders, scrolling, and selection controls.
- [x] Use Theme-Consistent Inference for behavior a screenshot cannot reveal;
      prohibit modernization and mark inferred behavior `needs_review`.
- [ ] Define whose approval accepts visual drift, generated substitutions, and
      `needs_review` elements.
- [ ] Define the overnight loop's human-review boundary: which decisions it may
      make autonomously and which must stop for approval.
- [ ] Define the audience and target presentation conditions, including whether
      the prototype is an internal study, portfolio demonstration, or direct
      production-game precursor.

## First TDD tracer slice

Recommended slice: the BGM slider in the Options dialog of
`japanese-rpg-options-v001`.

The approved first-test boundary is the Japanese Options window only. Preserve
the source Japanese verbatim and exclude translations, Korean assets, and the
rest of the RPG screen. The prototype must support window dragging, visible tab
activation, both continuous sliders and their arrow buttons, BGM/Effect
checkboxes, the Skin dropdown, and every visible bottom-row checkbox/button.

For this tracer, use Qwen-assisted Layer Decomposition rather than a visible
reference overlay. First crop and checksum the exact Options window. Then run
bounded Qwen Image 3 Pro removal passes to construct a Clean Plate: the original
window shell and empty control surfaces with the declared foreground elements
removed. Derive independent foreground raster layers by comparing bounded
source crops with their corresponding Clean Plate regions. This preserves the
original pixels of the Japanese title and small bitmap text without making the
full screenshot the background.

Separate the title text, vertical tabs, BGM and Effect labels, tracks, thumbs,
arrow buttons, on/off checkboxes and labels, Skin selector, bottom divider,
bottom-row labels, and bottom-row checkboxes into named assets/components. The
resting assembly must target pixel identity with the frozen Options-window crop.
Moving or activating a component may change only the regions declared by its
Behavior Contract.

A final full-window Qwen render may be retained as a comparison candidate, but
it cannot replace or flatten the component assembly. Refinement passes operate
on individual assets or the Clean Plate, then the independent layers are
reassembled and re-tested.

Public interface:

- one valid `screen.json` containing the screen, slider, track, thumb, label,
  and state contract;
- one reconstructed Figma Design Slider component with stable mappings for its
  editable nested layers;
- one WSL runtime slider accepting pointer and keyboard input and exposing its
  current numeric value.

First failing behavior test:

> Dragging from 20% to 80% of the usable track updates the value continuously at
> the declared step, keeps the thumb aligned with the pointer, updates the label,
> and does not swap among four pre-rendered full-screen states.

The vertical loop is:

1. RED: manifest validation or the isolated slider behavior fails.
2. GREEN: implement only enough manifest, component, asset, and runtime behavior
   for that assertion to pass.
3. REFACTOR: remove accidental coupling while retaining visual and interaction
   evidence.
4. Add Design structure, screenshot/geometry, then one end-to-end drag test.
5. Only after the slice passes, generalize to the rest of that screen and then
   admit the other three benchmark screens.

## Remaining decision questions

Ask and resolve these one at a time during implementation:

1. Must Japanese and Korean Exact Copy remain verbatim, be translated, or
   support both modes?
2. Which Godot control and asset conventions must be proven by the first export
   spike?
