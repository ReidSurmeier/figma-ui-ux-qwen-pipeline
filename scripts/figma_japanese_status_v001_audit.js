const page = await figma.getNodeByIdAsync("0:1");
if (!page || page.type !== "PAGE") throw new Error("Page 0:1 is missing");

const frameNames = {
  default: "Editable / Japanese Status / v001 / Stats",
  info: "Editable / Japanese Status / v001 / Info",
  Str: "Editable / Japanese Status / v001 / Stat Str changed",
  Agi: "Editable / Japanese Status / v001 / Stat Agi changed",
  Vit: "Editable / Japanese Status / v001 / Stat Vit changed",
  Dex: "Editable / Japanese Status / v001 / Stat Dex changed",
  Luk: "Editable / Japanese Status / v001 / Stat Luk changed",
};
const roots = Object.fromEntries(Object.entries(frameNames).map(([key, name]) => {
  const node = page.findOne((candidate) => candidate.name === name);
  if (!node || node.type !== "FRAME") throw new Error(`Missing Status frame ${name}`);
  return [key, node];
}));
const minimized = page.findOne((candidate) => candidate.name === "Editable / Japanese Status / v001 / Qwen minimized");
if (!minimized || minimized.type !== "FRAME") throw new Error("Missing Status minimized frame");

const imageHash = (node) => Array.isArray(node.fills)
  ? node.fills.find((fill) => fill.type === "IMAGE")?.imageHash ?? null
  : null;
const actions = (node) => node.reactions.flatMap((reaction) => (
  reaction.actions ?? (reaction.action ? [reaction.action] : [])
)).map((action) => ({
  type: action.type,
  destinationId: action.destinationId ?? null,
  transition: action.transition?.type ?? null,
}));
const find = (root, name) => {
  const node = root.findOne((candidate) => candidate.name === name);
  if (!node) throw new Error(`${root.name} is missing ${name}`);
  return node;
};
const geometry = (root, node) => ({
  x: Math.round((node.absoluteTransform[0][2] - root.absoluteTransform[0][2]) * 100) / 100,
  y: Math.round((node.absoluteTransform[1][2] - root.absoluteTransform[1][2]) * 100) / 100,
  width: node.width,
  height: node.height,
});

const statNames = ["Str", "Agi", "Vit", "Dex", "Luk"];
const stateAudit = Object.fromEntries(Object.entries(roots).map(([key, root]) => [key, {
  id: root.id,
  width: root.width,
  height: root.height,
  parentId: root.parent?.id ?? null,
  imageHash: imageHash(root),
  rasterLayerCount: root.findAll((node) => imageHash(node) !== null).length,
  textLayerCount: root.findAllWithCriteria({ types: ["TEXT"] }).length,
  reactions: {
    minimize: actions(find(root, "ui/status/title/minimize")),
    close: actions(find(root, "ui/status/title/close")),
    stats: actions(find(root, "ui/status/tab/stats/hotspot")),
    info: actions(find(root, "ui/status/tab/info/hotspot")),
    statsByName: Object.fromEntries(statNames.map((name) => [name, actions(find(root, `ui/status/stat/${name}/hotspot`))])),
  },
  selectedStrokeCount: key === "default" || key === "info" ? 0 : (
    Array.isArray(find(root, `ui/status/primary-row-${({Str: 0, Agi: 1, Vit: 2, Dex: 4, Luk: 5})[key]}`).strokes)
      ? find(root, `ui/status/primary-row-${({Str: 0, Agi: 1, Vit: 2, Dex: 4, Luk: 5})[key]}`).strokes.length
      : 0
  ),
}]));

return {
  pageId: page.id,
  roots: stateAudit,
  geometry: {
    title: geometry(roots.default, find(roots.default, "ui/status/title/text")),
    sideTabs: geometry(roots.default, find(roots.default, "ui/status/side-tabs")),
    firstPrimary: geometry(roots.default, find(roots.default, "ui/status/primary-row-0")),
    lastDerived: geometry(roots.default, find(roots.default, "ui/status/derived-row-5")),
    strHotspot: geometry(roots.default, find(roots.default, "ui/status/stat/Str/hotspot")),
  },
  minimized: {
    id: minimized.id,
    width: minimized.width,
    height: minimized.height,
    imageHash: imageHash(minimized),
    rasterLayerCount: minimized.findAll((node) => imageHash(node) !== null).length,
    restoreActions: actions(find(minimized, "ui/status/title/restore")),
    closeActions: actions(find(minimized, "ui/status/title/close")),
  },
};
