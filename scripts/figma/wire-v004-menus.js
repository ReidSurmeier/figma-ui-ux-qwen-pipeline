const page = figma.root.children.find((node) => node.id === "5:3" || node.name === "03 Prototype");
await figma.setCurrentPageAsync(page);
const frames = new Map(page.children.filter((node) => node.type === "FRAME").map((node) => [node.getSharedPluginData("golfstudio.pipeline", "state"), node]).filter(([state]) => state));
const action = (destination) => ({ type: "NODE", destinationId: destination.id, navigation: "NAVIGATE", transition: null, resetScrollPosition: true });
async function hotspot(frame, name, x, y, width, height, destination) {
  const node = figma.createRectangle();
  node.name = `QA Hotspot / ${name}`;
  node.resize(width, height); node.x = x; node.y = y;
  node.fills = [{ type: "SOLID", color: { r: 1, g: 0, b: 1 }, opacity: 0.001 }];
  frame.appendChild(node);
  await node.setReactionsAsync([{ trigger: { type: "ON_CLICK" }, actions: [action(destination)] }]);
  return node.id;
}
const createdNodeIds = [];
createdNodeIds.push(await hotspot(frames.get("File menu"), "Open session simulated", 6, 57, 164, 20, frames.get("File dialog simulated")));
createdNodeIds.push(await hotspot(frames.get("File dialog simulated"), "Dialog OK", 354, 289, 52, 24, frames.get("Default")));
createdNodeIds.push(await hotspot(frames.get("Scale menu"), "Select 200 percent", 130, 122, 59, 18, frames.get("Zoom 200")));
createdNodeIds.push(await hotspot(frames.get("Zoom 200"), "Scale to Fit", 190, 47, 91, 22, frames.get("Default")));
createdNodeIds.push(await hotspot(frames.get("Club menu"), "Select 7 iron", 61, 40, 126, 18, frames.get("Default")));
createdNodeIds.push(await hotspot(frames.get("Club menu"), "Select driver", 61, 126, 126, 18, frames.get("Driver")));
createdNodeIds.push(await hotspot(frames.get("Club menu"), "Select putter", 61, 142, 126, 18, frames.get("Putter")));
return { createdNodeIds, mutatedNodeIds: [frames.get("File menu").id, frames.get("File dialog simulated").id, frames.get("Scale menu").id, frames.get("Zoom 200").id, frames.get("Club menu").id] };
