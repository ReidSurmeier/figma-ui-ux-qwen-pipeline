const page = figma.root.children.find((node) => node.id === "0:1" || node.name === "01 Final UI");
await figma.setCurrentPageAsync(page);

return page.children.map((node) => ({
  id: node.id,
  name: node.name,
  type: node.type,
  x: node.x,
  y: node.y,
  width: node.width,
  height: node.height,
  fills: "fills" in node ? node.fills : undefined,
}));
