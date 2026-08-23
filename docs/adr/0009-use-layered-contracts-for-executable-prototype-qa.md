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

## Consequences

- A Playwright failure identifies a broken user journey rather than every class
  of visual or authoring defect at once.
- Smoothness is tested from value continuity, event response, and animation
  timing rather than by counting generated frames.
- Exploratory AI testing broadens coverage without making the release result
  depend on an irreproducible judgment.
- Overnight runs must stop on explicit retry, cost, and unresolved-review
  limits; repeated regeneration is not evidence of convergence.
- Figma authoring quality, WSL application quality, and game-engine readiness
  receive separate verdicts.
- A global similarity score cannot mask a broken title, checkbox, or endpoint;
  each declared high-risk region has its own oracle.
- Hidden destinations are tested as user journeys and as activated visual
  states; default-page DOM coverage is not treated as destination coverage.
