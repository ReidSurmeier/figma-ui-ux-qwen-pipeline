const page = figma.root.children.find((node) => node.id === "5:3" || node.name === "03 Prototype");
await figma.setCurrentPageAsync(page);

const states = [
  ["File menu", "18:6"],
  ["File dialog simulated", "18:7"],
  ["Scale menu", "18:8"],
  ["Zoom 200", "18:9"],
  ["Club menu", "18:10"],
  ["Putter", "18:11"],
  ["Driver", "18:12"],
];
const createdNodeIds = [];
const frames = [];
for (const [index, [state, componentId]] of states.entries()) {
  const component = await figma.getNodeByIdAsync(componentId);
  const frame = figma.createFrame();
  frame.name = `V004 / ${state}`;
  frame.resize(474, 403);
  frame.x = (index % 4) * 600;
  frame.y = 520 + Math.floor(index / 4) * 520;
  frame.clipsContent = true;
  frame.fills = [];
  frame.setSharedPluginData("golfstudio.pipeline", "state", state);
  const instance = component.createInstance();
  frame.appendChild(instance);
  createdNodeIds.push(frame.id, instance.id);
  frames.push({ state, frameId: frame.id, instanceId: instance.id });
}
return { createdNodeIds, frames };
