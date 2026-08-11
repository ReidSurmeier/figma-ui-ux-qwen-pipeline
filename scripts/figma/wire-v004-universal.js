const page = figma.root.children.find((node) => node.id === "5:3" || node.name === "03 Prototype");
await figma.setCurrentPageAsync(page);

const frames = new Map(page.children
  .filter((node) => node.type === "FRAME")
  .map((node) => [node.getSharedPluginData("golfstudio.pipeline", "state"), node])
  .filter(([state]) => state));

const positions = { Parts: [0, 3640], About: [600, 3640], Minimized: [1200, 3640], Presentation: [1800, 3640] };
for (const [state, [x, y]] of Object.entries(positions)) {
  frames.get(state).x = x;
  frames.get(state).y = y;
}

function navigation(destinationId) {
  return { type: "NODE", destinationId, navigation: "NAVIGATE", transition: null, resetScrollPosition: true };
}
async function hotspot(frame, name, x, y, width, height, destination, trigger = "ON_CLICK") {
  const node = figma.createRectangle();
  node.name = `QA Hotspot / ${name}`;
  node.resize(width, height);
  node.x = x;
  node.y = y;
  node.fills = [{ type: "SOLID", color: { r: 1, g: 0, b: 1 }, opacity: 0.001 }];
  frame.appendChild(node);
  await node.setReactionsAsync([{ trigger: { type: trigger }, actions: [navigation(destination.id)] }]);
  return node.id;
}

const createdNodeIds = [];
const mainStates = [
  "Default", "Zoom 200", "Putter", "Driver",
  "Rotation low", "Rotation reference", "Rotation high",
  "Parameters reference", "Loft low", "Loft high", "Tempo low", "Tempo high",
  "Parts", "Playing address", "Playing backswing", "Playing impact",
  "Finish paused", "Backswing paused", "Impact paused",
];
for (const state of mainStates) {
  const frame = frames.get(state);
  createdNodeIds.push(await hotspot(frame, "File menu", 6, 21, 24, 18, frames.get("File menu")));
  createdNodeIds.push(await hotspot(frame, "Club menu", 61, 21, 38, 18, frames.get("Club menu")));
  createdNodeIds.push(await hotspot(frame, "Scale menu", 130, 47, 59, 22, frames.get("Scale menu")));
  if (state !== "Default") createdNodeIds.push(await hotspot(frame, "Swing tab", 175, 378, 59, 21, frames.get("Default")));
  if (state !== "Rotation reference") createdNodeIds.push(await hotspot(frame, "Rotation tab", 234, 378, 59, 21, frames.get("Rotation reference")));
  if (state !== "Parameters reference") createdNodeIds.push(await hotspot(frame, "Parameters tab", 293, 378, 67, 21, frames.get("Parameters reference")));
  if (state !== "Parts") createdNodeIds.push(await hotspot(frame, "Parts tab", 360, 378, 38, 21, frames.get("Parts")));
}

createdNodeIds.push(await hotspot(frames.get("Default"), "About", 230, 21, 30, 18, frames.get("About")));
createdNodeIds.push(await hotspot(frames.get("Default"), "Minimize", 418, 4, 17, 15, frames.get("Minimized")));
createdNodeIds.push(await hotspot(frames.get("Default"), "Presentation", 184, 21, 45, 18, frames.get("Presentation")));
createdNodeIds.push(await hotspot(frames.get("About"), "About OK", 260, 354, 64, 24, frames.get("Default")));
createdNodeIds.push(await hotspot(frames.get("Minimized"), "Restore", 168, 242, 138, 30, frames.get("Default")));
createdNodeIds.push(await hotspot(frames.get("Presentation"), "Exit presentation", 334, 378, 140, 25, frames.get("Default")));

return { createdNodeIds, mutatedNodeIds: [...frames.values()].map((frame) => frame.id), stateCount: frames.size };
