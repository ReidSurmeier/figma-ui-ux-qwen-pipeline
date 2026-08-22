# Use Playwright and Figma Embed events for interaction QA

Status: superseded by ADR 0009 on 2026-08-22.

## Context

The v004 browser test used a hand-written Chrome DevTools pipe and asserted only a subset of controls. Figma validation counted reactions and inspected screenshots but did not operate the published flow. These checks allowed visibly broken controls, including a scale list that existed in the DOM but never opened, to be reported as working.

Human-research platforms such as Maze measure task success, misclicks, timing, and heat maps. They do not provide the deterministic fix-and-regression loop required for this Interactive Replica.

Primary references:

- <https://github.com/microsoft/playwright-mcp>
- <https://playwright.dev/docs/trace-viewer>
- <https://developers.figma.com/docs/rest-api/file-node-types/>
- <https://developers.figma.com/docs/embeds/embed-api/>
- <https://developers.figma.com/docs/embeds/security-access/>
- <https://help.figma.com/hc/en-us/articles/360041246514-Test-your-Figma-prototypes-with-Maze>

## Decision

Use the installed Playwright MCP for live gesture reproduction and replay. Use `@playwright/test` for durable browser assertions, isolated runs, and trace, screenshot, and video evidence. Replace the raw Chrome DevTools test driver rather than extending it.

Use Figma REST `interactions` as the structural prototype graph. Use Figma Embed API events as the observable prototype-state oracle when the file's sharing settings, OAuth client ID, and allowed embed origin permit the prototype to load. A login screen or unavailable allowed origin remains `UNAVAILABLE`; it is not replaced by a reaction count.

Apply a strict vertical loop to each failure: reproduce, add one failing test, fix, rerun the focused test, replay the live gesture, and rerun the full suite.

## Consequences

- Every visible control receives a stable executable contract rather than being inferred from appearance.
- Failed tests retain replayable traces and media.
- Browser behavior and Figma prototype behavior remain separate evidence surfaces.
- Maze may be used later for human usability research, but not as the regression gate.
