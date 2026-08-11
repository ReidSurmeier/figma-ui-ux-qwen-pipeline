# Classic Win32 behavior contract

Use these rules for the GolfStudio Windows 95/98 visual language.

- Menus, tabs, combo-box selection, and property changes switch immediately. Do not tween between application states.
- A trackbar sends `TB_THUMBTRACK` while the user drags and is normally used for live feedback. Update the value and affected graphic during tracking, not only on release.
- A combo box opens a real list, closes on committed selection, and distinguishes cancel from selection.
- An animation plays in the background while the UI thread continues. It can be stopped at any time, and the last displayed frame remains visible.
- Use timer-driven discrete frames for the golf swing. Keep the play/stop command and unrelated menus enabled.
- Use classic square controls: sunken track/channel, raised rectangular thumb, outset buttons, inset fields, and no rounded modern accent thumb.

Primary references:

- Microsoft Win32 trackbar notifications: https://learn.microsoft.com/en-us/windows/win32/controls/wm-hscroll--trackbar-
- Microsoft Win32 combo-box behavior: https://learn.microsoft.com/en-us/windows/win32/controls/about-combo-boxes
- Microsoft Win32 animation control reference: https://learn.microsoft.com/en-us/windows/win32/controls/animation-control-reference
- Figma interactive components: https://help.figma.com/hc/en-us/articles/360061175334-Create-interactive-components-with-variants
- Figma prototype testing: https://help.figma.com/hc/en-us/articles/360040318013-Play-your-prototypes
