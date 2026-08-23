# Autonomous convergence loop

## Outcome

A reconstructed window is not `verified` merely because it resembles one screenshot. Verification requires two independent layers:

1. deterministic gates for geometry, assets, behavior, motion, hit ownership, overflow, visual regions, provider provenance, and Figma readback;
2. correction replay using every recurring human correction in `prototype/qa/correction-replay.json` against the window's screenshots and interaction trace.

The second layer is intentionally exploratory. It may find a failure, but it cannot waive or directly replace a test.

## Loop

```text
Reference authority
  -> component and state manifest
  -> RED contract
  -> Qwen Asset Pass or native editable implementation
  -> deterministic assembly
  -> focused deterministic gates
  -> source-relative masked visual gate for every window and the full composition
  -> correction replay bundle
  -> finding?
       yes -> minimise -> add reproducible RED test -> revise -> restart focused gates
       no  -> full suite -> Figma parity audit -> verified
```

Every correction-replay finding is promoted to a reproducible test before implementation changes. This prevents a reviewer from repeatedly reporting the same class of defect in prose without teaching the pipeline how to catch it.

## Required evidence per window

- immutable reference identity and crop geometry;
- component manifest with stable IDs and edit authority;
- Qwen Image 3 Pro request artifacts for every required Render Pass;
- transparent asset edge-ring and move-over-contrast evidence;
- idle, pointer-down, pointer-up, settled, reversal, cancel, minimize, restore, and extreme-drag checkpoints where applicable;
- enabled-control inventory and `elementFromPoint` hit ownership;
- local visual comparisons rather than only a whole-window score;
- source-relative per-window comparisons that mask only donor-magenta pixels and retain original chrome, text, and semantic artwork;
- one-to-three-pixel corner evidence proving cleanup retained stepped window rounding instead of deleting the complete perimeter ring;
- runtime and Figma stable-ID, geometry, and reaction parity;
- correction-replay report listing every applicable prompt, evidence inspected, verdict, and promoted regression test.

## Status semantics

- `reconstruction`: components or behaviors are incomplete;
- `deterministic-pending`: implementation exists but deterministic evidence is incomplete;
- `replay-pending`: deterministic gates passed but correction replay has not;
- `revision-required`: correction replay found a defect and named the new regression test;
- `verified`: deterministic gates, correction replay, full suite, and Figma parity all pass.

Adding a new correction invalidates every existing `verified` window to which the prompt applies. Promotion back to `verified` requires a report containing that exact prompt ID and fresh browser and Figma evidence. Historical green status never waives a newly learned failure class.

The executable WSL prototype remains the interaction authority. Figma Design is the editable review and verification layer. Neither is allowed to infer the other's verdict.

## Executable promotion sequence

```bash
npm --prefix prototype run test:all:live
npm --prefix prototype run qa:promote
npm --prefix prototype test
```

`test:all:live` refreshes browser evidence, source-relative crops, the hosted
Figma structure audit, and the Figma/runtime screenshot comparison. Only after
that command is green does `qa:promote` write a versioned report for every
window and mark it `verified`. The final unit run proves that every verified
report contains every currently applicable correction prompt, including newly
added prompts that invalidate older reports.

The shared runtime manifest is captured from the browser rather than copied by
hand. It drives Figma asset placement, stable names, geometry, and hotspot
coverage. Figma review destinations must be committed in one MCP transaction
before a later transaction creates reactions to them; a destination created
and linked in the same transaction is not a reliable hosted-file contract.
