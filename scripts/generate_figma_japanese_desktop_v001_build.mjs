import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const repoDir = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(resolve(repoDir, "artifacts/qa/runtime-component-manifest.json"), "utf8"));
const uploadManifest = JSON.parse(await readFile(resolve(repoDir, "artifacts/figma-upload-v001/assets.json"), "utf8"));
const outputDir = resolve(repoDir, "artifacts/figma-code-v001");
await mkdir(outputDir, { recursive: true });

const assetNameByUrl = Object.fromEntries(uploadManifest.assets.map((asset) => [
  asset.sourceUrl,
  asset.uploadName.replace(/\.[^.]+$/, ""),
]));
const windows = manifest.windows;
const groups = [windows.slice(0, 8), windows.slice(8)];
const canonicalDestinationByControl = {
  "basic-info": {
    HP: "State / basic-info / HP-100 / v003",
    SP: "State / basic-info / SP-100 / v003",
    status: "Editable / Japanese Basic Info / v001 / Page status",
    option: "Editable / Japanese Basic Info / v001 / Page option",
    items: "Editable / Japanese Basic Info / v001 / Page items",
    equip: "Editable / Japanese Basic Info / v001 / Page equip",
    skill: "Editable / Japanese Basic Info / v001 / Page skill",
    map: "Editable / Japanese Basic Info / v001 / Page map",
    chat: "Editable / Japanese Basic Info / v001 / Page chat",
    friend: "Editable / Japanese Basic Info / v001 / Page friend",
  },
  card: { "カード情報スクロール": "State / card / scroll-100 / v003" },
  skills: { "スキルスクロール": "State / skills / scroll-100 / v003" },
  status: {
    stats: "Editable / Japanese Status / v001 / Stats",
    info: "Editable / Japanese Status / v001 / Info",
    "Strを上げる": "Editable / Japanese Status / v001 / Stat Str changed",
    "Agiを上げる": "Editable / Japanese Status / v001 / Stat Agi changed",
    "Vitを上げる": "Editable / Japanese Status / v001 / Stat Vit changed",
    "Dexを上げる": "Editable / Japanese Status / v001 / Stat Dex changed",
    "Lukを上げる": "Editable / Japanese Status / v001 / Stat Luk changed",
  },
  inventory: { "所持品スクロール": "State / inventory / scroll-100 / v003" },
  chat: {
    公開: "State / chat / privacy-public / v003",
    非公開: "State / chat / privacy-private / v003",
  },
  "bottom-bar": { "クイックスロット位置": "State / bottom-bar / position-100 / v003" },
  options: {
    BGM: "State / options / BGM-100 / v003",
    Effect: "State / options / Effect-100 / v003",
    "BGM on": "State / options / BGM-on / v003",
    "Effect on": "State / options / Effect-off / v003",
    opaque: "State / options / opaque-on / v003",
    attack: "State / options / attack-off / v003",
    skill: "State / options / skill-on / v003",
    item: "State / options / item-off / v003",
  },
};

const prelude = `
const page = await figma.getNodeByIdAsync("0:1");
if (!page || page.type !== "PAGE") throw new Error("Page 0:1 is missing");
const ROOT_NAME = "Editable / Japanese RPG Desktop / v001 / Qwen componentized";
const REF_NAME = "Verification / Japanese RPG Desktop / v001 / Runtime settled";
const imageFill = (imageHash) => [{ type: "IMAGE", scaleMode: "FILL", imageHash }];
const latestAsset = (name) => {
  const matches = page.children.filter((node) => node.name === name);
  const node = matches.at(-1);
  if (!node || node.type !== "FRAME") throw new Error(\`Missing uploaded asset \${name}\`);
  const fill = Array.isArray(node.fills) ? node.fills.find((candidate) => candidate.type === "IMAGE") : null;
  if (!fill?.imageHash) throw new Error(\`Uploaded asset \${name} has no image hash\`);
  return fill.imageHash;
};
const findRoot = () => {
  const root = page.children.find((node) => node.name === ROOT_NAME);
  if (!root || root.type !== "FRAME") throw new Error("Final desktop root is missing");
  return root;
};
const findWindow = (root, id) => {
  const node = root.children.find((candidate) => candidate.name === \`ui/\${id}/window\`);
  if (!node || node.type !== "FRAME") throw new Error(\`Window \${id} is missing\`);
  return node;
};
`;

const rootCode = `${prelude}
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
`;
await writeFile(resolve(outputDir, "stage-00-root.js"), rootCode);

