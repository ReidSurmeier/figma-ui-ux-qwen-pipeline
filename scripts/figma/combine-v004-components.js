const page = figma.root.children.find((node) => node.id === "5:2" || node.name === "02 Components");
await figma.setCurrentPageAsync(page);

const components = page.children.filter((node) =>
  node.type === "COMPONENT"
  && node.getSharedPluginData("golfstudio.pipeline", "version") === "v004"
);
if (components.length !== 22) throw new Error(`Expected 22 v004 components, found ${components.length}`);

const componentSet = figma.combineAsVariants(components, page);
componentSet.name = "GolfStudio / Tested Interaction View V004";
componentSet.description = "Source-faithful GolfStudio states used by the gesture-tested v004 prototype. Menus, trackbars, selections, and swing frames change immediately without Smart Animate.";
componentSet.x = 0;
componentSet.y = 1040;
componentSet.setSharedPluginData("golfstudio.pipeline", "version", "v004");
return {
  createdNodeIds: [componentSet.id],
  mutatedNodeIds: components.map((node) => node.id),
  componentSetId: componentSet.id,
  variants: components.map((node) => ({ id: node.id, name: node.name })),
};
