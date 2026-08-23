
const page = await figma.getNodeByIdAsync("0:1");
if (!page || page.type !== "PAGE") throw new Error("Page 0:1 is missing");
const ROOT_NAME = "Editable / Japanese RPG Desktop / v001 / Qwen componentized";
const REF_NAME = "Verification / Japanese RPG Desktop / v001 / Runtime settled";
const imageFill = (imageHash) => [{ type: "IMAGE", scaleMode: "FILL", imageHash }];
const latestAsset = (name) => {
  const matches = page.children.filter((node) => node.name === name);
  const node = matches.at(-1);
  if (!node || node.type !== "FRAME") throw new Error(`Missing uploaded asset ${name}`);
  const fill = Array.isArray(node.fills) ? node.fills.find((candidate) => candidate.type === "IMAGE") : null;
  if (!fill?.imageHash) throw new Error(`Uploaded asset ${name} has no image hash`);
  return fill.imageHash;
};
const findRoot = () => {
  const root = page.children.find((node) => node.name === ROOT_NAME);
  if (!root || root.type !== "FRAME") throw new Error("Final desktop root is missing");
  return root;
};
const findWindow = (root, id) => {
  const node = root.children.find((candidate) => candidate.name === `ui/${id}/window`);
  if (!node || node.type !== "FRAME") throw new Error(`Window ${id} is missing`);
  return node;
};

