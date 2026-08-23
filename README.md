# Figma UI/UX Qwen Pipeline

A reference-preserving UI workflow built around Qwen Image 3 Pro, ComfyUI,
Figma/FigJam, and deterministic application code.

## Current machine setup

- ComfyUI `0.31.0` runs as the enabled user service `qwen-comfyui.service`.
- The local UI/API is `http://10.255.255.254:8188` on this WSL host.
- `Qwen Image 3 Render` calls the provider API without exposing keys in a
  workflow.
- `Reference Region Composite` restores the immutable reference outside an
  explicit `x,y,width,height` region.
- `comfyui-mcp` `0.50.98` is registered as the `comfyui` Codex MCP server.
- OpenRouter and Alibaba keys are injected from Bitwarden Secrets Manager by
  the service wrapper; they are not stored in this repository.

Sanitized copies of the service unit, secret-injection wrapper, and Codex MCP
registration live in [`deploy/`](deploy/README.md) so the host setup can be
recreated without copying credentials.

Check the service and API:

```bash
systemctl --user status qwen-comfyui.service
curl -fsS http://10.255.255.254:8188/system_stats
```

The MCP registration becomes available automatically in a new Codex session.
No ComfyUI API key is required while the service remains bound to the local WSL
loopback alias.

## Pipeline

1. Preserve a Reference Screen and checksum it.
2. Describe one controlled change as an Edit Brief.
3. Compile the brief into ordered instruction blocks within Qwen Image 3's
   approximate 4.5K-token image-instruction budget.
4. Run a fixed-seed Render Pass through ComfyUI.
5. Compare the batch and retain provenance for the selected output.
6. For strict preservation, composite only the approved region onto a
   lossless PNG reference.
7. Upload contact sheets and approved outputs to FigJam without replacing the
   source.
8. Rebuild labels, layout, controls, and animation as native Figma and web
   elements.

## Componentized Japanese RPG desktop

The completed desktop removes the full-screen reference underlay from all 15
visible Japanese UI windows. Figma Design owns independently editable bitmap layers;
Qwen Image 3 Pro supplies independent raster assets when native construction
cannot preserve the source appearance; the WSL-hosted application owns
continuous behavior and complete user flows; Git stores the shared manifest,
provenance, and executable test contracts.

