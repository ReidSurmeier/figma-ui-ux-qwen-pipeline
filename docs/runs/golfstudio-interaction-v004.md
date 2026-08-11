# GolfStudio tested interactions v004

## Outcome

v004 replaces the slow tweened behavior and static prototype states with a
test-first control contract. The browser now has a real Chrome gesture test,
and the standalone Figma file has a new 22-variant tested component set and a
26-state reachable prototype flow.

Figma file: <https://www.figma.com/design/LY8R5xSUKGJJ6UEEuCpzPJ>

- Prototype page: `03 Prototype` (`5:3`)
- Flow start: `V004 / Default` (`7:2`)
- Component set: `GolfStudio / Tested Interaction View V004` (`18:27`)
- File menu: `19:3`; simulated Open dialog: `19:5`
- Scale menu: `19:7`; 200 percent: `19:9`
- Club menu: `19:11`; putter: `19:13`; driver: `19:15`
- Rotation low/reference/high: `19:17`, `19:19`, `19:21`
- Parameter reference, loft low/high, tempo low/high: `19:23` through `19:31`
- Playing address/backswing/impact and paused finish: `19:33` through `19:39`

## Acceptance evidence

| Contract | Browser | Figma |
| --- | --- | --- |
| File menu and Open | PASS: click opens menu and emits a file-chooser event | SIMULATED: File to Open dialog to OK |
| Scale list and 200 percent | PASS: pointer focus plus Arrow Down and Enter changes zoom | PASS structurally and by focused screenshot readback |
| Putter and driver selection | PASS: menu selection changes state and title | PASS structurally and by state readback |
| Rotation, loft, and tempo | PASS: real pointer drags and range keyboard step | PASS for discrete low/reference/high track clicks; continuous drag belongs to browser |
| Animate and Stop | PASS: visible frames advance, Stop freezes, replay works | PASS structurally: three timed frames, Stop on every playing frame, instant transitions |
| UI remains usable while playing | PASS: Parts tab changes during playback | PASS structurally: File and tabs exist on every playing frame |
| Figma Present operation | N/A | UNAVAILABLE: Orca browser tab opened, but its CDP bridge timed out repeatedly |

The Figma structural audit found 26 active frames, 203 valid destination edges,
three `AFTER_TIMEOUT` triggers, zero missing destinations, zero self-navigation,
zero unreachable required states, and 203 transitions with type `NONE`.

Focused Figma exports match the captured browser source within 0 to 639 changed
pixels of 191,022, depending on Figma image re-encoding. The Open dialog is an
exact pixel match. Evidence is under `artifacts/figma/v004/`.

## Test commands

```bash
npm --prefix web test
pytest -q
python3 /home/reidsurmeier/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/golfstudio-interaction-qa
git diff --check
```
