import { createSwingState, getSwingPhase, reduceSwing } from "./swing-machine.mjs";
import { CLUBS, createUIState, reduceUI } from "./ui-machine.mjs";

if (window.__GOLFSTUDIO_APP_INITIALIZED__) {
  throw new Error("GolfStudio was initialized more than once.");
}
window.__GOLFSTUDIO_APP_INITIALIZED__ = true;

const systemReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const root = document.querySelector(".golfstudio");
const timeline = document.querySelector("#timeline");
const libraryScroll = document.querySelector("#library-scroll");
const libraryCopy = document.querySelector("#club-library-copy");
const libraryButtons = document.querySelector("#library-buttons");
const zoomSelect = document.querySelector("#zoom-select");
const ageInput = document.querySelector("#age-input");
const canvasControl = document.querySelector("#canvas-control");
const readoutPhase = document.querySelector("#readout-phase");
const readoutProgress = document.querySelector("#readout-progress");
const readoutSpeed = document.querySelector("#readout-speed");
const liveStatus = document.querySelector("#live-status");
const sessionFile = document.querySelector("#session-file");
const query = new URLSearchParams(window.location.search);
const staticCapture = query.get("static") === "1";

let swingState = query.has("phase")
  ? { phase: getSwingPhase(query.get("phase")).id, playing: query.get("playing") === "1" }
  : createSwingState();
let uiState = createUIState();
let uiHistory = [];
let timer = null;
let dragOrigin = null;

function applyQueryState() {
  if (query.has("ui")) uiState = reduceUI(uiState, { type: "SET_PANEL", panel: query.get("ui") });
  if (query.has("menu")) uiState = reduceUI(uiState, { type: "TOGGLE_MENU", menu: query.get("menu") });
  if (query.has("tool")) uiState = reduceUI(uiState, { type: "SET_TOOL", tool: query.get("tool") });
  if (query.has("zoom")) uiState = reduceUI(uiState, { type: "SET_ZOOM", zoom: query.get("zoom") });
  if (query.has("age")) uiState = reduceUI(uiState, { type: "SET_AGE", age: query.get("age") });
  if (query.has("club")) uiState = reduceUI(uiState, { type: "SELECT_CLUB", club: query.get("club") });
  for (const parameter of ["rotation", "loft", "tempo"]) {
    if (query.has(parameter)) {
      uiState = reduceUI(uiState, { type: "SET_PARAMETER", name: parameter, value: query.get(parameter) });
    }
  }
  if (query.has("window")) uiState = reduceUI(uiState, { type: "SET_WINDOW_MODE", mode: query.get("window") });
  if (query.has("dialog")) uiState = reduceUI(uiState, { type: "OPEN_DIALOG", dialog: query.get("dialog") });
}

function selectedClubIndex() {
  return Math.max(0, CLUBS.indexOf(uiState.club));
}

function renderLibrary() {
  const visible = CLUBS.slice(uiState.libraryStart, uiState.libraryStart + 7);
  libraryCopy.replaceChildren();
  libraryButtons.replaceChildren();

  visible.forEach((club, index) => {
    const copy = document.createElement("div");
    copy.className = `library-row${club === uiState.club ? " is-selected" : ""}`;
    copy.textContent = club;
    libraryCopy.append(copy);

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.club = club;
    button.style.top = `${index * 16}px`;
    button.setAttribute("aria-pressed", String(club === uiState.club));
    button.setAttribute("aria-label", `Select ${club}`);
    button.addEventListener("click", () => dispatchUI({ type: "SELECT_CLUB", club }));
    libraryButtons.append(button);
  });
}

