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

## Current non-reproduction evidence

The reported Exchange-window failures (missing summary bars and icon hit maps
offset by a wide margin) no longer reproduce at the current runtime. The
summary strip is pixel-identical to its source-locked component, and real
`elementFromPoint` samples 1.5 CSS pixels to both sides of all fourteen
horizontal item boundaries and all eight vertical row boundaries resolve to
the expected adjacent item buttons. This is retained as the Playwright contract
`Exchange preserves its source summary bars and exact adjacent item hit
boundaries`; no speculative Exchange visual repair was made.

## First RED tracer

`remaining-source-windows.spec.ts` now includes:

```text
card scrolling moves the visible Japanese copy rather than only its thumb
```

It fails because the copy viewport is byte-identical at scroll 0 and 100. This
is the first correct public-interface seam for replacing the false scrollbar
oracle. UI implementation remains unchanged while this diagnosis is reviewed.

## Skills scroll tracer and extraction correction

The Skills window reproduced the same false-oracle class as Card: changing the
range input moved only `.skills-source-thumb`; the four visible skill rows stayed
byte-identical. The replacement public-interface test captures the exact list,
title, and footer rectangles. It requires list movement while the title and
footer remain invariant.

The first Qwen second-page assembly then exposed a second independent failure.
The generation brief requested four 36-pixel rows, but the accepted Qwen output
contained unequal raster bands at source-scale y/height values `18/29`, `47/36`,
`83/28`, and `115/31`. The old assembler assumed ideal y values
`18,54,90,126`, which imported adjacent separators and clipped later Japanese
glyphs. A whole-window movement test could not detect this.

The corrected method now:

1. records the measured candidate rectangle for every accepted component;
2. normalizes each measured Qwen donor to the runtime's 36-pixel row only after
   extraction;
3. stores magnified exact-copy evidence for every Japanese label;
4. records rejected candidates and the component-specific rejection reason;
5. fails closed if provenance is only an unsubstantiated `"pass"`; and
6. retains only the bounded Qwen row donors, rejecting generated chrome,
   scrollbar, footer, and outer-window pixels.

The fourth row required a focused Alibaba `qwen/qwen-image-3-pro` repair pass.
The selected output supplies only its icon, level control, and exact `ルアフ`
copy; the source-locked title, scrollbar, footer, and window geometry remain
independent runtime components.

The selected-row color is also generated evidence, not runtime truth. Both
page-two rows whose donors contain baked cyan or blue focus are explicitly
cleared when `aria-selected=false`; the icon and level-control assets retain
their original color. The executable contract measures source-blue pixels
through idle, selected, and cleared states and activates the generated
`ルアフ` level control. This prevents visual focus and interaction state from
silently disagreeing.

## Equipment hit ownership tracer

The Equipment resting screenshot was visually close, but its left-row assets
are 105 pixels wide while the shared runtime rule stretched every row button to
106 pixels. With left rows beginning at x=4 and the avatar beginning at x=109,
the implementation created a one-pixel overlap. DOM order assigned the shared
edge to the avatar, so visible row and hit-map ownership disagreed.

The corrected runtime preserves the source widths exactly: left rows own
x=4..108, the avatar owns x=109..169, and right rows own x=170..275. The gate
asserts the three DOM rectangles and probes the integer pixels on both shared
boundaries with `elementFromPoint`; it does not rely on center clicks or forced
activation.

The central character preview had a second false contract. The screenshot does
not identify it as a button and no authority defines a rotate gesture, but the
runtime wrapped it in a hidden `キャラクターを回転` button. Its four alleged
states were only one-pixel translations, mirroring, and brightness filters;
the test passed by reading `data-turn`. The hotspot and synthetic states are
removed. The avatar remains an independent raster component, and the runtime
now proves that its center does not resolve to a button. A future rotation flow
requires explicit behavior authority and source-fitting Qwen state assets
before it can be introduced.

The previously reported Equipment minimize failure no longer reproduces. Its
current endpoint uses the independently generated 180 by 18 Qwen plate, removes
the complete body subtree, keeps title text and both title buttons inside the
resolved edge, exposes more than four width samples during the stepped motion,
and restores to a byte-identical expanded window. These are now locked as an
Equipment-specific browser contract; no speculative minimize visual change was
made.

## Compact Info threshold and geometry tracer

Compact Info passed only because its normalized MAE ceiling was `0.200`, while
most focused windows use roughly `0.025..0.055`. The source places its title
icon, name, and level copy at y=4 and its HP/SP rows at y=20. The runtime placed
all five components one pixel high at y=3 and y=19. On this 35-pixel strip that
produced MAE `0.186638` and visibly cut the readout rhythm, yet the broad gate
still passed.

The component coordinates are now exact and the ceiling is `0.050`. The same
retained Qwen-derived empty plate measures `0.0276959`; this isolates the defect
to assembly instead of blaming generation. Two focused Alibaba
`qwen/qwen-image-3-pro` batches were evaluated and all eight candidates were
rejected: the first retained semantic copy, while the second was empty but
violated the exact 16/19-pixel band geometry. No inferior candidate was promoted
merely because generation had been attempted.

## Notification behavior-authority tracer

Notification already matched its source crop (`MAE=0`), but the complete
three-layer message cluster was wrapped in an invisible `次の通知` button. Its
only settled effect was a brightness/saturation filter over the unchanged
message; the hidden status string changed from notification 1 to 2. No source
or behavior record defines this hotspot or a second message state.

The fabricated control is removed. Bubble, upper message, and lower message
remain independent 143 by 41, 102 by 20, and 102 by 21 raster layers at their
exact source coordinates. The browser gate asserts those bounds and that the
Notification region exposes no button. A future next-message interaction must
first supply explicit behavior authority and a source-fitting second message
state.

## Bottom Bar real-gesture tracer

The visible Bottom Bar thumb occupies x=98..105 at its source endpoint, but the
opacity-hidden range input began at x=102. Its first four pixels therefore did
not belong to the slider. Programmatic `.fill()` tests still passed and could
move the thumb to both endpoints, reproducing the same automation-bypasses-
gesture failure as the native dropdown probes.

The range hit area now begins at x=98 and ends immediately before the two
source navigation buttons at x=580. The browser asserts all sampled pixels
across the visible thumb resolve to the range input, then performs real pointer
drags to x=570 and back to x=98. Both the input value and independent raster
thumb must reach exact 100/0 endpoints.

The reported Quickbar cropping/focus failure does not reproduce in the current
runtime. Its three independent assets retain exact source rectangles
`[2,2,42,42]`, `[44,1,42,43]`, and `[2,50,76,42]`; the resting state has no
invented selection, and a real click promotes exactly one slot with a visible
settled change. The remaining source-difference score is dominated by the
intentional removal of magenta desktop pixels. The asset contract separately
proves zero opaque donor-pink pixels, so no pink border is reintroduced merely
to lower screenshot MAE.
