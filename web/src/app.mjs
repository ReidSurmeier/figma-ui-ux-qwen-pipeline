import {
  createSwingState,
  getSwingPhase,
  reduceSwing,
} from "./swing-machine.mjs";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const root = document.querySelector(".golfstudio");
const club = document.querySelector("#motion-club");
const timeline = document.querySelector("#timeline");
const sceneHeading = document.querySelector("#scene-heading");
const sceneSubheading = document.querySelector("#scene-subheading");
const phaseLabel = document.querySelector("#phase-label");
const metricSpeed = document.querySelector("#metric-speed");
const metricFace = document.querySelector("#metric-face");
const metricPath = document.querySelector("#metric-path");
const phaseStatus = document.querySelector("#phase-status");
const statusSummary = document.querySelector("#status-summary");
const clubSelect = document.querySelector("#club-select");

let state = createSwingState();
let timer = null;

function currentClub() {
  return clubSelect.value;
}

function render() {
  const phase = getSwingPhase(state.phase);
  const clubName = currentClub();
  root.dataset.phase = phase.id;
  root.dataset.playing = String(state.playing);
  root.style.setProperty("--phase-duration", reducedMotion.matches ? "0ms" : `${phase.duration}ms`);
  club.style.left = `${phase.x}px`;
  club.style.top = `${phase.y}px`;
  club.style.transform = `rotate(${phase.angle}deg)`;
  club.alt = `Animated ${clubName} in ${phase.label}`;

  sceneHeading.textContent = `SWING PLANE / ${phase.label.toUpperCase()}`;
  sceneSubheading.textContent = `${clubName.toUpperCase()}  •  ${phase.face.toUpperCase()} FACE  •  ${phase.path.toUpperCase()} PATH`;
  phaseLabel.textContent = phase.label.toUpperCase();
  metricSpeed.textContent = phase.speed;
  metricFace.textContent = phase.face;
  metricPath.textContent = phase.path;
  phaseStatus.textContent = phase.status;
  statusSummary.textContent = `${phase.label}  |  ${phase.progress}%  |  ${state.playing ? "Playing" : phase.id === "follow-through" ? "Complete" : "Ready"}  |  ${clubName}`;
  timeline.value = String(phase.progress);
  timeline.style.setProperty("--timeline-progress", `${phase.progress}%`);

  for (const button of document.querySelectorAll('[data-action="PLAY"]')) {
    button.setAttribute("aria-pressed", String(state.playing));
  }
}

function schedule(delay) {
  clearTimeout(timer);
  if (!state.playing) return;
  timer = window.setTimeout(() => dispatch({ type: "TICK" }), reducedMotion.matches ? 0 : delay);
}

function dispatch(action) {
  clearTimeout(timer);
  state = reduceSwing(state, action);
  render();
  if (!state.playing) return;
  const phase = getSwingPhase(state.phase);
  schedule(action.type === "PLAY" ? 40 : phase.duration);
}

for (const button of document.querySelectorAll("[data-action]")) {
  button.addEventListener("click", () => dispatch({ type: button.dataset.action }));
}

timeline.addEventListener("input", () => {
  dispatch({ type: "SEEK", progress: Number(timeline.value) });
});

clubSelect.addEventListener("change", render);

for (const tab of document.querySelectorAll("[data-tab]")) {
  tab.addEventListener("click", () => {
    for (const candidate of document.querySelectorAll("[data-tab]")) {
      candidate.setAttribute("aria-selected", String(candidate === tab));
    }
    for (const panel of document.querySelectorAll("[data-panel]")) {
      panel.hidden = panel.dataset.panel !== tab.dataset.tab;
    }
  });
}

window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
  if (event.code === "Space") {
    event.preventDefault();
    dispatch({ type: state.playing ? "PAUSE" : "PLAY" });
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    dispatch({ type: "PREVIOUS" });
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    dispatch({ type: "NEXT" });
  }
});

reducedMotion.addEventListener("change", render);
render();
