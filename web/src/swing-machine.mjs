export const SWING_PHASES = Object.freeze([
  Object.freeze({
    id: "address",
    label: "Address",
    progress: 0,
    angle: 0,
    x: 0,
    y: 0,
    duration: 80,
    speed: "0 mph",
    face: "Square",
    path: "Neutral",
    status: "Ready at address. Press Play to begin the Swing Sequence.",
  }),
  Object.freeze({
    id: "backswing",
    label: "Backswing",
    progress: 32,
    angle: -24,
    x: -7,
    y: -4,
    duration: 180,
    speed: "42 mph",
    face: "2° closed",
    path: "4° inside",
    status: "Loading the backswing while the club head stays on plane.",
  }),
  Object.freeze({
    id: "impact",
    label: "Impact",
    progress: 58,
    angle: 6,
    x: 2,
    y: 0,
    duration: 90,
    speed: "96 mph",
    face: "Square",
    path: "1° inside",
    status: "Impact: maximum club-head speed with a square face.",
  }),
  Object.freeze({
    id: "follow-through",
    label: "Follow-through",
    progress: 100,
    angle: 32,
    x: 12,
    y: -8,
    duration: 220,
    speed: "28 mph",
    face: "Released",
    path: "8° left",
    status: "Balanced finish. Reset or drag the timeline to review.",
  }),
]);

const phaseIndex = new Map(SWING_PHASES.map((phase, index) => [phase.id, index]));

export function createSwingState() {
  return { phase: SWING_PHASES[0].id, playing: false };
}

export function getSwingPhase(id) {
  return SWING_PHASES[phaseIndex.get(id) ?? 0];
}

export function selectPhaseForProgress(progress) {
  const normalized = Math.max(0, Math.min(100, Number(progress) || 0));
  return SWING_PHASES.reduce((closest, phase) =>
    Math.abs(phase.progress - normalized) < Math.abs(closest.progress - normalized)
      ? phase
      : closest,
  );
}

export function reduceSwing(state, action) {
  const currentIndex = phaseIndex.get(state.phase) ?? 0;
  const lastIndex = SWING_PHASES.length - 1;

  switch (action.type) {
    case "PLAY":
      return currentIndex === lastIndex
        ? { phase: SWING_PHASES[0].id, playing: true }
        : { ...state, playing: true };
    case "PAUSE":
      return { ...state, playing: false };
    case "TICK": {
      const nextIndex = Math.min(lastIndex, currentIndex + 1);
      return {
        phase: SWING_PHASES[nextIndex].id,
        playing: state.playing && nextIndex < lastIndex,
      };
    }
    case "NEXT":
      return { phase: SWING_PHASES[Math.min(lastIndex, currentIndex + 1)].id, playing: false };
    case "PREVIOUS":
      return { phase: SWING_PHASES[Math.max(0, currentIndex - 1)].id, playing: false };
    case "RESET":
      return createSwingState();
    case "SEEK":
      return { phase: selectPhaseForProgress(action.progress).id, playing: false };
    default:
      return state;
  }
}
