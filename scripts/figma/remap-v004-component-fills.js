const page = figma.root.children.find((node) => node.id === "5:2" || node.name === "02 Components");
await figma.setCurrentPageAsync(page);

const sourceByTarget = {
  "18:7": "18:11",
  "18:8": "18:7",
  "18:11": "18:8",
  "18:18": "18:19",
  "18:19": "18:18",
  "18:20": "18:25",
  "18:21": "18:22",
  "18:22": "18:23",
  "18:23": "18:24",
  "18:24": "18:21",
  "18:25": "18:20",
};

const snapshots = {};
for (const sourceId of new Set(Object.values(sourceByTarget))) {
  const source = await figma.getNodeByIdAsync(sourceId);
  snapshots[sourceId] = source.fills.map((paint) => ({ ...paint }));
}

const mutatedNodeIds = [];
for (const [targetId, sourceId] of Object.entries(sourceByTarget)) {
  const target = await figma.getNodeByIdAsync(targetId);
  target.fills = snapshots[sourceId];
  mutatedNodeIds.push(target.id);
}
return { mutatedNodeIds, sourceByTarget };
