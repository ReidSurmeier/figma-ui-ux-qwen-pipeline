const page = figma.root.children.find((node) => node.id === "5:3" || node.name === "03 Prototype");
await figma.setCurrentPageAsync(page);

const states = [
  ["Playing address", "18:21"],
  ["Playing backswing", "18:22"],
  ["Playing impact", "18:23"],
  ["Finish paused", "18:24"],
  ["Backswing paused", "18:25"],
  ["Impact paused", "18:26"],
];
const createdNodeIds = [];
const frames = [];
for (const [index, [state, componentId]] of states.entries()) {
  const component = await figma.getNodeByIdAsync(componentId);
  const frame = figma.createFrame();
  frame.name = `V004 / ${state}`;
  frame.resize(474, 403);
  frame.x = (index % 4) * 600;
  frame.y = 2600 + Math.floor(index / 4) * 520;
  frame.clipsContent = true;
  frame.fills = [];
  frame.setSharedPluginData("golfstudio.pipeline", "state", state);
  const instance = component.createInstance();
  frame.appendChild(instance);
  createdNodeIds.push(frame.id, instance.id);
  frames.push({ state, frameId: frame.id, instanceId: instance.id });
}
return { createdNodeIds, frames };
