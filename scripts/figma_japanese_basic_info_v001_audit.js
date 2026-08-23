const page = await figma.getNodeByIdAsync("0:1");
if (!page || page.type !== "PAGE") throw new Error("Figma page 0:1 is missing");

const states = ["status", "option", "items", "equip", "skill", "map", "chat", "friend"];
const roots = Object.fromEntries(states.map((state) => {
  const node = page.findOne((candidate) => (
    candidate.name === `Editable / Japanese Basic Info / v001 / Page ${state}`
  ));
  if (!node || node.type !== "FRAME") throw new Error(`Basic Info ${state} state is missing`);
  return [state, node];
}));

const minimized = page.findOne((candidate) => (
  candidate.name === "Editable / Japanese Basic Info / v001 Qwen minimized"
));
if (!minimized || minimized.type !== "FRAME") throw new Error("Basic Info minimized state is missing");

const round = (value) => Math.round(value * 100) / 100;
const geometry = (root, node) => ({
  x: round(node.absoluteTransform[0][2] - root.absoluteTransform[0][2]),
  y: round(node.absoluteTransform[1][2] - root.absoluteTransform[1][2]),
  width: node.width,
  height: node.height,
});
const imageHash = (node) => (
  Array.isArray(node.fills)
    ? node.fills.find((fill) => fill.type === "IMAGE")?.imageHash ?? null
    : null
);
const actions = (node) => node.reactions.flatMap((reaction) => (
  reaction.actions ?? (reaction.action ? [reaction.action] : [])
)).map((action) => ({
  type: action.type,
  destinationId: action.destinationId ?? null,
  transition: action.transition?.type ?? null,
  duration: action.transition?.duration ?? null,
}));
const find = (root, name) => {
  const node = root.findOne((candidate) => candidate.name === name);
  if (!node) throw new Error(`${root.name} is missing ${name}`);
  return node;
};

const defaultRoot = roots.status;
const namedGeometry = Object.fromEntries([
  "title/icon", "title/text", "title/minimize", "player/name", "player/class",
  "hp/label", "hp/value", "hp/track", "hp/thumb/default",
  "sp/label", "sp/value", "sp/track", "sp/thumb/default",
  "base/label", "base/progress", "job/label", "job/progress", "footer/text",
].map((suffix) => {
  const name = `ui/basic/${suffix}`;
  return [name, geometry(defaultRoot, find(defaultRoot, name))];
}));

const stateAudit = Object.fromEntries(states.map((state) => {
  const root = roots[state];
  const pageControls = Object.fromEntries(states.map((target) => {
    const node = find(root, `ui/basic/page/${target}`);
    return [target, {
      id: node.id,
      geometry: geometry(root, node),
      actions: actions(node),
      imageHash: imageHash(node),
      strokeCount: Array.isArray(node.strokes) ? node.strokes.length : 0,
    }];
  }));
  return [state, {
    id: root.id,
    width: root.width,
    height: root.height,
    parentId: root.parent?.id ?? null,
    imageHash: imageHash(root),
    rasterLayerCount: root.findAll((node) => imageHash(node) !== null).length,
    textLayerCount: root.findAllWithCriteria({ types: ["TEXT"] }).length,
    minimizeActions: actions(find(root, "ui/basic/title/minimize")),
    pageControls,
  }];
}));

return {
  pageId: page.id,
  states,
  roots: stateAudit,
  minimized: {
    id: minimized.id,
    width: minimized.width,
    height: minimized.height,
    parentId: minimized.parent?.id ?? null,
    imageHash: imageHash(minimized),
    rasterLayerCount: minimized.findAll((node) => imageHash(node) !== null).length,
    restoreGeometry: geometry(minimized, find(minimized, "ui/basic/title/restore")),
    restoreActions: actions(find(minimized, "ui/basic/title/restore")),
  },
  geometry: namedGeometry,
};
