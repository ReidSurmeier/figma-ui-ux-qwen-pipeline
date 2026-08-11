const page = figma.root.children.find((node) => node.id === "5:3" || node.name === "03 Prototype");
await figma.setCurrentPageAsync(page);

const frames = page.children.filter((node) =>
  node.type === "FRAME"
  && node.getSharedPluginData("golfstudio.pipeline", "state")
);
const byId = new Map(frames.map((frame) => [frame.id, frame]));
const byState = new Map(frames.map((frame) => [frame.getSharedPluginData("golfstudio.pipeline", "state"), frame]));
const edges = [];
const transitions = new Map();
const triggers = new Map();
const selfNavigation = [];
const missingDestinations = [];

for (const frame of frames) {
  for (const node of [frame, ...frame.findAll(() => true)]) {
    if (!("reactions" in node)) continue;
    for (const reaction of node.reactions) {
      triggers.set(reaction.trigger?.type ?? "NONE", (triggers.get(reaction.trigger?.type ?? "NONE") ?? 0) + 1);
      for (const action of reaction.actions ?? []) {
        if (action.type !== "NODE") continue;
        edges.push({ source: frame.id, sourceState: frame.getSharedPluginData("golfstudio.pipeline", "state"), node: node.id, destination: action.destinationId, trigger: reaction.trigger?.type });
        const transition = action.transition?.type ?? "NONE";
        transitions.set(transition, (transitions.get(transition) ?? 0) + 1);
        if (action.destinationId === frame.id) selfNavigation.push({ frame: frame.id, node: node.id });
        if (!byId.has(action.destinationId)) missingDestinations.push({ frame: frame.id, node: node.id, destination: action.destinationId });
      }
    }
  }
}

const reachable = new Set(["7:2"]);
let changed = true;
while (changed) {
  changed = false;
  for (const edge of edges) {
    if (reachable.has(edge.source) && !reachable.has(edge.destination)) {
      reachable.add(edge.destination);
      changed = true;
    }
  }
}

const required = [
  "Default", "File menu", "File dialog simulated", "Scale menu", "Zoom 200", "Club menu", "Putter", "Driver",
  "Rotation low", "Rotation reference", "Rotation high", "Parameters reference", "Loft low", "Loft high", "Tempo low", "Tempo high",
  "Parts", "About", "Minimized", "Presentation", "Playing address", "Playing backswing", "Playing impact", "Finish paused", "Backswing paused", "Impact paused",
];
const sliderStates = required.filter((state) => /Rotation|Parameters|Loft|Tempo/.test(state));
const playingStates = ["Playing address", "Playing backswing", "Playing impact"];

return {
  page: { id: page.id, flowStartingPoints: page.flowStartingPoints },
  activeFrameCount: frames.length,
  stateIds: Object.fromEntries([...byState].map(([state, frame]) => [state, frame.id])),
  missingRequiredStates: required.filter((state) => !byState.has(state)),
  unreachableRequiredStates: required.filter((state) => byState.has(state) && !reachable.has(byState.get(state).id)),
  reactionCount: edges.length,
  triggers: Object.fromEntries(triggers),
  transitions: Object.fromEntries(transitions),
  selfNavigation,
  missingDestinations,
  sliderReactionCounts: Object.fromEntries(sliderStates.map((state) => [state, byState.get(state)?.findAll((node) => "reactions" in node && node.reactions.length > 0).length ?? 0])),
  playingContracts: Object.fromEntries(playingStates.map((state) => {
    const frame = byState.get(state);
    return [state, {
      afterTimeout: frame?.reactions.some((reaction) => reaction.trigger?.type === "AFTER_TIMEOUT") ?? false,
      stopHotspot: frame?.findAll((node) => node.name.includes("Stop at") && "reactions" in node && node.reactions.length > 0).length ?? 0,
      fileHotspot: frame?.findAll((node) => node.name === "QA Hotspot / File menu" && "reactions" in node && node.reactions.length > 0).length ?? 0,
    }];
  })),
};
