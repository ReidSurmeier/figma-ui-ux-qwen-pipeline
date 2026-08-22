const [defaultState, infoState, minimizedState] = await Promise.all(
  ["27:3", "27:49", "27:99"].map((id) => figma.getNodeByIdAsync(id)),
);

if (!defaultState || !infoState || !minimizedState) {
  throw new Error("A Japanese Options v004 Figma state is missing");
}

const round = (value) => Math.round(value * 100) / 100;

const relativeGeometry = (root, node) => ({
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

const labelRasters = defaultState
  .findAllWithCriteria({ types: ["FRAME"] })
  .filter((node) => node.name === "Label")
  .map((label) => {
    const margin = label.findOne((node) => node.name === "Text:margin");
    const raster = margin?.findOne((node) => node.name === "Text");
    if (!raster) throw new Error(`${label.id} is missing its on-label raster`);
    return raster;
  });

if (labelRasters.length !== 2) throw new Error("Expected two on-label raster layers");

const defaultTitle = find(defaultState, "ui/options/title/text");
const defaultBgm = find(defaultState, "Checkbox - BGM on");
const defaultEffect = find(defaultState, "Checkbox - Effect on");
const bgmThumb = find(defaultState, "ui/options/bgm/thumb-value-62");
const effectThumb = find(defaultState, "ui/options/effect/thumb-value-43");
const footerOpaque = find(defaultState, "Checkbox - opaque");
const footerAttack = find(defaultState, "Checkbox - attack");
const footerSkill = find(defaultState, "Checkbox - skill");
const footerItem = find(defaultState, "Checkbox - item");
const defaultOptionVisual = find(defaultState, "ui/options/tab/option");
const defaultInfoVisual = find(defaultState, "ui/options/tab/info");
const defaultOptionHotspot = find(defaultState, "ui/options/tab/option/hotspot");
const defaultInfoHotspot = find(defaultState, "ui/options/tab/info/hotspot");
const defaultMinimize = find(defaultState, "ui/options/title/minimize");
const infoOptionVisual = find(infoState, "ui/options/tab/option");
const infoInfoVisual = find(infoState, "ui/options/tab/info");
const infoOptionHotspot = find(infoState, "ui/options/tab/option/hotspot");
const infoInfoHotspot = find(infoState, "ui/options/tab/info/hotspot");
const infoMinimize = find(infoState, "ui/options/title/minimize");
const minimizedRestore = find(minimizedState, "ui/options/title/minimize");
const minimizedClose = find(minimizedState, "ui/options/title/close");
const minimizedContainer = find(minimizedState, "Container");

const textNodes = infoState.findAllWithCriteria({ types: ["TEXT"] });
const fonts = [...new Map(textNodes.flatMap((node) => (
  node.getStyledTextSegments(["fontName"]).map((segment) => [
    JSON.stringify(segment.fontName),
    segment.fontName,
  ])
))).values()];

return {
  nodes: {
    defaultMinimize: defaultMinimize.id,
    defaultOptionVisual: defaultOptionVisual.id,
    defaultInfoVisual: defaultInfoVisual.id,
    defaultOptionHotspot: defaultOptionHotspot.id,
    defaultInfoHotspot: defaultInfoHotspot.id,
    bgmThumb: bgmThumb.id,
    effectThumb: effectThumb.id,
    infoMinimize: infoMinimize.id,
    infoOptionVisual: infoOptionVisual.id,
    infoInfoVisual: infoInfoVisual.id,
    infoOptionHotspot: infoOptionHotspot.id,
    infoInfoHotspot: infoInfoHotspot.id,
    minimizedRestore: minimizedRestore.id,
    minimizedContainer: minimizedContainer.id,
  },
  roots: {
    default: { id: defaultState.id, width: defaultState.width, height: defaultState.height, imageHash: imageHash(defaultState) },
    info: { id: infoState.id, width: infoState.width, height: infoState.height, imageHash: imageHash(infoState) },
    minimized: { id: minimizedState.id, width: minimizedState.width, height: minimizedState.height, imageHash: imageHash(minimizedState) },
  },
  geometry: {
    title: relativeGeometry(defaultState, defaultTitle),
    bgmCheckbox: relativeGeometry(defaultState, defaultBgm),
    effectCheckbox: relativeGeometry(defaultState, defaultEffect),
    bgmOnLabel: relativeGeometry(defaultState, labelRasters[0]),
    effectOnLabel: relativeGeometry(defaultState, labelRasters[1]),
    bgmThumb: relativeGeometry(defaultState, bgmThumb),
    effectThumb: relativeGeometry(defaultState, effectThumb),
    optionHotspot: relativeGeometry(defaultState, defaultOptionHotspot),
    infoHotspot: relativeGeometry(defaultState, defaultInfoHotspot),
    footerOpaque: relativeGeometry(defaultState, footerOpaque),
    footerAttack: relativeGeometry(defaultState, footerAttack),
    footerSkill: relativeGeometry(defaultState, footerSkill),
    footerItem: relativeGeometry(defaultState, footerItem),
    minimizedRestore: relativeGeometry(minimizedState, minimizedRestore),
    minimizedClose: relativeGeometry(minimizedState, minimizedClose),
  },
  assetImageHashes: {
    title: imageHash(defaultTitle),
    bgmCheckbox: imageHash(defaultBgm),
    effectCheckbox: imageHash(defaultEffect),
    onLabels: labelRasters.map(imageHash),
    bgmThumb: imageHash(bgmThumb),
    effectThumb: imageHash(effectThumb),
    footerOpaque: imageHash(footerOpaque),
    footerAttack: imageHash(footerAttack),
    footerSkill: imageHash(footerSkill),
    footerItem: imageHash(footerItem),
  },
  visualTabReactionCounts: {
    defaultOption: actions(defaultOptionVisual).length,
    defaultInfo: actions(defaultInfoVisual).length,
    infoOption: actions(infoOptionVisual).length,
    infoInfo: actions(infoInfoVisual).length,
  },
  minimizedContainerVisible: minimizedContainer.visible,
  fonts,
  reactions: {
    defaultOptionHotspot: actions(defaultOptionHotspot),
    defaultInfoHotspot: actions(defaultInfoHotspot),
    defaultMinimize: actions(defaultMinimize),
    infoOptionHotspot: actions(infoOptionHotspot),
    infoInfoHotspot: actions(infoInfoHotspot),
    infoMinimize: actions(infoMinimize),
    minimizedRestore: actions(minimizedRestore),
  },
};
