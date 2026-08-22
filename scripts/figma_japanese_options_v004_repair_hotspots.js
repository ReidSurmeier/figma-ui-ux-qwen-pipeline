const placements = [
  ["27:145", 5, 18],
  ["27:146", 5, 55],
  ["27:149", 5, 18],
  ["27:151", 5, 55],
];

const repaired = [];
for (const [id, x, y] of placements) {
  const node = await figma.getNodeByIdAsync(id);
  if (!node || node.type !== "RECTANGLE") {
    throw new Error(`Missing hotspot rectangle ${id}`);
  }
  node.layoutPositioning = "ABSOLUTE";
  node.x = x;
  node.y = y;
  repaired.push({ id: node.id, parentId: node.parent?.id ?? null, x: node.x, y: node.y });
}

return { repaired };