for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
  const group = groups[groupIndex];
  const windowDefinitions = group.map(({ id, geometry, cleanPlate }) => ({ id, geometry, cleanPlate }));
  const code = `${prelude}
const root = findRoot();
const definitions = ${JSON.stringify(windowDefinitions)};
const assetNames = ${JSON.stringify(assetNameByUrl)};
const created = [];
for (const definition of definitions) {
  if (root.children.some((node) => node.name === \`ui/\${definition.id}/window\`)) continue;
  let window;
  if (definition.id === "options") {
    const authority = await figma.getNodeByIdAsync("27:3");
    if (!authority || authority.type !== "FRAME") throw new Error("Options v004 authority is missing");
    window = authority.clone();
    window.fills = imageFill(latestAsset("options--clean-plate-alpha-edge"));
  } else {
    window = figma.createFrame();
    window.resize(definition.geometry.width, definition.geometry.height);
    window.clipsContent = true;
    const assetName = assetNames[definition.cleanPlate];
    if (!assetName) throw new Error(\`No clean plate mapping for \${definition.id}\`);
    window.fills = imageFill(latestAsset(assetName));
  }
  window.name = \`ui/\${definition.id}/window\`;
  root.appendChild(window);
  window.x = definition.geometry.x;
  window.y = definition.geometry.y;
  created.push({id:definition.id,nodeId:window.id,x:window.x,y:window.y,width:window.width,height:window.height});
}
return {created, total: root.children.filter((node) => node.name.startsWith("ui/") && node.name.endsWith("/window")).length};
`;
  await writeFile(resolve(outputDir, `stage-0${groupIndex + 1}-windows.js`), code);
}

for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
  const group = groups[groupIndex].filter((window) => window.id !== "options");
  const componentDefinitions = group.map(({ id, components }) => ({ id, components }));
  const code = `${prelude}
const root = findRoot();
const definitions = ${JSON.stringify(componentDefinitions)};
const assetNames = ${JSON.stringify(assetNameByUrl)};
const added = [];
for (const definition of definitions) {
  const window = findWindow(root, definition.id);
  for (const component of definition.components) {
    const name = \`ui/\${definition.id}/\${component.id}\`;
    if (window.children.some((node) => node.name === name)) continue;
    const assetName = assetNames[component.assetPath];
    if (!assetName) throw new Error(\`No uploaded mapping for \${component.assetPath}\`);
    const node = figma.createRectangle();
    node.name = name;
    node.resize(component.geometry.width, component.geometry.height);
    node.fills = imageFill(latestAsset(assetName));
    window.appendChild(node);
    node.x = component.geometry.x;
    node.y = component.geometry.y;
    added.push(name);
  }
}
return {added:added.length, windows:definitions.map((definition)=>({id:definition.id,count:findWindow(root,definition.id).children.filter((node)=>node.name.startsWith(\`ui/\${definition.id}/\`)).length}))};
`;
  await writeFile(resolve(outputDir, `stage-0${groupIndex + 3}-components.js`), code);
}

for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
  const group = groups[groupIndex];
  const reviewDefinitions = group.map(({ id, ariaLabel, geometry, controls }) => ({ id, ariaLabel, geometry, controls }));
  const code = `${prelude}
const root = findRoot();
const definitions = ${JSON.stringify(reviewDefinitions)};
const assetNames = ${JSON.stringify(assetNameByUrl)};
const minimizedIds = new Set(["basic-info", "card", "status", "inventory", "equipment", "exchange", "options"]);
const results = [];
for (let index = 0; index < definitions.length; index += 1) {
  const definition = definitions[index];
  const window = findWindow(root, definition.id);
  const reviewName = \`Review / \${definition.ariaLabel} / v001\`;
  let review = page.children.find((node) => node.name === reviewName);
  if (!review) {
    review = window.clone();
    review.name = reviewName;
    review.x = 1040 + (index % 4) * 320;
    review.y = ${groupIndex === 0 ? 1720 : 2200} + Math.floor(index / 4) * 230;
    page.appendChild(review);
  }
  let minimized = null;
  if (minimizedIds.has(definition.id)) {
    const minimizedName = \`Review / \${definition.ariaLabel} / v001 / Qwen minimized\`;
    minimized = page.children.find((node) => node.name === minimizedName);
    if (!minimized) {
      minimized = figma.createFrame();
      minimized.name = minimizedName;
      minimized.resize(180, 18);
      minimized.x = review.x;
      minimized.y = review.y + definition.geometry.height + 24;
      const assetUrl = definition.id === "options"
        ? "/assets/japanese-options-v001/components/minimized-plate.png"
        : \`/assets/japanese-rpg-v001/\${definition.id}/minimized-plate.png\`;
      minimized.fills = imageFill(latestAsset(assetNames[assetUrl]));
      minimized.reactions = [{trigger:{type:"ON_CLICK"},actions:[{type:"BACK"}]}];
      page.appendChild(minimized);
    }
  }
  results.push({id:definition.id,reviewId:review.id,minimizedId:minimized?.id??null});
}
return {results};
`;
  await writeFile(resolve(outputDir, `stage-0${groupIndex + 5}-reviews.js`), code);
}

