# Japanese RPG false-verification diagnosis v001

Date: 2026-08-22

## Outcome

The v003 correction matrix did not establish that the Japanese desktop was a
working Interactive Replica. It established only that declared DOM controls
existed and that some state or pixels changed after scripted activation. A
hands-on review reproduced visible failures that the matrix reported as passes.
All entries in `prototype/qa/window-verification.json` are therefore
invalidated.

No UI repair should be promoted until each defect is converted into a
source-specific public-interface test and observed RED before implementation.

## Reproduced failures

| Surface | Reproduced behavior | Why the old test passed |
| --- | --- | --- |
| Inventory | At scroll 100, the first icon row starts at y=254 while the header ends at y=265. The grid has `overflow: visible`, so icons enter the header. | The test asserted only eleven emitted input values, a `translateY(-12px)` transform, and the thumb's CSS top coordinate. It never asserted clipping or content-viewport bounds. |
| Card | The copy viewport has the same SHA-256 at scroll 0 and 100 while the scrollbar region changes. | The test asserted only thumb movement and a whole-window screenshot difference. |
| Basic Info page buttons | Selecting `equip` leaves the visible 202 by 84 content area byte-identical. Only the selected button and an `sr-only` status string change. | The test asserted `aria-pressed` and hidden status text instead of a visible page transition. |
| Status increments | `Str+1` changes `aria-pressed`, an `sr-only` output, and a brightness filter over the unchanged raster row. No displayed value is incremented. | The test explicitly accepted the filter class and hidden status string as the behavior. |
| Status alternate view | The source crop contains one vertical `STATUS` label and no second tab, but the runtime split that label into two invisible buttons and invented a browser-typeset info panel. | The test encoded the invented state and checked only that its tabpanel contained `キャラクター情報`. |
| Chat | The room control is an opacity `0.002` native `SELECT`; the visible popup is therefore platform-owned. Two native Chat/Message tabs were added over the source title area. | Automation used `selectOption()`, which bypasses opening and rendering the menu, and the test encoded the invented second tab as expected behavior. |
| Party | Dragging Party 40 by 30 pixels moved back by exactly 40 by 30. The buttons were modeled inside the Party window despite the review requirement that they remain separate. | `windows.json` incorrectly defined Party as a `160-wide party panel plus three source action buttons`, so implementation, manifest, and tests agreed with the same wrong boundary. The corrected authority records a 160-wide window at `[568, 370]` and external desktop controls. |
| Dense lower-right windows | Compact Info, Party, Quickbar, and Notification use inferred compound crops that reproduce clipped and misshapen source fragments as independent windows. | Exact crop comparison verifies the inferred crop itself; it does not validate semantic window ownership or unobscured reconstruction. |

## Root causes

### 1. The pass predicate accepts any change

`run-correction-matrix.mjs` marks a control passing when any of these is true:

```text
visualDown || visualSettled || stateChanged || alreadySelected
```

Generic `:active` filters, `aria-*` attributes, and hidden status strings can
therefore certify a control whose intended visible result is absent.

### 2. Tests verify implementation declarations instead of source behavior

The runtime component manifest is captured from the runtime DOM. It proves what
was built, not what the Reference Screen requires. Figma is then generated from
that same manifest, so runtime/Figma parity can be green while both are wrong.

The source window registry compounds this: `windows.json` still labels thirteen
windows as `reconstruction`, but the v003 registry promoted all fifteen to
`verified`. No source-approval gate connected those two states.

### 3. Visual tests cover only resting states and broad averages

The source comparison captures the default desktop. It does not compare
scrolled, selected, alternate-tab, dropdown-open, minimized, or dragged states
to source-specific or approved inferred-state fixtures. Masked whole-window MAE
allows a local header, line, label, or icon to be badly wrong while the large
unchanged area dominates the score. Some focused thresholds are extremely
loose; Compact Info permits normalized MAE 0.20.

### 4. Browser automation bypasses the reviewed interaction path

The generic dead-button test uses `click({ force: true })`. The dropdown probe
uses `selectOption()` instead of opening the menu. Hit-map validation checks only
the center point. These paths do not reproduce boundary clicks, platform popup
styling, or the precise visible pixel a person attempts to press.

### 5. Platform coverage is absent

The suite runs headless Linux Chrome at a fixed WSL address. It does not exercise
the Mac review browser. Native form controls are inherently platform-styled, so
the current suite cannot establish the appearance of their open state on macOS.

### 6. No real exploratory visual gate ran

The v003 matrix generated hashes and JSON but did not semantically inspect the
focused before/after frames. The ADR calls for an AI exploratory scout followed
by deterministic promotion; that layer was effectively replaced by predicates
over DOM state and hashes.

## Required replacement gates

1. Every interaction must declare the specific visible region expected to
   change and the regions required to remain stable.
2. Scroll tests must prove content movement, clipping, a single thumb, exact
   endpoints, and restoration—not merely emitted values.
3. Page and tab tests must compare visible state fixtures, never `sr-only` text
   alone.
4. Hit maps must be sampled across the complete visible silhouette and shared
   boundaries without forced clicks.
5. Dropdowns must use an application-owned source-themed popup so rendering is
   deterministic across WSL and Mac.
6. Source window ownership must be approved independently of runtime and Figma
   manifests. A runtime-captured manifest cannot approve itself.
7. Each state screenshot must receive a focused semantic visual review before
   its finding is promoted into a deterministic gate.

## First RED tracer

`remaining-source-windows.spec.ts` now includes:

```text
card scrolling moves the visible Japanese copy rather than only its thumb
```

It fails because the copy viewport is byte-identical at scroll 0 and 100. This
is the first correct public-interface seam for replacing the false scrollbar
oracle. UI implementation remains unchanged while this diagnosis is reviewed.
