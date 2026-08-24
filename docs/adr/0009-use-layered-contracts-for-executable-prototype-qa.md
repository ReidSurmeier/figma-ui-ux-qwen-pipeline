# Use layered contracts for Executable Prototype QA

Status: accepted on 2026-08-22. Supersedes ADR 0007.

## Context

Playwright was previously asked to be a crawler, a visual judge, a Figma
prototype operator, and a release oracle. The local runner could execute tests,
but private Figma Embed authentication, a broad crawler timeout, and weak
assertions made failures ambiguous. Screenshots and reaction counts showed
that artifacts existed; they did not prove that a complete user journey worked.

An AI browser agent can discover unexpected problems, but its observations are
non-deterministic. It cannot be the only release gate. Conversely, deterministic
tests alone will not notice every awkward transition, clipped menu, misleading
label, or visually implausible generated asset.

## Decision

After a window passes deterministic gates, replay the accumulated human-correction prompts in `prototype/qa/correction-replay.json` against its local visual evidence and complete interaction trace. A credible exploratory finding must be minimized and promoted to a reproducible failing test before revision. A window cannot be marked verified until this correction replay is green.

Use a layered QA system with one responsibility per layer:

1. Validate manifests, stable IDs, required states, provenance, and source
   coverage before launching a UI.
2. Use Storybook and Vitest for isolated component states, event contracts, and
   continuous-control behavior.
3. Use deterministic screenshot, geometry, OCR, and pixel-region comparisons
   for visual fidelity at declared viewports.
4. Retain `@playwright/test` for a thin set of critical end-to-end user
   journeys, with traces and media on failure. Do not use an exhaustive generic
   crawler as the primary gate.
5. Use Chrome DevTools inspection to diagnose layout, animation, console,
   network, and performance failures in the live WSL web runtime.
6. Use an AI browser agent as a non-blocking exploratory scout. Convert every
   accepted finding into a minimal deterministic regression test before calling
   it fixed.
7. Audit Figma Design structure separately from WSL runtime behavior. Figma node
   existence, prototype reactions, Design screenshots, and application
   execution are distinct evidence surfaces.
8. Mark authentication- or environment-blocked checks as `UNAVAILABLE`, never
   as passing. No layer may infer success from another layer's result.
9. For every stateful bitmap control, compare its visible alpha silhouette and
   root-relative anchor before and after interaction. An image may be
   transparent and still be wrong if a stray source pixel or shifted crop is
   present.
10. Test local boundary rings around Exact Copy layers. An interior-only score
    cannot detect an opaque rectangular crop whose contents happen to match.
11. Sample motion geometry throughout the transition, not only at rest. A
    slider or window transition must expose more than four distinct values or
    sizes when its contract is continuous or stepped-smooth.
12. When a transition reveals a visual surface not present in the screenshot,
    its endpoint requires a separate Qwen Render Pass and provenance. A clipped
    source frame is not a generated minimized/collapsed state.
13. Treat `idle`, `pointer-down`, `pointer-up`, and `settled` as separate
    checkpoints. Pointer-down must have visible feedback and must not trigger
    navigation before release.
14. Keep a live remote-MCP audit for Figma node IDs, image hashes, exact
    geometry, font authority, hidden/visible state, and reaction destinations.
    The Git readback record catches evidence drift; the live check catches
    hosted-file drift.
15. For tiny source-locked assets, verify negative space as well as visible
    pixels. Record the exact alpha silhouette, assert declared clear rows or
    columns around it, and test every reachable state. A transparency check or
    whole-window similarity score cannot detect a single neighboring pixel.
16. Scope Figma reads and fixes to the semantic component subtree. Generic
    layer names such as `Text` are not stable selectors; audit the label parent,
    its margin wrapper, and the raster child together so auto-layout padding is
    included in the measured root-relative geometry.
17. Separate visual overlap from input ownership. If source artwork overlaps,
    preserve that overlap in non-interactive visual layers, then define adjacent
    transparent hit regions with an explicit shared boundary and test the pixels
    on both sides of it. Center clicks cannot validate boundary mapping.
18. Do not use the browser's native range-thumb inset as visual authority for a
    source-specific track. Keep the semantic range input for pointer and keyboard
    behavior, render its native thumb transparent, and derive an independent
    visual thumb center from the declared source endpoints. Verify the minimum
    and maximum center coordinates and the thumb asset's negative space.
