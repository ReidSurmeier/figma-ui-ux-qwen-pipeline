# GolfStudio interaction QA tooling research

Researched on 2026-08-11 against current vendor documentation.

| Tool | What it provides | Fit for this project |
| --- | --- | --- |
| Playwright MCP | Live browser control using the existing Playwright browser profile; click, drag, keyboard, upload, network, console, and screenshot tools | Selected for exploratory reproduction and exact post-fix replay |
| Playwright Test | Isolated end-to-end tests, resilient locators, assertions, tracing, screenshots, and video | Selected as the durable browser regression runner |
| Figma REST API | File nodes include prototype `interactions`, triggers, actions, and destinations | Selected to generate and audit the prototype interaction graph |
| Figma Embed API | Sends restart/navigation messages and emits load, mouse, presented-node, and component-state events | Selected as the Figma runtime oracle once access and allowed-origin requirements are satisfied |
| Maze / UserTesting | Human missions, success rate, misclick rate, time, heat maps, recordings, and qualitative feedback | Useful later for usability studies; not deterministic regression automation |
| Chrome DevTools MCP | Browser inspection and automation through Chrome DevTools | Valid fallback, but unnecessary for the app while Playwright MCP is working |

The installed Playwright MCP was verified against the GolfStudio application. The Figma prototype opened in the Playwright persistent profile but emitted a login surface because the profile is not authenticated for the private file. Figma's Embed API respects the file's sharing settings, so the runtime harness must record this as an access failure until the file is publicly viewable or the testing browser has an authenticated session.
