# Godot Japanese desktop prototype

This Godot 4.7.2 project is the executable production-engine prototype for the
complete 849x564 Japanese UI Reference Screen. It restores the source pink
desktop and assembles all 15 visible windows from the existing component
manifest. Every window is independently movable, and all 150 declared control
surfaces are owned by the Godot scene.

The Reference Screen is not a runtime underlay. The pink desktop is a native
`ColorRect`; Qwen-derived clean plates and source-derived labels, icons, rows,
buttons, and thumbs remain separate textures. Hit regions, state, focus,
continuous values, movement, and animation are native Godot controls. The
accepted Options implementation remains the canonical quality floor and keeps
its exact slider endpoints, custom Skin menu, stateful checkboxes, vertical
tabs, stepped minimize animation, and close behavior.

## Run in WSL

Open `project.godot` in Godot 4.7.2, or run the complete local gate:

```bash
GODOT_WEB_URL=https://windows-wsl.taile06c45.ts.net/godot-japanese-ui/ godot/qa.sh
```

`qa.sh` imports the project, executes the complete-desktop and Options engine
contracts, exports the single-threaded Compatibility-renderer web build, and
runs the exported-canvas suite when `GODOT_WEB_URL` is present. The web export
is intentionally ignored by Git and rebuilt from source.

Run the real-scene correction replay separately:

```bash
STAGEHAND_HOST=100.103.164.128 godot/run-stagehand-qa.sh
```

The host override is required on this WSL machine because loopback Stagehand
traffic stalls here. The runner pins Stagehand v0.4.0 by SHA-256, launches the
actual Godot scene under a Mesa-backed virtual display, drives exact source
controls, waits for settled state instead of accepting click dispatch alone,
and retains JSON, JUnit, RPC trace, engine log, and screenshots.

The active tailnet review route is:

`https://windows-wsl.taile06c45.ts.net/godot-japanese-ui/`

Godot web builds require a secure context away from `localhost`; the raw
Tailscale-IP HTTP route is therefore not a valid review URL.

## Testing boundary

- `tests/full_desktop_contract.gd` locks the pink authority, 15-window
  inventory, 263 visual authorities, 150 control surfaces, and movement
  ownership.
- `tests/engine_contract.gd` verifies Options source coordinates, inventory ownership,
  exact 0/100 slider geometry, state isolation, tab reversal, footer reversal,
  and generated minimize endpoints inside Godot.
- `tests/options_web.spec.mjs` drives the exported WebAssembly canvas through
  actual pointer and keyboard input. It drags every visible window, activates a
  representative mapped surface in every interactive sibling, catches
  cross-window overflow, scans dense Options hit boundaries, records
  pointer-down feedback, requires more than four continuous slider samples,
  and compares both the full desktop and Options crop with source authorities.
- `tests/stagehand/basic-info-runtime.json` launches the real scene, activates
  Status from Basic Info, minimizes to the generated endpoint, restores through
  the public compact surface, and captures both endpoint frames.
- `.github/workflows/godot-options-quality.yml` repeats both layers on Linux and
  uploads the web build, browser evidence, and Stagehand evidence.

GdUnit4 6.2.1 was rechecked before this tracer. Its published compatibility
matrix currently names Godot through 4.7.1, while this project and the available
runtime are 4.7.2. The dependency-free engine contract is used until GdUnit4
explicitly supports 4.7.2; the exported-canvas test remains necessary even
after adoption because Scene Runner does not replace source-relative pixels or
the actual web runtime.