function renderMenus() {
  const regionLabels = { library: "Club library", graph: "Analysis panel", toolbar: "Toolbar" };
  for (const heading of document.querySelectorAll("[data-menu]")) {
    heading.setAttribute("aria-expanded", String(heading.dataset.menu === uiState.openMenu));
  }
  for (const regionButton of document.querySelectorAll("[data-region]")) {
    const visible = uiState.visibleRegions[regionButton.dataset.region];
    regionButton.textContent = `${visible ? "✓" : "  "} ${regionLabels[regionButton.dataset.region]}`;
    regionButton.setAttribute("aria-checked", String(visible));
  }
  const motionButton = document.querySelector('[data-command="reduced-motion"]');
  motionButton.textContent = `${uiState.reducedMotion ? "✓" : "  "} Reduced motion`;
  motionButton.setAttribute("aria-checked", String(uiState.reducedMotion));
  for (const option of document.querySelectorAll("[data-zoom-option]")) {
    option.setAttribute("aria-selected", String(Number(option.dataset.zoomOption) === uiState.zoom));
  }
}

function renderDialog() {
  const backdrop = document.querySelector(".dialog-backdrop");
  const title = document.querySelector("#dialog-title");
  const body = document.querySelector("#dialog-body");
  const actions = document.querySelector("#dialog-actions");
  backdrop.setAttribute("aria-hidden", String(!uiState.dialog));
  body.replaceChildren();
  actions.replaceChildren();
  if (!uiState.dialog) return;

  const dialogCopy = {
    about: ["About GolfStudio", "GolfStudio 1.0\nReference-preserving swing visualizer."],
    controls: ["GolfStudio controls", "Menus, toolbar tools, zoom, club library, age spinner, graph timeline, and all four analysis tabs are interactive. Space plays; arrow keys step; F11 opens presentation."],
    close: ["Close GolfStudio", "Close the current GolfStudio session?"],
    "open-file": ["Open session", "Choose a GolfStudio JSON session file.\nSimulated in the Figma prototype; native in the browser build."],
  };
  const [heading, copy] = dialogCopy[uiState.dialog] || ["GolfStudio", ""];
  title.textContent = heading;
  const paragraph = document.createElement("p");
  paragraph.textContent = copy;
  body.append(paragraph);

  if (uiState.dialog === "close") {
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Close";
    close.addEventListener("click", () => dispatchUI({ type: "SET_WINDOW_MODE", mode: "closed" }));
    actions.append(close);
  }
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = uiState.dialog === "close" ? "Cancel" : "OK";
  cancel.addEventListener("click", () => dispatchUI({ type: "CLOSE_DIALOG" }));
  actions.append(cancel);
  queueMicrotask(() => actions.querySelector("button")?.focus());
}

