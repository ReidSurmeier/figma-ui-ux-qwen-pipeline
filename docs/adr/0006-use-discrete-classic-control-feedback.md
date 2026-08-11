# Use discrete classic control feedback

Status: accepted on 2026-08-11.

## Context

GolfStudio inherited the appearance of an early Windows desktop application,
but v003 used long linear CSS transforms and 200 ms Figma Smart Animate
transitions. Sliders, menu choices, and the club sprite therefore drifted
between states instead of responding like classic controls. Animate also had
no pointer-accessible Stop behavior.

The Windows trackbar contract sends `TB_THUMBTRACK` while the user drags the
thumb, specifically so the application can provide live feedback. A combo box
opens a list and commits one selected value. The animation control plays in the
background and may be stopped at any time; application code must not block the
UI thread while playback is active.

Primary references:

- <https://learn.microsoft.com/en-us/windows/win32/controls/wm-hscroll--trackbar->
- <https://learn.microsoft.com/en-us/windows/win32/controls/about-combo-boxes>
- <https://learn.microsoft.com/en-us/windows/win32/controls/animation-control-overview>
- <https://help.figma.com/hc/en-us/articles/360040035834-Prototype-triggers>

## Decision

Use immediate feedback for menus, tabs, combo selections, trackbar values, and
club selection. Swing playback is a four-frame timer sequence with 80, 180, 90,
and 220 ms holds; the club does not interpolate between frames.

The browser is authoritative for continuous range dragging, keyboard input,
native file selection, and non-blocking playback. Figma represents the same
observable states with instant prototype navigation and clickable low,
reference, and high track positions. Figma's Open dialog is explicitly marked
simulated.

Every interaction claim must be supported by the project-local
`golfstudio-interaction-qa` skill. Screenshots, reducer coverage, and reaction
counts are supporting evidence, not substitutes for gesture tests.

## Consequences

- Animate changes to Stop while playing and the same visible control pauses.
- Tabs and menus remain available while the swing sequence is running.
- Classic sliders use a sunken channel and rectangular raised thumb.
- Figma contains no Smart Animate transitions in the active v004 flow.
- Present-mode operation is reported separately from structural and visual
  Figma audits; unavailable browser automation is not recorded as a pass.
