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

## Correction-runner self-audit

The correction matrix itself contained three independent false-verification
hazards:

1. `if (!passed)` referenced an undefined variable, so the first uncontracted
   control crashed the run before it could retain evidence.
2. Generic controls were driven with `.fill()`, `.selectOption()`, and a legacy
   `click({ force: true })` inventory test. Those paths bypass the visible
   pointer/keyboard journey and can certify controls whose real hit geometry or
   application-owned popup is broken.
3. `remaining-window-contract.sh` still expected the pre-reconstruction Skills
   and Party inventories. It exited silently at 22 versus 34 Skills assets and
   never reached the browser probes.

The runner now uses pointer and keyboard gestures, records exact range values
at Home, nine pointer samples, and End, and samples minimize motion after a
trusted Playwright pointer click. Source prerequisite scripts are executed as
structured evidence with status, stdout, and stderr; a failed prerequisite can
no longer throw away the rest of the audit. The component inventory contract
now names dimension/count mismatches explicitly.

Generic activity remains deliberately uncontracted. A pixel or ARIA change is
recorded, but it cannot pass without all four semantic requirements:
`realGesture`, `expectedRegionChanged`, `invariantRegionsStable`, and
`sourceApproved`. These values must eventually come from source-specific
executable contracts, not booleans asserted by the same generic probe.

For runner development, `CORRECTION_MATRIX_RUN_ROOT` moves every mutable output
(frames, reports, and the verification-registry copy) beneath one isolated
directory. This permits a full self-test without deleting canonical evidence or
changing the tracked registry. Omitting it remains the explicit production
replay path.

The first replacement hit-map sweep also revealed an oracle defect:
`offsetParent !== null` included Skills page-two buttons outside the clipped
viewport. The corrected test raises each window through a real exposed pixel,
waits for the top z-index, intersects every button with all clipping ancestors,
and samples the center of the remaining visible silhouette. It therefore
detects genuine overlap while excluding off-viewport DOM geometry.

The first isolated end-to-end self-test completed all 15 windows without
touching the tracked registry (SHA-256 remained
`cbb968057c1cf7e7c25a9192009cf422d186ee6dee447a408aba563234232dad`). It
failed closed on 13 windows and passed only Compact Info and Notification,
which expose no invented controls. That is the expected state while generic
activity has no semantic contracts.

That run also found an orientation error in its own range sampler. Card,
Skills, and Inventory use `writing-mode: vertical-lr`, but the generic sampler
clicked across x; every intermediate gesture therefore returned value 50 and
only Home/End changed the raster. The sampler now chooses x or y from computed
writing mode. A real-browser regression proves all three vertical controls
expose more than four pointer positions and exact 0/100 keyboard endpoints.
Finally, any failed window now sets a nonzero process exit code, so CI or an
overnight loop cannot report a green command for a red audit summary.

For a fast runner self-test, `CORRECTION_MATRIX_WINDOW_IDS` accepts a
comma-separated source-window subset and rejects unknown ids. Omitting it still
runs the full 15-window overnight matrix.

## Runtime-manifest freshness gate

The first semantic-contract tracer found that the Figma input manifest was
stale even after the runtime repairs. It still declared the broken Bottom Bar
slider hitbox at x=102/width=478 instead of x=98/width=482, omitted all Skills
page-two component and control instances, and retained the old 106-pixel
Equipment left-row width. A Figma build from that file would reproduce geometry
that the browser tests had already corrected.

Manifest capture is now a shared browser function used by both the capture CLI
and an E2E freshness gate. The committed artifact must be deep-equal to a fresh
849 by 564 browser capture before the suite passes. The refreshed manifest
records 15 windows and 205 component instances, including the corrected Bottom
Bar, Skills, Equipment, and Compact Info geometry. This makes runtime-to-Figma
handoff drift independently detectable instead of trusting a previously
generated JSON file.

## First executable semantic-contract tracer

The Bottom Bar slider is the first generic probe allowed to pass. Its contract
locks five independent facts:

