# Professional game UI testing stack

Researched on 2026-08-23 from primary project and engine documentation.

## Recommendation

Use three runners with different authority instead of expecting one agent or
one screenshot tool to prove everything.

| Layer | Selected tool | What it proves | What it cannot prove |
| --- | --- | --- | --- |
| WSL executable prototype | Playwright plus the BGM fidelity gate | Real pointer, keyboard, drag and scroll paths; stable captures; exact source-relative and hit-surface checks | Godot scene-tree behavior or packaged-build behavior |
| Godot scene integration | GdUnit4 Scene Runner | Input events, actions, signals, frame progression, scene state and CI-readable reports | Native golden-image comparison is not yet available |
| Packaged-build smoke | Airtest, when an export exists | Black-box image-located taps, swipes and visible-result assertions without engine injection | Exact component ownership and internal state invariants |

## Why another browser framework is not the answer

The failure was not that Playwright could not click. The old suite clicked
centers successfully and then accepted generic state or pixel changes. Cypress,
WebdriverIO, or another driver would pass the same broken assertions. The new
gate changes the oracle: a click must belong to the complete visible surface,
produce a source-authorized result, preserve declared invariants, and reverse.

## Godot adoption boundary

Add GdUnit4 only when the first real Godot scene exists. Each reconstructed
window should become a scene or component with a benchmark journey that:

1. loads through Scene Runner;
2. dispatches mouse or keyboard input through the public interface;
3. advances an explicit number of frames;
4. verifies signals and state;
5. captures viewport evidence through the repository comparator; and
6. restores the scene to its original state.

GdUnit4 supports scene input simulation, explicit frame advancement, command
line execution, JUnit output, and a maintained GitHub Action. Its open visual
regression issue means repository-owned golden-image comparison is still
required.

## Airtest adoption boundary

Airtest becomes useful after a desktop or mobile game export exists. Use it for
a small number of player-visible critical journeys and retain its HTML report
and screen recording. Do not use image recognition as the only locator for
dense adjacent controls; engine-owned node paths and the BGM hit-map contract
are stronger there.

## CI shape

The current GitHub job runs the React build and BGM quality gate and uploads the
report even when it fails. A later Godot job should run GdUnit4 independently.
The packaged-build Airtest job should remain a scheduled or release-candidate
job because it is slower and more environment-dependent.
