const page = figma.root.children.find((node) => node.id === "5:3" || node.name === "03 Prototype");
await figma.setCurrentPageAsync(page);
const frames = new Map(page.children.filter((node) => node.type === "FRAME").map((node) => [node.getSharedPluginData("golfstudio.pipeline", "state"), node]).filter(([state]) => state));
const action = (destination) => ({ type: "NODE", destinationId: destination.id, navigation: "NAVIGATE", transition: null, resetScrollPosition: true });
async function hotspot(frame, name, x, y, width, height, destination, triggers = ["ON_CLICK"]) {
  if (frame.id === destination.id) return null;
  const node = figma.createRectangle();
  node.name = `QA Hotspot / ${name}`;
  node.resize(width, height); node.x = x; node.y = y;
  node.fills = [{ type: "SOLID", color: { r: 1, g: 0, b: 1 }, opacity: 0.001 }];
  frame.appendChild(node);
  await node.setReactionsAsync(triggers.map((type) => ({ trigger: { type }, actions: [action(destination)] })));
  return node.id;
}
const createdNodeIds = [];
const replayStates = ["Default", "Zoom 200", "Putter", "Driver", "Rotation low", "Rotation reference", "Rotation high", "Parameters reference", "Loft low", "Loft high", "Tempo low", "Tempo high", "Parts", "Finish paused", "Backswing paused", "Impact paused"];
for (const state of replayStates) createdNodeIds.push(await hotspot(frames.get(state), "Animate swing", 393, 350, 77, 26, frames.get("Playing address")));
createdNodeIds.push(await hotspot(frames.get("Playing address"), "Stop at address", 393, 350, 77, 26, frames.get("Default")));
createdNodeIds.push(await hotspot(frames.get("Playing backswing"), "Stop at backswing", 393, 350, 77, 26, frames.get("Backswing paused")));
createdNodeIds.push(await hotspot(frames.get("Playing impact"), "Stop at impact", 393, 350, 77, 26, frames.get("Impact paused")));

await frames.get("Playing address").setReactionsAsync([{ trigger: { type: "AFTER_TIMEOUT", timeout: 0.08 }, actions: [action(frames.get("Playing backswing"))] }]);
await frames.get("Playing backswing").setReactionsAsync([{ trigger: { type: "AFTER_TIMEOUT", timeout: 0.18 }, actions: [action(frames.get("Playing impact"))] }]);
await frames.get("Playing impact").setReactionsAsync([{ trigger: { type: "AFTER_TIMEOUT", timeout: 0.09 }, actions: [action(frames.get("Finish paused"))] }]);

const timelineStates = ["Default", "Backswing paused", "Impact paused", "Finish paused"];
for (const state of timelineStates) {
  const frame = frames.get(state);
  createdNodeIds.push(await hotspot(frame, "Timeline backswing", 245, 274, 65, 57, frames.get("Backswing paused")));
  createdNodeIds.push(await hotspot(frame, "Timeline impact", 310, 274, 65, 57, frames.get("Impact paused")));
  createdNodeIds.push(await hotspot(frame, "Timeline finish", 375, 274, 92, 57, frames.get("Finish paused")));
}
return { createdNodeIds: createdNodeIds.filter(Boolean), mutatedNodeIds: [...new Set([...replayStates, "Playing address", "Playing backswing", "Playing impact", ...timelineStates])].map((state) => frames.get(state).id) };
