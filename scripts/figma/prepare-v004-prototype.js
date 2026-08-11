const page = figma.root.children.find((node) => node.id === "5:3" || node.name === "03 Prototype");
await figma.setCurrentPageAsync(page);

const defaultFrame = await figma.getNodeByIdAsync("7:2");
const defaultComponent = await figma.getNodeByIdAsync("18:5");
for (const child of [...defaultFrame.children]) child.remove();
const defaultInstance = defaultComponent.createInstance();
defaultFrame.appendChild(defaultInstance);
defaultFrame.name = "V004 / Default";
defaultFrame.setSharedPluginData("golfstudio.pipeline", "state", "Default");

const archivedNodeIds = [];
for (const id of ["7:4", "7:6", "7:8", "7:10", "7:20"]) {
  const frame = await figma.getNodeByIdAsync(id);
  frame.name = `Legacy / ${frame.name}`;
  frame.y += 7000;
  archivedNodeIds.push(frame.id);
}

const reused = [
  ["7:12", "Parts", 1800, 2080],
  ["7:14", "About", 2400, 2080],
  ["7:16", "Minimized", 3000, 2080],
  ["7:18", "Presentation", 3600, 2080],
];
const reusedNodeIds = [];
for (const [id, state, x, y] of reused) {
  const frame = await figma.getNodeByIdAsync(id);
  for (const child of [...frame.children].slice(1)) child.remove();
  frame.name = `V004 / ${state}`;
  frame.x = x;
  frame.y = y;
  frame.setSharedPluginData("golfstudio.pipeline", "state", state);
  reusedNodeIds.push(frame.id);
}

return {
  createdNodeIds: [defaultInstance.id],
  mutatedNodeIds: [defaultFrame.id, ...archivedNodeIds, ...reusedNodeIds],
  defaultFrameId: defaultFrame.id,
  archivedNodeIds,
  reusedNodeIds,
};
