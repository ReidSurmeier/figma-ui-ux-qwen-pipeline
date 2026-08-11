const page = figma.root.children.find((node) => node.id === "5:2" || node.name === "02 Components");
await figma.setCurrentPageAsync(page);

const states = [
  ["Default", "b9d41a56839265a4587265a8736d88ae3cc74e7b"],
  ["File menu", "9e98f6fb99efda3c217a2a5f4cc40e2cd81bc2f5"],
  ["File dialog simulated", "a7916cb0a4a3da2ac6019f451d33a77a47412226"],
  ["Scale menu", "3f49e1b90e6d087be926de29d048c26a3e4c1e8c"],
  ["Zoom 200", "6b6f85ec55bd3f5c376982c9ddc834e69720d94c"],
  ["Club menu", "9dfdb6d40cad6bf1bd6cff3ecae4b03d5fe2b499"],
  ["Putter", "54445e5c574e54154b620de130b7cf0e9c619ad4"],
  ["Driver", "99484243d1021cae7d45c79a86279938b7e6a8a2"],
];

const baseX = Math.max(...page.children.map((node) => node.x + node.width), 0) + 120;
const createdNodeIds = [];
for (const [index, [name, imageHash]] of states.entries()) {
  const component = figma.createComponent();
  component.name = `State=${name}`;
  component.description = `GolfStudio v004 tested interaction state: ${name}. Source is the verified 474 by 403 browser rendering.`;
  component.resize(474, 403);
  component.x = baseX + (index % 4) * 514;
  component.y = Math.floor(index / 4) * 443;
  component.fills = [{ type: "IMAGE", imageHash, scaleMode: "FIT" }];
  component.setSharedPluginData("golfstudio.pipeline", "version", "v004");
  page.appendChild(component);
  createdNodeIds.push(component.id);
}
return { createdNodeIds, states: states.map(([name]) => name) };