1. the exact Playwright test title and SHA-256 of its complete source file;
2. a passing real pointer-drag test in both directions;
3. the exact source screenshot SHA-256 and bottom-bar crop `[0,538,600,21]`;
4. the expected moving thumb region and exact 98/570/98 endpoints; and
5. byte-stable title and navigation-button invariant regions.

The correction runner executes the locked test and derives the four semantic
requirements from that evidence. It does not read `true` values from the
contract file. A changed test file, changed source image, missing test, failed
gesture, absent expected region, or absent invariant region fails the contract.

In the isolated Bottom Bar replay, `クイックスロット位置` changed from
`uncontracted-evidence` to `contract-passed`. `前のスロット` and
`次のスロット` remain explicitly uncontracted, so the window and command stay
red. Every report now includes counts and exact labels for contracted, passed,
failed-contract, and uncontracted controls. This is the intended tracer-bullet
behavior: coverage grows one reviewed interaction at a time without promoting
adjacent controls by association.

## Basic Info destination tracer

The existing page-button test covered six buttons but silently omitted `map`
and `friend`. Browser reproduction showed both clicks changed only Basic Info:
the window raised itself, the button filter changed, and the hidden status text
claimed the destination opened. No other window changed z-order. The complete
pixel difference remained inside Basic Info (`map` 66 by 68 at `[0,0]`,
`friend` 69 by 95 at `[0,0]`).

Two public-interface acceptance tests were observed RED independently. Friend
must activate the existing Party window and its source `友達` tab. Map must
expose a visible draggable `マップ` region, not a filter or hidden message. The
Friend repair now routes through Desktop-owned navigation state and passes.
The Map RED contract was then expanded before implementation to prove a real
32 by 24 pixel drag, close, and reopen—not merely DOM visibility. Qwen Image 3
Pro generated four inferred Map candidates through Alibaba. All four complete
windows were rejected because their title bands violated the source-locked
18-pixel geometry. Candidate 1 was accepted only as three bounded component
donors: title icon, exact `マップ` title, and text-free map body. Runtime chrome
reuses an existing independent 280 by 150 Qwen-derived clean plate and close
control; no generated complete window or reference screenshot is mounted.

The focused Map gate now passes independent-component count, title non-overlap,
exact body bounds, zero donor-magenta pixels, z-order, drag displacement, close,
and reopen. This changes the method: conditional destinations must be captured
after activation, and Qwen candidate selection is allowed at bounded-component
granularity while complete-window promotion remains explicitly null.

The destination fix was then promoted from three hand-maintained tests to one
complete metadata-backed inventory contract. The contract asserts all eight
Basic Info controls, executes every destination, and preserves the title plus
HP/SP meter authorities. Its inferred Map and Friend behavior is separately
labeled `user-authorized-inferred`; the evaluator rejects an unapproved
`model-inferred` label. An isolated autonomous replay reported 11 enabled Basic
Info controls: exactly 8 contracted and passed, with only minimize, HP, and SP
remaining uncontracted. The window correctly remains red, proving the new
coverage does not promote adjacent controls by association.

The same inventory pattern was applied to HP and SP rather than inheriting the
older HP-only result. Both controls now declare independent visual thumbs,
expose more than four real pointer values, reach exact source endpoints, leave
no grey donor remainder, and preserve unrelated title/footer authority. Basic
Info minimize now declares its generated compact plate, exposes more than four
geometry steps, settles at 180 by 18, preserves title authority, and restores
exactly to 280 by 120. A third isolated replay reports 11 enabled controls,
11 contracted, 11 contract-passed, zero uncontracted, and no correction
failures. This is browser/correction completion for Basic Info, not a waiver of
the separate fresh Figma parity gate.

That green result was deliberately challenged again before promotion. The
destination test had proved open and z-order but not reversal. Closing Status
made the Basic Info `status` button permanently dead because each child window
owned private `open` state. The expanded test went RED on the exact
close → reopen journey. Desktop now owns visibility for Status, Options,
Inventory, Equipment, Skills, Party, and Map; every matching Basic Info control
reopens its closed destination without reload. The locked navigation contract
hash was refreshed only after this complete journey passed, demonstrating that
new method requirements demote earlier green evidence instead of being waived.

## Status complete-control tracer

