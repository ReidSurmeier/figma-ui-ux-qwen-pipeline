# GolfStudio tested interactions v004

## Outcome

v004 replaces the slow tweened behavior and static prototype states with a
test-first control contract. The browser now has 21 Playwright interaction
tests plus 10 state-model tests, and the standalone Figma file has a 22-variant
tested component set and a 26-state reachable prototype flow.

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
| File menu and Open | PASS: click opens the native chooser and closes the menu; reset, save, and Escape are covered | SIMULATED: File to Open dialog to OK |
| Scale list and 200 percent | PASS: pointer and keyboard selection both commit; Escape cancels | PASS structurally and by focused screenshot readback |
| Putter and driver selection | PASS: menu selection changes state and title; all 11 clubs are covered | PASS structurally and by state readback |
| Rotation, loft, and tempo | PASS: pointer drags, keyboard steps, independent values, and immediate updates | PASS for discrete low/reference/high track clicks; continuous drag belongs to browser |
| Animate and Stop | PASS: visible frames advance, Stop freezes, replay works | PASS structurally: three timed frames, Stop on every playing frame, instant transitions |
| UI remains usable while playing | PASS: File and Parts controls remain usable during playback | PASS structurally: File and tabs exist on every playing frame |
| Figma Present operation | N/A | UNAVAILABLE: the HTTPS origin is registered and `LOGIN_SCREEN_SHOWN` is observed, but the dedicated QA browser profile is not authenticated for the private file |

The live Figma structural audit found 26 active frames, 203 valid destination
edges, three `AFTER_TIMEOUT` triggers, zero missing destinations, zero
self-navigation, zero unreachable required states, and 203 transitions with
type `NONE`. Runtime operation is reported as unavailable, not passed; no
sharing settings or authentication state were changed to manufacture a pass.

## Embed API runtime gate

The credential-free harness is deployed at
<https://reidsurmeier.github.io/qwen-image-ui-pipeline/embed-qa/>. GitHub Pages
is configured for HTTPS and the deployed `harness.mjs` checksum matches the
committed file. The Figma OAuth app must list this exact allowed origin:

```text
https://reidsurmeier.github.io
```

The origin has no repository path and no trailing slash. The harness reads the
public Embed API client ID from browser session storage, never from committed
source or the page URL. `LOGIN_SCREEN_SHOWN` becomes `AUTH_REQUIRED`; it cannot
be counted as interaction evidence.

Run the gate through Bitwarden's host-encrypted injection path:

```bash
/home/reidsurmeier/.codex/skills/access-bitwarden-secrets/scripts/stored_bws.sh \
  run 'Figma Embed API' FIGMA_EMBED_API -- \
  node web/scripts/figma-embed-runtime-qa.mjs --timeout-ms 30000
```

Exit `0` means `READY`, exit `2` means the origin works but browser
authentication is required, exit `3` means the origin or Embed event surface
remains unavailable, and exit `4` is a runner error. After the allowed origin
was saved on 2026-08-11, the live result was exit `2`: `AUTH_REQUIRED` with one
observed `LOGIN_SCREEN_SHOWN` event. This confirms the origin, Embed client ID,
and event channel are working. The result remains `UNAVAILABLE` until the
dedicated browser profile is logged into Figma and the runner emits
`INITIAL_LOAD`.

For the one-time authenticated profile setup, run the same command with
`--headed --timeout-ms 300000`, log into Figma inside the opened embed, then
rerun headless. The profile is stored outside Git under
`~/.local/state/golfstudio-embed-qa/chrome-profile`.

The red-green browser work also caught and fixed three real defects: Open left
its menu expanded, timeline Arrow Right could remain stuck on Impact, and the
Layout menu rendered `Library` instead of `Club library`. Four redundant,
non-interactive transport hotspots were removed from the accessibility tree.

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
