const page = figma.root.children.find((node) => node.id === "5:2" || node.name === "02 Components");
await figma.setCurrentPageAsync(page);

const states = [
  ["Rotation low", "55180570c9f58f246e6459164d5665e559d94326"],
  ["Rotation reference", "2baaf8962cbe2ec118faa06304aebad5131c5c6c"],
  ["Rotation high", "45145c326e18e86736239bf71df9e5cfd1a98969"],
  ["Parameters reference", "47ceaf542316cfb54d815f1326de6fef2718e3cc"],
  ["Loft low", "a09bb02bd4b13ef66a2968bce48cd9c405df0fe9"],
  ["Loft high", "19eff424c1b0850178e281fedc8e458f5209f24f"],
  ["Tempo low", "95084c6e1f9f3a06280b78a3e2190528c58eb482"],
  ["Tempo high", "f9a263c93a68878595a40f4ff1ae33c6acc7f68c"],
];

const baseX = Math.max(...page.children.map((node) => node.x + node.width), 0) + 120;
const createdNodeIds = [];
for (const [index, [name, imageHash]] of states.entries()) {
  const component = figma.createComponent();
  component.name = `State=${name}`;
  component.description = `GolfStudio v004 tested interaction state: ${name}. Controls use classic immediate trackbar feedback.`;
  component.resize(474, 403);
  component.x = baseX + (index % 4) * 514;
  component.y = Math.floor(index / 4) * 443;
  component.fills = [{ type: "IMAGE", imageHash, scaleMode: "FIT" }];
  component.setSharedPluginData("golfstudio.pipeline", "version", "v004");
  page.appendChild(component);
  createdNodeIds.push(component.id);
}
return { createdNodeIds, states: states.map(([name]) => name) };
