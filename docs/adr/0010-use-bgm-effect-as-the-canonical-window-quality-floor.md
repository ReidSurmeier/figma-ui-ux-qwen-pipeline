# Use BGM and Effect as the canonical window quality floor

Status: accepted on 2026-08-23. Extends ADR 0009.

## Context

The Options window's BGM and Effect rows are the strongest reconstructed
surface in the Japanese desktop. They preserve independent source-derived
assets, source-aligned Japanese copy, continuous slider values, exact visual
thumb endpoints, application-owned checkboxes, reversible state, and local
pixel invariants. Other windows were previously marked verified by weaker
proxies: average screenshot scores, center clicks, declared semantic contracts,
and runtime manifests that could approve their own incomplete mappings.

The result was a false green. Large white or misaligned regions, incomplete
visual-component ownership, and incorrect hit regions could remain visible
while the suite reported complete coverage.

## Decision

Treat BGM and Effect as the named canonical quality floor. A different window
may implement different controls, but it must satisfy the same applicable
quality dimensions:

1. source-relative visual error no worse than the accepted benchmark;
2. no local connected defect larger than the benchmark's worst defect;
3. every visible control resolves to an independent visual authority;
4. the visible interaction surface maps to the correct control, not merely its
   center point;
5. every interaction exposes idle, pointer-down, pointer-up, settled, and
   reversible evidence;
6. continuous controls expose at least five distinct samples and exact
   endpoints; and
7. window movement, clipping, stacking, minimize, close, reopen, scrolling,
   tabs, menus, and selection use source-specific assertions when applicable.

The executable contract is `prototype/qa/bgm-fidelity-contract.json`. The live
runner is `npm --prefix prototype run qa:bgm-fidelity`. It captures a stable
849 by 564 frame, compares every source window, resolves visual ownership from
the live DOM, scans each enabled hit surface, and fails closed when interaction
evidence has not yet been replayed at benchmark quality.

`options` retains the status `quality-benchmark`. Every sibling remains
`revision-required` until it passes this gate, correction replay, and Figma
parity. The correction runner cannot promote a window around this decision.

## Professional testing stack

Playwright remains the WSL browser driver and trace collector. It is not the
visual judge. Replacing it with another browser driver would not repair a weak
acceptance oracle.

When an executable Godot prototype exists, use GdUnit4 Scene Runner for
scene-level mouse, keyboard, action, signal, and frame progression tests. Keep
the source-locked screenshot comparator as a separate layer: GdUnit4's native
visual-regression capability is still tracked as an open feature. Use the
GdUnit4 GitHub Action for engine-native CI.

Airtest is an optional later black-box smoke layer for exported builds. Its
image-recognition input can test a packaged game without code injection, but it
does not replace exact source-relative comparison or engine-level state tests.

Primary references:

- [GdUnit4](https://github.com/godot-gdunit-labs/gdUnit4)
- [GdUnit4 Scene Runner](https://github.com/godot-gdunit-labs/gdUnit4/blob/master/documentation/doc/_advanced_testing/sceneRunner.md)
- [GdUnit4 visual-regression request](https://github.com/godot-gdunit-labs/gdUnit4/issues/655)
- [GdUnit4 GitHub Action](https://github.com/godot-gdunit-labs/gdUnit4-action)
- [Airtest](https://github.com/AirtestProject/Airtest)
- [Godot testing framework guidance](https://docs.godotengine.org/en/stable/tutorials/ui/creating_applications.html#adding-unit-tests)

## Consequences

- Current historical verification is invalidated instead of being grandfathered.
- Aggregate similarity can no longer hide a large local defect.
- A missing visual mapping or pending reversible journey is a failing result,
  not an informational warning.
- The benchmark itself is testable and received a real correction: its range
  hitbox no longer overlaps the visible left-arrow surface.
- GitHub CI publishes the full benchmark report and screenshot even on failure.
- GdUnit4 and Airtest are not added to the current React prototype prematurely;
  their adoption begins with the first executable Godot scene/export.