for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
  const group = groups[groupIndex];
  const linkDefinitions = group.map(({ id, ariaLabel, controls }) => ({ id, ariaLabel, controls }));
  const code = `${prelude}
const root = findRoot();
const definitions = ${JSON.stringify(linkDefinitions)};
const canonicalDestinations = ${JSON.stringify(canonicalDestinationByControl)};
const minimizedIds = new Set(["basic-info", "card", "status", "inventory", "equipment", "exchange", "options"]);
const results = [];
for (const definition of definitions) {
  const window = findWindow(root, definition.id);
  const review = page.children.find((node) => node.name === \`Review / \${definition.ariaLabel} / v001\`);
  if (!review || review.type !== "FRAME") throw new Error(\`Review destination missing for \${definition.id}\`);
  const minimized = minimizedIds.has(definition.id)
    ? page.children.find((node) => node.name === \`Review / \${definition.ariaLabel} / v001 / Qwen minimized\`)
    : null;
  const expectedNames = new Set(definition.controls.map((control, controlIndex) => \`interaction/\${definition.id}/\${controlIndex}/\${control.id}\`));
  const removed = [];
  for (const child of [...window.children]) {
    if (child.name.startsWith(\`interaction/\${definition.id}/\`) && !expectedNames.has(child.name)) {
      removed.push(child.id);
      child.remove();
    }
  }
  let hotspotCount = 0;
  for (let controlIndex = 0; controlIndex < definition.controls.length; controlIndex += 1) {
    const control = definition.controls[controlIndex];
    const hotspotName = \`interaction/\${definition.id}/\${controlIndex}/\${control.id}\`;
    const existing = window.children.find((node) => node.name === hotspotName);
    const hotspot = existing?.type === "RECTANGLE" ? existing : figma.createRectangle();
    if (!existing) {
      hotspot.name = hotspotName;
      hotspot.fills = [{type:"SOLID",color:{r:0,g:0,b:0},opacity:0.001}];
      window.appendChild(hotspot);
    }
    hotspot.resize(Math.max(1, control.geometry.width), Math.max(1, control.geometry.height));
    hotspot.x = control.geometry.x;
    hotspot.y = control.geometry.y;
    const canonicalName = canonicalDestinations[definition.id]?.[control.id];
    const canonical = canonicalName ? page.children.find((node) => node.name === canonicalName) : null;
    const destination = minimized && /最小化|minimize/i.test(control.id) ? minimized : canonical ?? review;
    const duration = /スクロール|位置|^(BGM|Effect|HP|SP)$/.test(control.id) ? 0.16 : / on$|^(opaque|attack|skill|item|公開|非公開)$/.test(control.id) ? 0.08 : 0.2;
    hotspot.reactions = [{trigger:{type:"ON_CLICK"},actions:[{type:"NODE",destinationId:destination.id,navigation:"NAVIGATE",transition:{type:"SMART_ANIMATE",duration,easing:{type:duration===0.2?"EASE_OUT":"LINEAR"}}}]}];
    hotspotCount += 1;
  }
  if (minimized && minimized.type === "FRAME") minimized.reactions = [{trigger:{type:"ON_CLICK"},actions:[{type:"BACK"}]}];
  results.push({id:definition.id,hotspots:hotspotCount,removed,reviewId:review.id,minimizedId:minimized?.id??null});
}
return {results};
`;
  await writeFile(resolve(outputDir, `stage-0${groupIndex + 7}-hotspots.js`), code);
}

