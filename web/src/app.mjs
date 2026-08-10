import { createSwingState, getSwingPhase, reduceSwing } from "./swing-machine.mjs";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const root = document.querySelector(".golfstudio");
const timeline = document.querySelector("#timeline");
const readoutPhase = document.querySelector("#readout-phase");
const readoutProgress = document.querySelector("#readout-progress");
const readoutSpeed = document.querySelector("#readout-speed");
const liveStatus = document.querySelector("#live-status");
const query = new URLSearchParams(window.location.search);
const staticCapture = query.get("static") === "1";

let state = query.has("phase")
  ? { phase: getSwingPhase(query.get("phase")).id, playing: false }
  : createSwingState();
let timer = null;

function render() {
  const phase = getSwingPhase(state.phase);
  const nativeBaseline = phase.id === "address" && !state.playing;

  root.dataset.phase = phase.id;
  root.dataset.playing = String(state.playing);
  root.dataset.nativeBaseline = String(nativeBaseline);
  root.style.setProperty("--club-angle", `${phase.angle}deg`);
  root.style.setProperty("--club-x", `${phase.x}px`);
  root.style.setProperty("--club-y", `${phase.y}px`);
  root.style.setProperty("--phase-duration", reducedMotion.matches || staticCapture ? "0ms" : `${phase.duration}ms`);
  root.style.setProperty("--timeline-x", `${phase.progress * 2.63}px`);

  timeline.value = String(phase.progress);
  readoutPhase.textContent = phase.label;
  readoutProgress.textContent = `${phase.progress}%`;
  readoutSpeed.textContent = phase.speed;
  liveStatus.textContent = `${phase.label}, ${phase.progress} percent, ${state.playing ? "playing" : "ready"}.`;

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
  schedule(action.type === "PLAY" ? 80 : phase.duration);
}

for (const button of document.querySelectorAll("[data-action]")) {
  button.addEventListener("click", () => dispatch({ type: button.dataset.action }));
}

timeline.addEventListener("input", () => {
  dispatch({ type: "SEEK", progress: Number(timeline.value) });
});

for (const tab of document.querySelectorAll("[data-tab]")) {
  tab.addEventListener("click", () => {
    for (const candidate of document.querySelectorAll("[data-tab]")) {
      candidate.setAttribute("aria-pressed", String(candidate === tab));
    }
    liveStatus.textContent = `${tab.dataset.tab} tab selected.`;
  });
}

window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement) return;
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