19. Removing a donor background must be color- and region-specific. Never erase
    the complete perimeter ring merely because it contains magenta: doing so
    deletes the source's stepped rounded chrome. Assert transparent corner
    steps, opaque border occupancy, and zero donor-magenta independently.
20. A new human correction invalidates all applicable historical verification
    reports. A window can return to `verified` only after its replay report
    contains the new prompt ID and both browser and Figma evidence have been
    refreshed.
21. Compare every reconstructed window against its aligned source crop after
    masking donor-magenta pixels, and compare the full 849 by 564 composition
    separately. Whole-composition similarity cannot replace per-window gates;
    per-window similarity cannot prove that no source UI surface was omitted.
22. Treat donor-facing component rows as explicit negative-space contracts.
    A source-relative comparison may deliberately mask the donor background and
    therefore miss a visible seam that travels with an extracted control.
    Known crop boundaries must independently assert zero alpha occupancy.
23. Capture the runtime component manifest from the executable DOM and use it
    to drive Figma geometry, raster naming, and hotspot coverage. Hand-copied
    Figma coordinates are not a parity mechanism.
24. Commit Figma prototype destinations before writing reactions that target
    them. The remote transaction may reject or fail to resolve destinations
    created in the same call; staged destination and reaction writes make the
    graph reproducible and auditable.
25. Derive destination coverage from the complete enabled-control inventory,
    not a hand-maintained subset inside one test. Every navigation control must
    prove a visible destination, destination z-order, and a real destination
    affordance. If the state is initially hidden, capture and replay it after
    activation; the default runtime manifest alone cannot prove that it exists.
26. A Qwen candidate may be accepted by bounded region without accepting its
    complete window. Record every full-window rejection, the exact accepted
    crop rectangles, and the independent runtime chrome authority. A generated
    full window with wrong title geometry cannot become a screenshot underlay
    merely because its body artwork is useful.
27. Behavior not visible in the immutable screenshot requires an explicit
    `user-authorized-inferred` behavior authority in its semantic contract.
    Missing or model-only inference fails closed even when the browser test and
    source hash pass. The report must keep source identity and behavior authority
    as separate evidence.
28. Every continuous control declares its independent visual component. Test
    the complete control inventory—not one representative—for intermediate
    values, exact endpoints, invariant regions, and donor remainder. Every
    minimize control likewise declares its generated endpoint and proves motion,
    settled geometry, preserved title authority, and restoration.
29. Navigation completion includes reversal and recovery. If a destination has
    a close control, the originating navigation control must reopen it without a
    page reload. Visibility is application state owned by the common desktop,
    not private state that makes a previously valid navigation control dead.
    Adding this requirement invalidates an earlier passing navigation contract
    until the complete close-to-reopen journey is green.
30. Dynamic control families may use anchored semantic label patterns only when
    one locked public-interface test exercises every reachable member. Pattern
    matching is a coverage mechanism, not permission to infer sibling behavior;
    overlapping exact or pattern contracts fail as duplicates.
31. Source-visible category controls expose real tablist, tab, and tabpanel
    semantics plus wrapped vertical keyboard traversal. A default-tab screenshot
    cannot prove that secondary categories or their descendants are reachable.
32. Clip every transformed child to its source-owned body region. A reversible
    animation still fails when an intermediate rotated, translated, or scaled
    pixel enters the title, neighboring copy, or window perimeter. Tests sample
    those invariant regions during the interaction, not only after restoration.
33. Stabilize window activation and z-order before capturing invariant pixel
    authorities. A legitimate foreground transition can otherwise be mistaken
    for control-owned pixel damage; subsequent interaction samples must keep the
    activated stacking state fixed.
34. The default control inventory contains only controls reachable in the
    settled visible view. Clipped descendants are disabled until their public
    navigation state reveals them, while a locked dynamic-family journey must
    still visit every page and exercise every descendant. DOM presence is not
    evidence that a user or an agent can activate a control.
35. Every raster-backed discrete control declares the visual component it owns.
    Dynamic-family tests verify exact source geometry, exclusive state transfer,
    and invariant neighboring regions for every member; one generic click that
    changes the whole window cannot grant the family.
36. The default unit suite validates every committed semantic test-file hash,
    not only contracts selected for the current correction replay. Any edit to
    a locked file fails all stale references immediately, so an isolated green
    window cannot conceal drift in another window's evidence.