The editable full-desktop review is [Japanese RPG Desktop v001](https://www.figma.com/design/v0bBUYUtCz88dfG2IMgho4?node-id=41-2).
It contains 192 independent raster instances and 147 linked interaction
hotspots. Each window has a separate review destination; the seven windows
with a minimize control link to dedicated Qwen-generated compact endpoints.
The WSL runtime and Figma structure share
[`artifacts/qa/runtime-component-manifest.json`](artifacts/qa/runtime-component-manifest.json)
but remain separate verification authorities.

The current additive review state is [Japanese Options Window v004 tab-map-slider-clean](https://www.figma.com/design/v0bBUYUtCz88dfG2IMgho4?node-id=27-3).
The v001 through v003 frames remain beside it as failure history. v004 retains
the title, checkbox, and generated-minimize remediations; separates the source's
overlapping tab artwork from exact non-overlapping hit regions; and replaces
the opaque slider crop/native inset with a transparent source-derived thumb
that reaches both track endpoints.
The executable prototype is in [`prototype/`](prototype/). From WSL, run
`npm --prefix prototype run dev:mac`, then open port `4175` on this machine's
Tailscale address from the Mac. Run the full local acceptance stack with:

```bash
npm --prefix prototype run test:all
npm --prefix prototype run test:figma-live
# or run both layers:
npm --prefix prototype run test:all:live
```

That command runs unit tests, a production build, source/provider/asset and
temporal-rendering contracts, 47 Playwright user flows, and a direct-
Chrome visual comparison. Temporal coverage includes pointer-down appearance,
viewport-contained dragging, pixel-font/text bounds, exact header placement,
fixed checkbox silhouettes, a zero-pixel contamination row above every footer
checkbox, the source gap before each complete `on` glyph, the thirteen-step
width/height minimize/restore transition, exact tab-boundary clicks, full slider
endpoint travel without an opaque grey donor rectangle, and proof that the
Qwen-generated minimized endpoint is not a crop.
It also checks every standard window's original six-pixel stepped rounded
corner silhouette, known donor-facing crop rows, every visible control's
settled state, all-edge drag recovery, and Figma/runtime geometry and screenshot
parity. After the full live suite passes, refresh every learned-correction
report and promote the windows with:

```bash
npm --prefix prototype run qa:promote
npm --prefix prototype test
```
The visual gate uses direct headless Chrome plus ImageMagick, independently of
the Playwright user-flow test. See the
[v004 tab and slider remediation record](docs/runs/japanese-options-window-tab-slider-remediation-v004.md),
[v003 checkbox remediation record](docs/runs/japanese-options-window-checkbox-remediation-v003.md),
[v002 remediation record](docs/runs/japanese-options-window-visual-remediation-v002.md),
[v001 historical run record](docs/runs/japanese-options-window-componentized-v001.md),
[full-desktop run record](docs/runs/japanese-rpg-desktop-componentized-v001.md), and
[design manifest](benchmarks/japanese-rpg-options-v001/design-manifest.json).

See the [componentized reconstruction implementation draft](docs/implementation/componentized-reconstruction.md),
[ADR 0008](docs/adr/0008-separate-editable-design-authority-from-executable-wsl-runtime.md),
and [ADR 0009](docs/adr/0009-use-layered-contracts-for-executable-prototype-qa.md).

The GolfStudio implementation below is retained as evidence for the older
reference-underlay architecture, not as the target architecture for new
screens.

## Tested interactive GolfStudio prototype

The current deliverable is the separate Figma Design file
[GolfStudio Complete Interactive Replica](https://www.figma.com/design/LY8R5xSUKGJJ6UEEuCpzPJ).
Open `03 Prototype`, select `V004 / Default` (`7:2`), and present the
`GolfStudio Complete Controls` flow. Its 26 reachable 474×403 states cover File
and simulated Open, Scale choices, putter and driver selection, classic
trackbar positions, Parts, About, minimized, presentation, timeline states,
and an interruptible swing sequence. The
`GolfStudio / Tested Interaction View V004` component set (`18:27`) contains
the verified raster variants.

The earlier v001 file is superseded: it matched the canvas dimensions but
redrew the entire interface, producing normalized RMSE 0.313 and changing every
pixel. v002 instead gates fidelity with a browser screenshot test that requires
zero changed pixels outside declared golf text, graph, and club-motion regions.

The working hybrid Interactive Replica is in [`web/`](web/). Run and test it with:

```bash
npm --prefix web test
npm --prefix web run serve
```

Then open `http://localhost:4173`. Every visible control family is functional:
seven application menus, all four canvas tools, zoom percentage and fit, eleven
club choices and library scrolling, the age input/spinner, timeline and
animation, four lower views and their sliders/selectors, dialogs, window
controls, keyboard shortcuts, and F11 presentation. The approved v003 Assembly
is the visible baseline. Club motion uses a deterministic clean plate and
isolated club sprite; controls are accessible DOM hit targets aligned over exact
source pixels.

Extract exact reusable source components through ComfyUI without redrawing
their small text or borders:

```bash
python3 -m qwen_ui_pipeline component-workflow \
  --reference-filename golfstudio-approved-baseline.png \
  --components examples/golfstudio-reference-components-v001.json \
  --filename-prefix golf-ui/reference-components/v001 \
  --output workflows/golfstudio-reference-components-v001.api.json
```

Compile and inspect a brief:

```bash
python3 -m qwen_ui_pipeline compile examples/golf-club-object-v002.json --json
```

Generate the ComfyUI API graph:

```bash
python3 -m qwen_ui_pipeline workflow \
  examples/golf-club-object-v002.json \
  --reference-filename plantstudio-main-window.gif \
  --filename-prefix golf-ui/club-preview/v002 \
  --output workflows/golf-club-object-v002.api.json
```

Generate a deterministic assembly graph:

```bash
python3 -m qwen_ui_pipeline assembly-workflow \
  --reference-filename plantstudio-main-window.png \
  --generated-filename golf-club-v002-2.png \
  --region 182,78,37,165 \
  --filename-prefix golf-ui/club-assembly/v003 \
  --output workflows/golf-club-assembly-v003.api.json
```

`provider: auto` tries OpenRouter first. It falls back to direct Alibaba only
for OpenRouter's pre-generation privacy/guardrail rejection, not after a
timeout or ambiguous error that could create duplicate billing.

## First golf test

- v001 proved the complete provider-to-ComfyUI path, but its forced 4:3 output
  stretched the source.
- v002 used Alibaba's explicit `948*806` source-ratio output. Variant 2 was the
  strongest donor image.
- v003 composites only the 37×165 selected region at source resolution. Its
  measured absolute error outside that region is zero pixels.
- FigJam nodes `4:146`, `4:147`, and `6:146` contain the selected v002 render,
  its contact sheet, and the exact-preservation v003 assembly respectively.

See [the run evaluation](docs/runs/golf-club-object-v001-v003.md) and
[the prompting method](docs/research/qwen-image-3-prompt-method.md). The final
Figma-to-code handoff and verification record is in
[the exact interactive prototype run](docs/runs/golfstudio-exact-interactive-v002.md).
The exhaustive control pass is recorded in
[GolfStudio tested interactions v004](docs/runs/golfstudio-interaction-v004.md).
