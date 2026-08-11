const page = figma.root.children.find((node) => node.id === "5:3" || node.name === "03 Prototype");
await figma.setCurrentPageAsync(page);
const frames = new Map(page.children.filter((node) => node.type === "FRAME").map((node) => [node.getSharedPluginData("golfstudio.pipeline", "state"), node]).filter(([state]) => state));
const action = (destination, drag = false) => ({
  type: "NODE",
  destinationId: destination.id,
  navigation: "NAVIGATE",
  transition: drag ? { type: "DISSOLVE", easing: { type: "LINEAR" }, duration: 0.01 } : null,
  resetScrollPosition: true,
});
async function sliderZone(frame, name, x, y, width, height, clickDestination) {
  if (clickDestination.id === frame.id) return null;
  const node = figma.createRectangle();
  node.name = `QA Slider / ${name}`;
  node.resize(width, height); node.x = x; node.y = y;
  node.fills = [{ type: "SOLID", color: { r: 1, g: 0, b: 1 }, opacity: 0.001 }];
  frame.appendChild(node);
  await node.setReactionsAsync([{ trigger: { type: "ON_CLICK" }, actions: [action(clickDestination)] }]);
  return node.id;
}
const createdNodeIds = [];
const rotationStates = ["Rotation low", "Rotation reference", "Rotation high"];
for (const state of rotationStates) {
  const frame = frames.get(state);
  createdNodeIds.push(await sliderZone(frame, "Rotation low", 218, 274, 57, 24, frames.get("Rotation low")));
  createdNodeIds.push(await sliderZone(frame, "Rotation reference", 275, 274, 58, 24, frames.get("Rotation reference")));
  createdNodeIds.push(await sliderZone(frame, "Rotation high", 333, 274, 58, 24, frames.get("Rotation high")));
}
const parameterStates = ["Parameters reference", "Loft low", "Loft high", "Tempo low", "Tempo high"];
for (const state of parameterStates) {
  const frame = frames.get(state);
  createdNodeIds.push(await sliderZone(frame, "Loft low", 218, 274, 57, 20, frames.get("Loft low")));
  createdNodeIds.push(await sliderZone(frame, "Loft reference", 275, 274, 58, 20, frames.get("Parameters reference"), frames.get("Loft high")));
  createdNodeIds.push(await sliderZone(frame, "Loft high", 333, 274, 58, 20, frames.get("Loft high"), frames.get("Loft low")));
  createdNodeIds.push(await sliderZone(frame, "Tempo low", 218, 296, 57, 20, frames.get("Tempo low")));
  createdNodeIds.push(await sliderZone(frame, "Tempo reference", 275, 296, 58, 20, frames.get("Parameters reference"), frames.get("Tempo high")));
  createdNodeIds.push(await sliderZone(frame, "Tempo high", 333, 296, 58, 20, frames.get("Tempo high"), frames.get("Tempo low")));
}
return { createdNodeIds: createdNodeIds.filter(Boolean), mutatedNodeIds: [...rotationStates, ...parameterStates].map((state) => frames.get(state).id) };