const root = findRoot();
const definitions = [{"id":"game-menu","ariaLabel":"ゲームメニュー","controls":[{"id":"Return to last save point","role":"button","geometry":{"x":0,"y":29,"width":193,"height":22}},{"id":"Character Select","role":"button","geometry":{"x":0,"y":54,"width":193,"height":22}},{"id":"Exit to Windows","role":"button","geometry":{"x":0,"y":79,"width":193,"height":22}},{"id":"Return to game","role":"button","geometry":{"x":0,"y":104,"width":193,"height":22}}]},{"id":"party","ariaLabel":"パーティー (Riri-Soft)","controls":[{"id":"パーティー (Riri-Soft)を閉じる","role":"button","geometry":{"x":96,"y":0,"width":13,"height":18}},{"id":"SakumaRiri","role":"option","geometry":{"x":3,"y":19,"width":154,"height":19}},{"id":"Sebas'","role":"option","geometry":{"x":3,"y":38,"width":154,"height":19}},{"id":"ANRI(砂漠の都市モロク)","role":"option","geometry":{"x":3,"y":57,"width":154,"height":19}},{"id":"Show_A","role":"option","geometry":{"x":3,"y":76,"width":154,"height":19}},{"id":"Ayanalshizuka","role":"option","geometry":{"x":3,"y":95,"width":154,"height":19}},{"id":"back","role":"button","geometry":{"x":170,"y":1,"width":41,"height":20}},{"id":"next","role":"button","geometry":{"x":170,"y":24,"width":41,"height":20}},{"id":"sell","role":"button","geometry":{"x":170,"y":47,"width":41,"height":20}},{"id":"パーティーツール 1","role":"button","geometry":{"x":4,"y":115,"width":29,"height":20}},{"id":"パーティーツール 2","role":"button","geometry":{"x":33,"y":115,"width":29,"height":20}},{"id":"パーティーツール 3","role":"button","geometry":{"x":62,"y":115,"width":29,"height":20}},{"id":"パーティーツール 4","role":"button","geometry":{"x":91,"y":115,"width":29,"height":20}},{"id":"パーティーツール 5","role":"button","geometry":{"x":120,"y":115,"width":29,"height":20}},{"id":"友達","role":"button","geometry":{"x":3,"y":135,"width":76,"height":20}},{"id":"パーティー","role":"button","geometry":{"x":80,"y":135,"width":77,"height":20}}]},{"id":"quickbar","ariaLabel":"クイックスロット","controls":[{"id":"クイックスロット 1","role":"button","geometry":{"x":2,"y":2,"width":42,"height":42}},{"id":"クイックスロット 2","role":"button","geometry":{"x":44,"y":1,"width":42,"height":43}},{"id":"クイックスロット 3","role":"button","geometry":{"x":2,"y":50,"width":76,"height":42}}]},{"id":"compact-info","ariaLabel":"簡易情報","controls":[{"id":"簡易HP","role":"input","geometry":{"x":16,"y":19,"width":118,"height":15}},{"id":"簡易SP","role":"input","geometry":{"x":145,"y":19,"width":132,"height":15}}]},{"id":"bottom-bar","ariaLabel":"クイックスロットバー","controls":[{"id":"クイックスロット位置","role":"input","geometry":{"x":102,"y":1,"width":478,"height":19}},{"id":"前のスロット","role":"button","geometry":{"x":580,"y":0,"width":10,"height":21}},{"id":"次のスロット","role":"button","geometry":{"x":590,"y":0,"width":10,"height":21}}]},{"id":"notification","ariaLabel":"通知","controls":[{"id":"次の通知","role":"button","geometry":{"x":0,"y":0,"width":245,"height":41}}]},{"id":"options","ariaLabel":"オプション","controls":[{"id":"最小化","role":"button","geometry":{"x":251,"y":0,"width":14,"height":18}},{"id":"閉じる","role":"button","geometry":{"x":266,"y":0,"width":13,"height":18}},{"id":"option","role":"tab","geometry":{"x":5,"y":18,"width":14,"height":37}},{"id":"info","role":"tab","geometry":{"x":5,"y":55,"width":14,"height":40}},{"id":"BGMを下げる","role":"button","geometry":{"x":74,"y":20,"width":12,"height":15}},{"id":"BGM","role":"input","geometry":{"x":83,"y":22,"width":143,"height":15}},{"id":"BGMを上げる","role":"button","geometry":{"x":222,"y":20,"width":14,"height":15}},{"id":"BGM on","role":"input","geometry":{"x":237,"y":24,"width":11,"height":11}},{"id":"Effectを下げる","role":"button","geometry":{"x":74,"y":45,"width":12,"height":15}},{"id":"Effect","role":"input","geometry":{"x":83,"y":47,"width":143,"height":15}},{"id":"Effectを上げる","role":"button","geometry":{"x":222,"y":45,"width":14,"height":15}},{"id":"Effect on","role":"input","geometry":{"x":237,"y":43,"width":11,"height":11}},{"id":"Skin","role":"combobox","geometry":{"x":75,"y":65,"width":184,"height":18}},{"id":"opaque","role":"input","geometry":{"x":11,"y":102,"width":11,"height":11}},{"id":"attack","role":"input","geometry":{"x":112,"y":102,"width":11,"height":11}},{"id":"skill","role":"input","geometry":{"x":163,"y":102,"width":11,"height":11}},{"id":"item","role":"input","geometry":{"x":204,"y":102,"width":11,"height":11}}]}];
const minimizedIds = new Set(["basic-info", "card", "status", "inventory", "equipment", "exchange", "options"]);
const results = [];
for (const definition of definitions) {
  const window = findWindow(root, definition.id);
  const review = page.children.find((node) => node.name === `Review / ${definition.ariaLabel} / v001`);
  if (!review || review.type !== "FRAME") throw new Error(`Review destination missing for ${definition.id}`);
  const minimized = minimizedIds.has(definition.id)
    ? page.children.find((node) => node.name === `Review / ${definition.ariaLabel} / v001 / Qwen minimized`)
    : null;
  let hotspotCount = 0;
  for (let controlIndex = 0; controlIndex < definition.controls.length; controlIndex += 1) {
    const control = definition.controls[controlIndex];
    const hotspotName = `interaction/${definition.id}/${controlIndex}/${control.id}`;
    if (window.children.some((node) => node.name === hotspotName)) continue;
    const hotspot = figma.createRectangle();
    hotspot.name = hotspotName;
    hotspot.resize(Math.max(1, control.geometry.width), Math.max(1, control.geometry.height));
    hotspot.fills = [{type:"SOLID",color:{r:0,g:0,b:0},opacity:0.001}];
    window.appendChild(hotspot);
    hotspot.x = control.geometry.x;
    hotspot.y = control.geometry.y;
    const destination = minimized && /最小化|minimize/i.test(control.id) ? minimized : review;
    hotspot.reactions = [{trigger:{type:"ON_CLICK"},actions:[{type:"NODE",destinationId:destination.id,navigation:"NAVIGATE",transition:{type:"SMART_ANIMATE",duration:0.2,easing:{type:"EASE_OUT"}}}]}];
    hotspotCount += 1;
  }
  if (minimized && minimized.type === "FRAME") minimized.reactions = [{trigger:{type:"ON_CLICK"},actions:[{type:"BACK"}]}];
  results.push({id:definition.id,hotspots:hotspotCount,reviewId:review.id,minimizedId:minimized?.id??null});
}
return {results};
