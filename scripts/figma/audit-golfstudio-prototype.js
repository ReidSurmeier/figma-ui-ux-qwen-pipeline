const page = figma.root.children.find((node) => node.id === "5:3" || node.name === "03 Prototype");
await figma.setCurrentPageAsync(page);

const frames = page.children.filter((node) => node.type === "FRAME");
return {
  page: { id: page.id, name: page.name, flowStartingPoints: page.flowStartingPoints },
  frames: frames.map((frame) => ({
    id: frame.id,
    name: frame.name,
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
    children: frame.children.map((child) => ({
      id: child.id,
      name: child.name,
      type: child.type,
      x: child.x,
      y: child.y,
      width: child.width,
      height: child.height,
      reactions: "reactions" in child ? child.reactions : [],
    })),
  })),
};
