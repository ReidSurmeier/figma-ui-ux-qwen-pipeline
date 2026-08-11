const page = figma.root.children.find((node) => node.id === "5:2" || node.name === "02 Components");
await figma.setCurrentPageAsync(page);

return {
  page: { id: page.id, name: page.name },
  children: page.children.map((node) => ({
    id: node.id,
    name: node.name,
    type: node.type,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    children: "children" in node ? node.children.map((child) => ({
      id: child.id,
      name: child.name,
      type: child.type,
      width: child.width,
      height: child.height,
      fills: "fills" in child ? child.fills : undefined,
    })) : [],
  })),
};
