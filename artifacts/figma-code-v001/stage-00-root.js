
const page = await figma.getNodeByIdAsync("0:1");
if (!page || page.type !== "PAGE") throw new Error("Page 0:1 is missing");
const ROOT_NAME = "Editable / Japanese RPG Desktop / v001 / Qwen componentized";
const REF_NAME = "Verification / Japanese RPG Desktop / v001 / Runtime settled";
const imageFill = (imageHash) => [{ type: "IMAGE", scaleMode: "FILL", imageHash }];
const latestAsset = (name) => {
  const matches = page.children.filter((node) => node.name === name);
  const node = matches.at(-1);
  if (!node || node.type !== "FRAME") throw new Error(`Missing uploaded asset ${name}`);
  const fill = Array.isArray(node.fills) ? node.fills.find((candidate) => candidate.type === "IMAGE") : null;
  if (!fill?.imageHash) throw new Error(`Uploaded asset ${name} has no image hash`);
  return fill.imageHash;
};
const findRoot = () => {
  const root = page.children.find((node) => node.name === ROOT_NAME);
  if (!root || root.type !== "FRAME") throw new Error("Final desktop root is missing");
  return root;
};
const findWindow = (root, id) => {
  const node = root.children.find((candidate) => candidate.name === `ui/${id}/window`);
  if (!node || node.type !== "FRAME") throw new Error(`Window ${id} is missing`);
  return node;
};

let root = page.children.find((node) => node.name === ROOT_NAME);
if (!root) {
  root = figma.createFrame();
  root.name = ROOT_NAME;
  root.resize(849, 564);
  root.x = 1040;
  root.y = 1100;
  root.clipsContent = true;
  root.fills = [{ type: "SOLID", color: { r: 0.063, g: 0.094, b: 0.153 } }];
  page.appendChild(root);
}
let reference = page.children.find((node) => node.name === REF_NAME);
if (!reference) {
  reference = figma.createFrame();
  reference.name = REF_NAME;
  reference.resize(849, 564);
  reference.x = 1940;
  reference.y = 1100;
  reference.fills = imageFill(latestAsset("runtime--full-reference"));
  page.appendChild(reference);
}
return {root:{id:root.id,x:root.x,y:root.y,width:root.width,height:root.height},reference:{id:reference.id,x:reference.x,y:reference.y}};
