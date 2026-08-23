# Japanese RPG BGM fidelity gate v001

Date: 2026-08-23

## Outcome

The BGM and Effect controls are now the executable quality benchmark. The
benchmark passes against the exact Tailscale review runtime at
`http://100.103.164.128:4175/`. All fourteen sibling windows fail closed and
remain `revision-required`.

This is intentional. The older suite still reports 110 browser tests, 54 unit
tests, source contracts, and masked visual checks green. Those results no
longer have enough authority to promote a window.

## New evidence

- `artifacts/qa/bgm-fidelity-gate-v001/report.json`
- `artifacts/qa/bgm-fidelity-gate-v001/full.png`
- `artifacts/qa/runtime-component-manifest.json`

The report uses the immutable 849 by 564 source authority and records the
runtime URL plus source and capture hashes. It checks raw window-relative
visual error, high-error pixel rate, largest connected local defect, resolved
visual ownership, visible hit-surface mapping, visual/control geometry, and
benchmark-grade reversible interaction authority.

## First benchmark correction

The initial full-surface scan found that the BGM and Effect left-arrow controls
overlapped their semantic range inputs by three pixels. Center-click tests had
never sampled the overlap. The visual 143-pixel source track is now an
independent, pointer-transparent component while the semantic slider hitbox
starts after the arrow and ends before the right arrow. The visible artwork and
exact thumb endpoints did not move.

## Current failure routing

- source-relative plus large local visual defects: Basic Info, Status,
  Inventory, Game Menu, Compact Info, Party, Quickbar, and Notification;
- large local visual defects: Card, Skills, Equipment, Chat, and Exchange;
- incomplete visual ownership: Basic Info, Card, Skills, Status, Inventory,
  Equipment, and Party;
- full-surface hit-map failure: Inventory;
- visual/control geometry mismatch: Chat;
- benchmark interaction replay still pending: every sibling, including Bottom
  Bar even though its resting pixels are already within the visual threshold.

The next reconstruction loop should take one sibling at a time through these
named failures. A window is not promoted merely because a legacy test is green.

## Verification

```text
Vitest:                 54 passed
Playwright:            110 passed
Build:                  passed
Legacy source contracts passed
Legacy masked visuals:  passed
BGM benchmark:           Options passed; 14 siblings revision-required
Tailscale gate exit:     1, as required while siblings remain below benchmark
```