const auditCode = `${prelude}
const root = findRoot();
const definitions = ${JSON.stringify(windows)};
const canonicalDestinations = ${JSON.stringify(canonicalDestinationByControl)};
const imageHash = (node) => Array.isArray(node.fills) ? node.fills.find((fill) => fill.type === "IMAGE")?.imageHash ?? null : null;
const reactions = (node) => node.reactions.flatMap((reaction) => reaction.actions ?? (reaction.action ? [reaction.action] : []));
const report = definitions.map((definition) => {
  const window = findWindow(root, definition.id);
  const rasterNodes = window.findAll((node) => imageHash(node));
  const hotspots = window.findAll((node) => node.name.startsWith(\`interaction/\${definition.id}/\`));
  return {
    id: definition.id,
    nodeId: window.id,
    geometry: {x:window.x,y:window.y,width:window.width,height:window.height},
    expectedGeometry: definition.geometry,
    rasterCount: rasterNodes.length + (imageHash(window) ? 1 : 0),
    expectedComponentMinimum: definition.components.length + 1,
    hotspotCount: hotspots.length,
    expectedHotspots: definition.controls.length,
    unlinkedHotspots: hotspots.filter((node) => reactions(node).length === 0).map((node) => node.name),
    reviewId: page.children.find((node) => node.name === \`Review / \${definition.ariaLabel} / v001\`)?.id ?? null,
  };
});
const reference = page.children.find((node) => node.name === REF_NAME);
const canonicalStateAudit = [];
for (const definition of definitions) {
  const window = findWindow(root, definition.id);
  for (let controlIndex = 0; controlIndex < definition.controls.length; controlIndex += 1) {
    const control = definition.controls[controlIndex];
    const expectedName = canonicalDestinations[definition.id]?.[control.id];
    if (!expectedName) continue;
    const hotspot = window.findOne((node) => node.name === \`interaction/\${definition.id}/\${controlIndex}/\${control.id}\`);
    const destination = page.children.find((node) => node.name === expectedName);
    const destinationIds = hotspot ? reactions(hotspot).map((action) => action.destinationId).filter(Boolean) : [];
    canonicalStateAudit.push({windowId:definition.id,controlId:control.id,hotspotId:hotspot?.id??null,expectedName,destinationId:destination?.id??null,destinationIds,linked:!!destination && destinationIds.includes(destination.id)});
  }
}
return {root:{id:root.id,width:root.width,height:root.height,windowCount:report.length},reference:{id:reference?.id??null,imageHash:reference?imageHash(reference):null},windows:report,canonicalStateAudit};
`;
await writeFile(resolve(outputDir, "audit.js"), auditCode);

for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
const syncDefinitions = groups[groupIndex].map(({ id, ariaLabel, cleanPlate, components }) => ({ id, ariaLabel, cleanPlate, components }));
const syncCode = `${prelude}
const root = findRoot();
const definitions = ${JSON.stringify(syncDefinitions)};
const assetNames = ${JSON.stringify(assetNameByUrl)};
let updatedWindows = 0;
let updatedComponents = 0;
let createdComponents = 0;
const removedComponents = [];
const syncWindow = (window, definition) => {
  if (definition.id === "options") {
    window.fills = imageFill(latestAsset("options--clean-plate-alpha-edge"));
  } else {
    const plateName = assetNames[definition.cleanPlate];
    if (!plateName) throw new Error(\`No clean plate mapping for \${definition.id}\`);
    window.fills = imageFill(latestAsset(plateName));
  }
  updatedWindows += 1;
  if (definition.id !== "options") {
    const expectedNames = new Set(definition.components.map((component) => \`ui/\${definition.id}/\${component.id}\`));
    for (const child of [...window.children]) {
      if (child.type === "RECTANGLE" && child.name.startsWith(\`ui/\${definition.id}/\`) && !expectedNames.has(child.name)) {
        removedComponents.push(child.id);
        child.remove();
      }
    }
  }
  for (const component of definition.components) {
    const nodeName = \`ui/\${definition.id}/\${component.id}\`;
    const existing = window.findOne((candidate) => candidate.name === nodeName);
    const node = existing?.type === "RECTANGLE" ? existing : figma.createRectangle();
    if (!existing) {
      node.name = nodeName;
      window.appendChild(node);
      createdComponents += 1;
    }
    node.resize(component.geometry.width, component.geometry.height);
    node.x = component.geometry.x;
    node.y = component.geometry.y;
    const assetName = assetNames[component.assetPath];
    if (!assetName) throw new Error(\`No uploaded mapping for \${component.assetPath}\`);
    node.fills = imageFill(latestAsset(assetName));
    updatedComponents += 1;
  }
};
for (const definition of definitions) {
  syncWindow(findWindow(root, definition.id), definition);
  const review = page.children.find((node) => node.name === \`Review / \${definition.ariaLabel} / v001\`);
  if (!review || review.type !== "FRAME") throw new Error(\`Review destination missing for \${definition.id}\`);
  syncWindow(review, definition);
}
let referenceId = null;
if (${groupIndex} === 0) {
  const reference = page.children.find((node) => node.name === REF_NAME);
  if (!reference || reference.type !== "FRAME") throw new Error("Runtime reference is missing");
  reference.fills = imageFill(latestAsset("runtime--full-reference"));
  referenceId = reference.id;
}
return {updatedWindows,updatedComponents,createdComponents,removedComponents,referenceId};
`;
await writeFile(resolve(outputDir, `sync-assets-${groupIndex + 1}.js`), syncCode);
}

process.stdout.write(`generated staged Figma build for ${windows.length} windows, ${windows.reduce((sum, window) => sum + window.components.length, 0)} raster instances, and ${windows.reduce((sum, window) => sum + window.controls.length, 0)} hotspots\n`);
