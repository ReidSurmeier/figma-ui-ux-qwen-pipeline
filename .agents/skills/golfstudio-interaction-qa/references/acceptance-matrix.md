# GolfStudio acceptance matrix

Run in priority order. Browser means the engineered application. Figma means the standalone project file in Present mode.

## P0 release blockers

| ID | Control | Browser gesture and assertion | Figma gesture and assertion |
|---|---|---|---|
| P0-01 | File menu | Click File; menu is visible. New resets. Open emits a file-chooser event. Save emits a JSON download. Escape closes. | Click File; menu opens instantly. Each demonstrated command has a distinct response. Native chooser is `SIMULATED`. |
| P0-02 | Scale combo | Click arrow; 64, 100, 128, 200, and 256 percent are visible. Select 200; canvas and label update. Escape cancels. | Click scale field; classic option list opens. Select 200; view changes immediately. |
| P0-03 | Club selection | Open Club and select putter, then driver. Title and selected list row update after each selection. | Open Club and select putter. Selected state is visibly distinct and can return to Club menu. |
| P0-04 | Rotation slider | Drag thumb left and right; value, meter, and club angle track during drag. Arrow keys change one step. | Drag or click discrete track positions; thumb, label, and club angle change with no easing. |
| P0-05 | Loft and tempo | Drag each slider independently; labels update and the other value remains stable. | Each control exposes at least low, reference, and high states with period-correct trackbar styling. |
| P0-06 | Animate/Stop | Click Animate; at least two frames become visible. Click Stop; frame freezes. Other tabs and menus remain operable while playing. Replay works. | Click Animate; sequence advances discretely. Animate becomes Stop and remains clickable. Stop returns to an interactive paused frame. |
| P0-07 | Timeline | Click and drag across the graph; phase and club frame update while tracking. Keyboard arrows work. | Click representative positions and reach address, backswing, impact, and follow-through states. |
| P0-08 | No blocking | While animation runs, open File and change a panel. Neither action waits for animation completion. | While playing, Stop and at least one navigation control remain active. |

## P1 completeness and fidelity

| ID | Area | Assertion |
|---|---|---|
| P1-01 | Menu model | Only one menu is open. Switching headings is immediate. Clicking outside or Escape closes it. |
| P1-02 | Keyboard | Space toggles play/pause outside form controls; arrows step; F11/Escape enter and exit presentation. |
| P1-03 | Window controls | Minimize, restore, maximize, close confirmation, and reopen are recoverable. |
| P1-04 | Parts selects | Head, shaft, and grip lists open and retain independent selections. |
| P1-05 | Library scrollbar | Dragging or keyboard movement exposes all 11 clubs without moving the surrounding chrome. |
| P1-06 | Classic style | Trackbars use a sunken channel and rectangular raised thumb; combo boxes and menus use square classic borders; no modern rounded blue slider thumb. |
| P1-07 | Timing | Menu/tab/value changes are immediate. Swing uses discrete timer-driven frames, not Smart Animate or long CSS transform interpolation. |
| P1-08 | Pixel contract | Default address view matches the approved 474×403 reference outside declared mutable regions. |
| P1-09 | Figma flow | Flow has a starting point, every destination exists, no self-navigation, and every P0 demonstrated control is reachable. |
| P1-10 | Evidence | Record automated assertions, Present-mode observations, focused screenshots, and unavailable coverage separately. |
