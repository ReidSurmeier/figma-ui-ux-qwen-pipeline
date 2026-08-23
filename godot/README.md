# Godot Japanese Options tracer

This Godot 4.7.2 project is the first production-engine tracer for the
componentized Japanese UI reconstruction. It builds only the accepted Options
window: the BGM and Effect sliders, source-state checkboxes, vertical tabs,
custom Skin menu, footer controls, window movement, minimize animation, and
close behavior.

The window is not a screenshot overlay. Its shell and Japanese bitmap labels
are separate source-derived textures, while hit regions, state, focus,
continuous values, movement, and animation are native Godot controls. The four
opaque checkbox state assets are deterministic 11x11 extractions from the
versioned accepted runtime authority. They avoid the browser-versus-Godot alpha
blend mismatch without flattening the window.

## Run in WSL

Open `project.godot` in Godot 4.7.2, or run the complete local gate:

```bash
GODOT_WEB_URL=https://windows-wsl.taile06c45.ts.net/godot-japanese-ui/ godot/qa.sh
```

`qa.sh` imports the project, executes the engine-state contract, exports the
single-threaded Compatibility-renderer web build, and runs the exported-canvas
suite when `GODOT_WEB_URL` is present. The web export is intentionally ignored
by Git and rebuilt from source.

The active tailnet review route is:

`https://windows-wsl.taile06c45.ts.net/godot-japanese-ui/`

Godot web builds require a secure context away from `localhost`; the raw
Tailscale-IP HTTP route is therefore not a valid review URL.

## Testing boundary

- `tests/engine_contract.gd` verifies source coordinates, inventory ownership,
  exact 0/100 slider geometry, state isolation, tab reversal, footer reversal,
  and generated minimize endpoints inside Godot.
- `tests/options_web.spec.mjs` drives the exported WebAssembly canvas through
  actual pointer and keyboard input. It scans boundary hit points, records
  pointer-down feedback, requires more than four continuous slider samples,
  and compares the source crop with the canonical BGM fidelity thresholds.
- `.github/workflows/godot-options-quality.yml` repeats both layers on Linux and
  uploads the web build and evidence.

GdUnit4 6.2.1 was rechecked before this tracer. Its published compatibility
matrix currently names Godot through 4.7.1, while this project and the available
runtime are 4.7.2. The dependency-free engine contract is used until GdUnit4
explicitly supports 4.7.2; the exported-canvas test remains necessary even
after adoption because Scene Runner does not replace source-relative pixels or
the actual web runtime.
