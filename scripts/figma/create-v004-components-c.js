const page = figma.root.children.find((node) => node.id === "5:2" || node.name === "02 Components");
await figma.setCurrentPageAsync(page);

const states = [
  ["Playing address", "cf6fc129cf2f5c77796cfe52b6405199f865cf59"],
  ["Playing backswing", "bf302a31bef3fce192060c7fd0aa1615508a9bd3"],
  ["Playing impact", "74b1405e312c9121c5fec29deb4b66bbdde73f53"],
  ["Finish paused", "47dfbb9e5b70b8ac1310aada2fbea532e37d78e3"],
  ["Backswing paused", "14e707b36d13f88747e20bb50dfa223f59552156"],
  ["Impact paused", "2cc92317b86141e9cb8efed35dcf27065c4350f4"],
];

const baseX = Math.max(...page.children.map((node) => node.x + node.width), 0) + 120;
const createdNodeIds = [];
for (const [index, [name, imageHash]] of states.entries()) {
  const component = figma.createComponent();
  component.name = `State=${name}`;
  component.description = `GolfStudio v004 discrete swing state: ${name}. No Smart Animate or tweening.`;
  component.resize(474, 403);
  component.x = baseX + (index % 3) * 514;
  component.y = Math.floor(index / 3) * 443;
  component.fills = [{ type: "IMAGE", imageHash, scaleMode: "FIT" }];
  component.setSharedPluginData("golfstudio.pipeline", "version", "v004");
  page.appendChild(component);
  createdNodeIds.push(component.id);
}
return { createdNodeIds, states: states.map(([name]) => name) };