function render() {
  const phase = getSwingPhase(swingState.phase);
  const canvasAtReference = uiState.zoom === 128 && uiState.viewOffset.x === 0 && uiState.viewOffset.y === 0;
  const nativeBaseline = phase.id === "address" && !swingState.playing && canvasAtReference && uiState.parameters.rotation === 0;
  const reduceMotion = systemReducedMotion.matches || uiState.reducedMotion || staticCapture;

  root.dataset.phase = phase.id;
  root.dataset.playing = String(swingState.playing);
  root.dataset.nativeBaseline = String(nativeBaseline);
  root.dataset.panel = uiState.panel;
  root.dataset.tool = uiState.tool;
  root.dataset.zoom = String(uiState.zoom);
  root.dataset.openMenu = uiState.openMenu || "none";
  root.dataset.windowMode = uiState.windowMode;
  root.dataset.dialog = uiState.dialog || "none";
  for (const [region, visible] of Object.entries(uiState.visibleRegions)) root.dataset[`show${region[0].toUpperCase()}${region.slice(1)}`] = String(visible);

  root.style.setProperty("--club-angle", `${phase.angle + uiState.parameters.rotation}deg`);
  root.style.setProperty("--club-x", `${phase.x}px`);
  root.style.setProperty("--club-y", `${phase.y}px`);
  root.style.setProperty("--phase-duration", "0ms");
  root.style.setProperty("--timeline-x", `${phase.progress * 2.63}px`);
  root.style.setProperty("--canvas-scale", String(uiState.zoom / 128));
  root.style.setProperty("--view-x", `${uiState.viewOffset.x}px`);
  root.style.setProperty("--view-y", `${uiState.viewOffset.y}px`);
  root.style.setProperty("--rotation-meter", `${(uiState.parameters.rotation + 45) / 90 * 100}%`);

  timeline.value = String(phase.progress);
  libraryScroll.value = String(uiState.libraryStart);
  zoomSelect.textContent = `${uiState.zoom}%`;
  document.querySelector("#zoom-readout").textContent = `${uiState.zoom}%`;
  ageInput.value = String(uiState.age);
  document.querySelector("#age-copy").textContent = String(uiState.age);
  document.querySelector("#graph-club-title").textContent = uiState.club;
  readoutPhase.textContent = phase.label;
  readoutProgress.textContent = `${phase.progress}%`;
  readoutSpeed.textContent = phase.speed;
  document.querySelector("#rotation-output").textContent = `${uiState.parameters.rotation}°`;
  document.querySelector("#loft-output").textContent = `${uiState.parameters.loft}°`;
  document.querySelector("#tempo-output").textContent = `${uiState.parameters.tempo} bpm`;
  document.querySelector("#rotation-slider").value = String(uiState.parameters.rotation);
  document.querySelector("#loft-slider").value = String(uiState.parameters.loft);
  document.querySelector("#tempo-slider").value = String(uiState.parameters.tempo);
  for (const select of document.querySelectorAll("[data-part]")) select.value = uiState.parts[select.dataset.part];

  for (const button of document.querySelectorAll('[data-action="PLAY"]')) {
    button.setAttribute("aria-pressed", String(swingState.playing));
    button.setAttribute("aria-label", swingState.playing ? "Stop swing" : "Animate swing");
  }
  for (const button of document.querySelectorAll("button[data-tool]")) button.setAttribute("aria-pressed", String(button.dataset.tool === uiState.tool));
  for (const tab of document.querySelectorAll("[data-tab]")) tab.setAttribute("aria-pressed", String(tab.dataset.tab === uiState.panel));

  renderLibrary();
  renderMenus();
  renderDialog();
  liveStatus.textContent = `${uiState.club}, ${uiState.panel} view, ${phase.label}, ${phase.progress} percent, ${swingState.playing ? "playing" : "ready"}.`;
}

function schedule(delay) {
  clearTimeout(timer);
  if (!swingState.playing) return;
  timer = window.setTimeout(() => dispatchSwing({ type: "TICK" }), systemReducedMotion.matches || uiState.reducedMotion ? 0 : delay);
}

function dispatchSwing(action) {
  clearTimeout(timer);
  swingState = reduceSwing(swingState, action);
  render();
  if (!swingState.playing) return;
  schedule(action.type === "PLAY" ? 80 : getSwingPhase(swingState.phase).duration);
}

function dispatchUI(action, { record = true } = {}) {
  if (record && !["TOGGLE_MENU", "CLOSE_DIALOG"].includes(action.type)) uiHistory.push(structuredClone(uiState));
  uiState = reduceUI(uiState, action);
  render();
}

function resetSession() {
  uiHistory.push(structuredClone(uiState));
  swingState = createSwingState();
  uiState = createUIState();
  render();
}

function saveSnapshot() {
  const payload = JSON.stringify({ version: 1, swing: swingState, ui: uiState }, null, 2);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  link.download = "golfstudio-session.json";
  link.click();
  URL.revokeObjectURL(link.href);
  dispatchUI({ type: "TOGGLE_MENU", menu: uiState.openMenu }, { record: false });
  liveStatus.textContent = "Session snapshot saved.";
}

