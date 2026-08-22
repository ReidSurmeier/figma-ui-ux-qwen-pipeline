const [defaultState, infoState, minimizedState] = await Promise.all(
  ["16:48", "16:94", "16:144"].map((id) => figma.getNodeByIdAsync(id)),
);

if (!defaultState || !infoState || !minimizedState) {
  throw new Error("A Japanese Options v002 Figma state is missing");
}

const relativeGeometry = (root, node) => ({
  x: node.absoluteTransform[0][2] - root.absoluteTransform[0][2],
  y: node.absoluteTransform[1][2] - root.absoluteTransform[1][2],
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

const defaultTitle = find(defaultState, "ui/options/title/text");
const defaultBgm = find(defaultState, "Checkbox - BGM on");
const defaultEffect = find(defaultState, "Checkbox - Effect on");
const defaultInfo = find(defaultState, "ui/options/tab/info");
const defaultMinimize = find(defaultState, "ui/options/title/minimize");
const infoOption = find(infoState, "ui/options/tab/option");
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
  roots: {
    default: {
      id: defaultState.id,
      width: defaultState.width,
      height: defaultState.height,
      imageHash: imageHash(defaultState),
    },
    info: {
      id: infoState.id,
      width: infoState.width,
      height: infoState.height,
      imageHash: imageHash(infoState),
    },
    minimized: {
      id: minimizedState.id,
      width: minimizedState.width,
      height: minimizedState.height,
      imageHash: imageHash(minimizedState),
    },
  },
  geometry: {
    title: relativeGeometry(defaultState, defaultTitle),
    bgmCheckbox: relativeGeometry(defaultState, defaultBgm),
    effectCheckbox: relativeGeometry(defaultState, defaultEffect),
    minimizedRestore: relativeGeometry(minimizedState, minimizedRestore),
    minimizedClose: relativeGeometry(minimizedState, minimizedClose),
  },
  assetImageHashes: {
    title: imageHash(defaultTitle),
    bgmCheckbox: imageHash(defaultBgm),
    effectCheckbox: imageHash(defaultEffect),
  },
  minimizedContainerVisible: minimizedContainer.visible,
  fonts,
  reactions: {
    defaultInfo: actions(defaultInfo),
    defaultMinimize: actions(defaultMinimize),
    infoOption: actions(infoOption),
    infoMinimize: actions(infoMinimize),
    minimizedRestore: actions(minimizedRestore),
  },
};