The prior Status browser test exercised only `Strを上げる`; generic replay had
no semantic contracts for the other source-visible controls. A source-locked
inventory now declares the exact five 11 by 11 buttons—Str, Agi, Vit, Dex, and
Luk—and deliberately rejects an invented Int increment. Each trusted click
changes only its local value field while its label, the complete derived column,
and every other stat row remain pixel-identical. The first isolated replay
promoted exactly those five controls and left minimize/close red.

Status minimize now declares its generated endpoint, exposes more than four
geometry steps, preserves title components, settles at 180 by 18, and restores
to 280 by 126. Status close removes the region; the source Basic Info status
control restores the exact geometry and ordered component inventory without
reload. The next isolated replay reports 7 enabled controls, 7 contracted,
7 contract-passed, zero uncontracted, and no correction failures. As with Basic
Info, this is browser/correction completion pending the separate fresh Figma
parity gate.

## Inventory dynamic-control tracer

The initial isolated Inventory replay found 27 enabled controls, zero contracts,
and no direct default-state behavior defect: every visible control produced real
state or visual evidence, the scrollbar exposed nine distinct visuals and exact
endpoints, and minimize exposed 14 geometry states. The confirmed QA defect was
structural. Exact-label contracts could not represent dynamic cell families,
and visual category buttons exposed no tablist/tab/tabpanel interface for an
agent to traverse beyond the default item view.

The semantic-contract matcher now supports anchored label patterns and rejects
multiple matching contracts. Inventory exposes real vertical tab semantics with
wrapped keyboard traversal. A locked browser journey clicks all 42 reachable
cells across item, equip, and etc and proves exclusive selection after every
click; the regex does not grant unvisited siblings. A stronger real-scroll test
samples nine pointer positions, proves more than four body states, asserts one
thumb at the exact 31/50 endpoints, and keeps the complete header byte-identical
at every value. Generated minimize/restore and close/Basic-Info-reopen receive
separate lifecycle contracts.

The next isolated replay reports 27 visible enabled controls, 27 contracted,
27 contract-passed, zero uncontracted, and no correction failures. This is the
third browser/correction-complete window, still pending fresh Figma parity.

## Card transformed-region and control-relationship tracer

The initial isolated Card replay found four visible enabled controls, zero
contracts, and no generic probe failure. Rotation, scrolling, slot selection,
and close each produced some state or pixel change, so the old classifier had no
way to distinguish correct Card behavior from an unrelated or leaking change.

The first locked rotation test immediately found a real geometry defect: the
three-degree art transform escaped its body and changed pixels in the Japanese
title band. The art now rotates inside a source-local clipping viewport and
restores its exact idle pixels. The scroll contract samples nine real pointer
positions, proves more than four copy states, follows one independent thumb from
y=44 to y=71, and holds the title plus art byte-identical. The Card slot now
declares `aria-controls="card-info-scroll"`, and its contract proves the public
0 to 70 to 30 state journey instead of accepting an unspecified visual change.
Close proves that exactly the Card window is removed; no screenshot-invisible
reopen behavior was invented.

Invariant baselines are captured only after bringing Card to the foreground.
During the first combined run, a legitimate z-order transition changed the
visible title crop and demonstrated that unstabilized screenshot authorities can
also create false failures. With activation fixed, the isolated replay reports
four controls, four contracted, four contract-passed, zero uncontracted, and no
correction failures. Card remains pending the separate full-suite and Figma
parity gates.

The same full-coverage run found a correction-runner race at the Options close
button: the control removed its window between visibility and screenshot calls.
The runner now waits for activation repaint, retries transiently detached idle
locators, and uses a one-second atomic settled screenshot with a control-vicinity
fallback for deliberately closed windows. An isolated 17-control Options replay
now completes and exits red for semantic coverage rather than crashing.

Combining the 14 completed full-run reports with the repaired isolated Options
report inventories 145 enabled controls (the disabled Exchange `trade` button
is intentionally excluded). Only the Bottom Bar slider is presently
source-contract-passed; 144 controls remain named and uncontracted. Compact
Info and Notification contain no controls and pass their applicable visual and
geometry prompts. No other window is eligible for verification from this
coverage result.