function handleCommand(command) {
  switch (command) {
    case "new": resetSession(); break;
    case "open":
      dispatchUI({ type: "TOGGLE_MENU", menu: uiState.openMenu }, { record: false });
      sessionFile.click();
      break;
    case "save": saveSnapshot(); break;
    case "close": dispatchUI({ type: "OPEN_DIALOG", dialog: "close" }); break;
    case "undo": {
      const previous = uiHistory.pop();
      if (previous) uiState = previous;
      render();
      break;
    }
    case "reset-values": resetSession(); break;
    case "copy-metrics":
      navigator.clipboard?.writeText(`${uiState.club}: ${getSwingPhase(swingState.phase).label}, ${getSwingPhase(swingState.phase).speed}`);
      dispatchUI({ type: "TOGGLE_MENU", menu: uiState.openMenu }, { record: false });
      liveStatus.textContent = "Swing metrics copied.";
      break;
    case "reduced-motion": dispatchUI({ type: "TOGGLE_REDUCED_MOTION" }); break;
    case "fit": dispatchUI({ type: "SCALE_TO_FIT" }); break;
  }
}

for (const button of document.querySelectorAll("[data-action]")) {
  button.onclick = () => dispatchSwing({
    type: button.dataset.action === "PLAY" && swingState.playing ? "PAUSE" : button.dataset.action,
  });
}
for (const button of document.querySelectorAll("[data-menu]")) button.onclick = () => dispatchUI({ type: "TOGGLE_MENU", menu: button.dataset.menu }, { record: false });
for (const button of document.querySelectorAll("button[data-tool]")) button.onclick = () => dispatchUI({ type: "SET_TOOL", tool: button.dataset.tool });
for (const button of document.querySelectorAll("[data-tab]")) button.onclick = () => dispatchUI({ type: "SET_PANEL", panel: button.dataset.tab });
for (const button of document.querySelectorAll("[data-window]")) button.onclick = () => {
  const mode = button.dataset.window === "maximized" && uiState.windowMode === "maximized"
    ? "normal"
    : button.dataset.window;
  dispatchUI({ type: "SET_WINDOW_MODE", mode });
};
for (const button of document.querySelectorAll("[data-dialog]")) button.onclick = () => dispatchUI({ type: "OPEN_DIALOG", dialog: button.dataset.dialog });
for (const button of document.querySelectorAll("[data-command]")) button.onclick = () => handleCommand(button.dataset.command);
for (const button of document.querySelectorAll("[data-region]")) button.onclick = () => dispatchUI({ type: "TOGGLE_REGION", region: button.dataset.region });
for (const button of document.querySelectorAll("[data-age-step]")) button.onclick = () => dispatchUI({ type: "STEP_AGE", delta: button.dataset.ageStep });
for (const input of document.querySelectorAll("[data-parameter]")) input.addEventListener("input", () => dispatchUI({ type: "SET_PARAMETER", name: input.dataset.parameter, value: input.value }));
for (const select of document.querySelectorAll("[data-part]")) select.addEventListener("change", () => dispatchUI({ type: "SET_PART", name: select.dataset.part, value: select.value }));
for (const button of document.querySelectorAll("[data-zoom-option]")) {
  button.addEventListener("click", () => dispatchUI({ type: "SET_ZOOM", zoom: button.dataset.zoomOption }));
}

document.querySelector('[data-popup="club"]').replaceChildren(...CLUBS.map((club) => {
  const button = document.createElement("button");
  button.type = "button";
  button.role = "menuitemradio";
  button.textContent = club;
  button.addEventListener("click", () => dispatchUI({ type: "SELECT_CLUB", club }));
  return button;
}));

timeline.addEventListener("input", () => dispatchSwing({ type: "SEEK", progress: Number(timeline.value) }));
timeline.addEventListener("keydown", (event) => {
  const action = { ArrowLeft: "PREVIOUS", ArrowRight: "NEXT" }[event.key];
  if (!action) return;
  event.preventDefault();
  dispatchSwing({ type: action });
});
libraryScroll.addEventListener("input", () => dispatchUI({ type: "SCROLL_LIBRARY", start: libraryScroll.value }));
document.querySelector('[data-ui-action="SCALE_TO_FIT"]').addEventListener("click", () => dispatchUI({ type: "SCALE_TO_FIT" }));
ageInput.addEventListener("change", () => dispatchUI({ type: "SET_AGE", age: ageInput.value }));