37. Prefer one semantic test file per reconstructed window. This keeps evidence
    locks local, prevents unrelated sibling tests from invalidating a reviewed
    contract, and lets the global lock gate name the exact window that drifted.
38. Editable source fields must render their current value in the reconstructed
    pixel style; a transparent semantic input over an unchanged raster is not
    editable visual behavior. Cancel actions reverse the complete pending form,
    not an arbitrary subset of fields.
39. An invariant screenshot baseline is accepted only after the target window's
    computed z-index equals the desktop maximum. Frame delays alone do not prove
    activation, and transparent pixels can reveal a different overlapping layer.
40. Cap the bitmap-heavy Playwright suite at six workers against the single WSL
    asset server. Higher cold-page concurrency produced incomplete raster
    captures and false MAE or invariant failures; throughput cannot outrank
    deterministic evidence.
41. Multi-step actions expose prerequisites as real disabled states and lock the
    complete forward and reversal journey. A confirm control cannot succeed
    before selection, changing selection invalidates prior confirmation, and
    commit or cancel returns the transaction to a clean state.
42. Menu actions without authorized external destinations stop at reversible
    local selection feedback. They must not fabricate operating-system exits or
    navigation, and clicking the selected action again restores the ready state.
43. Controls that are visually outside a window but semantically belong to it
    declare `data-control-owner` with the stable window ID. Correction replay,
    runtime manifests, and control coverage include those satellite controls in
    the owner's inventory. They may remain fixed while the window moves when the
    source requires it, but closing and reopening the owner must remove and
    restore the complete control set.
44. Correction replay applies the same owner-aware boundary to control and
    component inventory. Its help path is non-mutating and runs before evidence
    cleanup, so command discovery cannot erase the last complete replay.
45. Source slot banks receive one isolated neutral-to-selected-to-neutral pixel
    journey per slot. Exclusive ARIA state alone is insufficient: every inactive
    raster must remain byte-identical, and same-slot activation must restore the
    complete neutral bank without changing drag ownership.
46. Runtime control records persist their declared visual component and lifecycle
    targets in the shared manifest. Browser-only attributes are insufficient for
    Figma parity or later engine export; capture must retain
    `visualComponent`, `minimizeEndpoint`, and `closeWindow` when present.
47. Pixel invariants capture authority only after foreground activation and two
    consecutive identical frames. A navigation-complete event does not prove CSS
    bitmap decode and compositing are settled under concurrent cold-page load.
48. Source-raster authority additionally awaits explicit decode of every
    computed CSS background in the target window. Two identical early frames can
    precede delayed background decode under parallel browser pressure.
49. A raw screenshot rectangle is not a valid isolated-window oracle when it
    contains donor background or pixels semantically owned by another window.
    Every isolated and assembled comparison uses the same canonical
    source-ownership mask.
50. The active runtime manifest, not directory contents, defines the promoted
    asset set. Versioned Qwen candidates and rejected predecessors remain for
    provenance without being counted as duplicate active controls or donor
    failures.
51. Reconstruction promotion has three ordered gates: active asset and ownership
    integrity; isolated source-owned fidelity plus a complete semantic journey
    for each window; and assembled overlap, z-order, and learned-correction
    replay. A green assembled screenshot cannot waive a failed isolated window.
52. Qwen structural generation and deterministic ownership finishing are
    distinct provenance stages. The finishing stage may restore exact
    source-owned pixels, clear baked duplicates, and enforce alpha boundaries,
    but it must name the Qwen inputs and must not describe its output as a new
    model generation.
53. Runtime-only inferred destinations receive engine journeys but do not enter
    the source-window correction registry. This keeps screenshot-derived claims
    bounded to what the reference can actually prove.

## Consequences

- A Playwright failure identifies a broken user journey rather than every class
  of visual or authoring defect at once.
- Smoothness is tested from value continuity, event response, and animation
  timing rather than by counting generated frames.
- Exploratory AI testing broadens coverage without making the release result
  depend on an irreproducible judgment.
- Overnight runs must stop on explicit retry and unresolved-review
  limits; repeated regeneration is not evidence of convergence.
- Figma authoring quality, WSL application quality, and game-engine readiness
  receive separate verdicts.
- A global similarity score cannot mask a broken title, checkbox, or endpoint;
  each declared high-risk region has its own oracle.
- Hidden destinations are tested as user journeys and as activated visual
  states; default-page DOM coverage is not treated as destination coverage.
