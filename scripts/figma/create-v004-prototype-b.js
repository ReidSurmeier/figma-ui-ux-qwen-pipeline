const page = figma.root.children.find((node) => node.id === "5:3" || node.name === "03 Prototype");
await figma.setCurrentPageAsync(page);

const states = [
  ["Rotation low", "18:13"],
  ["Rotation reference", "18:14"],
  ["Rotation high", "18:15"],
  ["Parameters reference", "18:16"],
  ["Loft low", "18:17"],
  ["Loft high", "18:18"],
  ["Tempo low", "18:19"],
  ["Tempo high", "18:20"],
];
const createdNodeIds = [];
const frames = [];
for (const [index, [state, componentId]] of states.entries()) {
  const component = await figma.getNodeByIdAsync(componentId);
  const frame = figma.createFrame();
  frame.name = `V004 / ${state}`;
  frame.resize(474, 403);
  frame.x = (index % 4) * 600;
  frame.y = 1560 + Math.floor(index / 4) * 520;
  frame.clipsContent = true;
  frame.fills = [];
  frame.setSharedPluginData("golfstudio.pipeline", "state", state);
  const instance = component.createInstance();
  frame.appendChild(instance);
  createdNodeIds.push(frame.id, instance.id);
  frames.push({ state, frameId: frame.id, instanceId: instance.id });
}
return { createdNodeIds, frames };