canvasControl.addEventListener("click", (event) => {
  if (uiState.tool === "zoom") dispatchUI({ type: "SET_ZOOM", zoom: uiState.zoom >= 256 ? 128 : uiState.zoom + 64 });
  else if (uiState.tool === "rotate") dispatchUI({ type: "SET_PARAMETER", name: "rotation", value: uiState.parameters.rotation + 5 });
  else if (uiState.tool === "select") liveStatus.textContent = `${uiState.club} selected.`;
});
canvasControl.addEventListener("pointerdown", (event) => {
  if (uiState.tool !== "pan") return;
  dragOrigin = { pointerX: event.clientX, pointerY: event.clientY, ...uiState.viewOffset };
  canvasControl.setPointerCapture(event.pointerId);
});
canvasControl.addEventListener("pointermove", (event) => {
  if (!dragOrigin || uiState.tool !== "pan") return;
  dispatchUI({ type: "PAN_VIEW", x: dragOrigin.x + event.clientX - dragOrigin.pointerX, y: dragOrigin.y + event.clientY - dragOrigin.pointerY }, { record: false });
});
canvasControl.addEventListener("pointerup", () => { dragOrigin = null; });

sessionFile.addEventListener("change", async () => {
  const file = sessionFile.files?.[0];
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    if (payload.swing?.phase) swingState = { ...createSwingState(), ...payload.swing };
    if (payload.ui) uiState = { ...createUIState(), ...payload.ui };
    render();
    liveStatus.textContent = "Session loaded.";
  } catch {
    liveStatus.textContent = "That session file could not be opened.";
  }
  sessionFile.value = "";
});

document.addEventListener("pointerdown", (event) => {
  if (!uiState.openMenu || event.target.closest("[data-menu], .menu-popup")) return;
  dispatchUI({ type: "TOGGLE_MENU", menu: uiState.openMenu }, { record: false });
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (uiState.dialog) dispatchUI({ type: "CLOSE_DIALOG" });
    else if (uiState.openMenu) dispatchUI({ type: "TOGGLE_MENU", menu: uiState.openMenu }, { record: false });
    else if (uiState.windowMode === "presentation") dispatchUI({ type: "SET_WINDOW_MODE", mode: "normal" });
    return;
  }
  if (event.key === "F11") {
    event.preventDefault();
    dispatchUI({ type: "SET_WINDOW_MODE", mode: uiState.windowMode === "presentation" ? "normal" : "presentation" });
    return;
  }
  if (event.ctrlKey || event.metaKey) {
    const command = { n: "new", o: "open", s: "save", z: "undo" }[event.key.toLowerCase()];
    if (command) { event.preventDefault(); handleCommand(command); }
    return;
  }
  if (uiState.openMenu === "zoom" && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    event.preventDefault();
    const options = [...document.querySelectorAll('[data-popup="zoom"] [role="option"]')];
    const focused = options.indexOf(document.activeElement);
    const selected = options.findIndex((option) => option.getAttribute("aria-selected") === "true");
    let next = focused >= 0 ? focused : selected;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = options.length - 1;
    else if (event.key === "ArrowDown") next = Math.min(options.length - 1, next + 1);
    else next = Math.max(0, next - 1);
    options[next]?.focus();
    return;
  }
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
  if (event.code === "Space") {
    event.preventDefault();
    dispatchSwing({ type: swingState.playing ? "PAUSE" : "PLAY" });
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    dispatchSwing({ type: "PREVIOUS" });
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    dispatchSwing({ type: "NEXT" });
  }
});

systemReducedMotion.addEventListener("change", render);
window.__GOLFSTUDIO_UI__ = () => structuredClone({ swing: swingState, ui: uiState });
applyQueryState();
render();
