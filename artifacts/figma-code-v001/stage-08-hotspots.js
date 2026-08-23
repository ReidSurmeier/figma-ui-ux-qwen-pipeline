
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
const definitions = [{"id":"game-menu","ariaLabel":"ゲームメニュー","controls":[{"id":"Return to last save point","role":"button","geometry":{"x":0,"y":29,"width":193,"height":22}},{"id":"Character Select","role":"button","geometry":{"x":0,"y":54,"width":193,"height":22}},{"id":"Exit to Windows","role":"button","geometry":{"x":0,"y":79,"width":193,"height":22}},{"id":"Return to game","role":"button","geometry":{"x":0,"y":104,"width":193,"height":22}}]},{"id":"party","ariaLabel":"パーティー (Riri-Soft)","controls":[{"id":"パーティー (Riri-Soft)を閉じる","role":"button","geometry":{"x":96,"y":0,"width":13,"height":18}},{"id":"SakumaRiri","role":"option","geometry":{"x":3,"y":19,"width":154,"height":19}},{"id":"Sebas'","role":"option","geometry":{"x":3,"y":38,"width":154,"height":19}},{"id":"ANRI(砂漠の都市モロク)","role":"option","geometry":{"x":3,"y":57,"width":154,"height":19}},{"id":"Show_A","role":"option","geometry":{"x":3,"y":76,"width":154,"height":19}},{"id":"Ayanalshizuka","role":"option","geometry":{"x":3,"y":95,"width":154,"height":19}},{"id":"back","role":"button","geometry":{"x":170,"y":1,"width":41,"height":20}},{"id":"next","role":"button","geometry":{"x":170,"y":24,"width":41,"height":20}},{"id":"sell","role":"button","geometry":{"x":170,"y":47,"width":41,"height":20}},{"id":"パーティーツール 1","role":"button","geometry":{"x":4,"y":115,"width":29,"height":20}},{"id":"パーティーツール 2","role":"button","geometry":{"x":33,"y":115,"width":29,"height":20}},{"id":"パーティーツール 3","role":"button","geometry":{"x":62,"y":115,"width":29,"height":20}},{"id":"パーティーツール 4","role":"button","geometry":{"x":91,"y":115,"width":29,"height":20}},{"id":"パーティーツール 5","role":"button","geometry":{"x":120,"y":115,"width":29,"height":20}},{"id":"友達","role":"button","geometry":{"x":3,"y":135,"width":76,"height":20}},{"id":"パーティー","role":"button","geometry":{"x":80,"y":135,"width":77,"height":20}}]},{"id":"quickbar","ariaLabel":"クイックスロット","controls":[{"id":"クイックスロット 1","role":"button","geometry":{"x":2,"y":2,"width":42,"height":42}},{"id":"クイックスロット 2","role":"button","geometry":{"x":44,"y":1,"width":42,"height":43}},{"id":"クイックスロット 3","role":"button","geometry":{"x":2,"y":50,"width":76,"height":42}}]},{"id":"compact-info","ariaLabel":"簡易情報","controls":[]},{"id":"bottom-bar","ariaLabel":"クイックスロットバー","controls":[{"id":"クイックスロット位置","role":"input","geometry":{"x":102,"y":1,"width":478,"height":19}},{"id":"前のスロット","role":"button","geometry":{"x":580,"y":0,"width":10,"height":21}},{"id":"次のスロット","role":"button","geometry":{"x":590,"y":0,"width":10,"height":21}}]},{"id":"notification","ariaLabel":"通知","controls":[{"id":"次の通知","role":"button","geometry":{"x":0,"y":0,"width":245,"height":41}}]},{"id":"options","ariaLabel":"オプション","controls":[{"id":"最小化","role":"button","geometry":{"x":251,"y":0,"width":14,"height":18}},{"id":"閉じる","role":"button","geometry":{"x":266,"y":0,"width":13,"height":18}},{"id":"option","role":"tab","geometry":{"x":5,"y":18,"width":14,"height":37}},{"id":"info","role":"tab","geometry":{"x":5,"y":55,"width":14,"height":40}},{"id":"BGMを下げる","role":"button","geometry":{"x":74,"y":20,"width":12,"height":15}},{"id":"BGM","role":"input","geometry":{"x":83,"y":22,"width":143,"height":15}},{"id":"BGMを上げる","role":"button","geometry":{"x":222,"y":20,"width":14,"height":15}},{"id":"BGM on","role":"input","geometry":{"x":237,"y":24,"width":11,"height":11}},{"id":"Effectを下げる","role":"button","geometry":{"x":74,"y":45,"width":12,"height":15}},{"id":"Effect","role":"input","geometry":{"x":83,"y":47,"width":143,"height":15}},{"id":"Effectを上げる","role":"button","geometry":{"x":222,"y":45,"width":14,"height":15}},{"id":"Effect on","role":"input","geometry":{"x":237,"y":43,"width":11,"height":11}},{"id":"Skin","role":"combobox","geometry":{"x":75,"y":65,"width":184,"height":18}},{"id":"opaque","role":"input","geometry":{"x":11,"y":102,"width":11,"height":11}},{"id":"attack","role":"input","geometry":{"x":112,"y":102,"width":11,"height":11}},{"id":"skill","role":"input","geometry":{"x":163,"y":102,"width":11,"height":11}},{"id":"item","role":"input","geometry":{"x":204,"y":102,"width":11,"height":11}}]}];
const canonicalDestinations = {"basic-info":{"HP":"State / basic-info / HP-100 / v003","SP":"State / basic-info / SP-100 / v003","status":"Editable / Japanese Basic Info / v001 / Page status","option":"Editable / Japanese Basic Info / v001 / Page option","items":"Editable / Japanese Basic Info / v001 / Page items","equip":"Editable / Japanese Basic Info / v001 / Page equip","skill":"Editable / Japanese Basic Info / v001 / Page skill","map":"Editable / Japanese Basic Info / v001 / Page map","chat":"Editable / Japanese Basic Info / v001 / Page chat","friend":"Editable / Japanese Basic Info / v001 / Page friend"},"card":{"カード情報スクロール":"State / card / scroll-100 / v003"},"skills":{"スキルスクロール":"State / skills / scroll-100 / v003"},"status":{"stats":"Editable / Japanese Status / v001 / Stats","info":"Editable / Japanese Status / v001 / Info","Strを上げる":"Editable / Japanese Status / v001 / Stat Str changed","Agiを上げる":"Editable / Japanese Status / v001 / Stat Agi changed","Vitを上げる":"Editable / Japanese Status / v001 / Stat Vit changed","Dexを上げる":"Editable / Japanese Status / v001 / Stat Dex changed","Lukを上げる":"Editable / Japanese Status / v001 / Stat Luk changed"},"inventory":{"所持品スクロール":"State / inventory / scroll-100 / v003"},"chat":{"公開":"State / chat / privacy-public / v003","非公開":"State / chat / privacy-private / v003"},"bottom-bar":{"クイックスロット位置":"State / bottom-bar / position-100 / v003"},"options":{"BGM":"State / options / BGM-100 / v003","Effect":"State / options / Effect-100 / v003","BGM on":"State / options / BGM-on / v003","Effect on":"State / options / Effect-off / v003","opaque":"State / options / opaque-on / v003","attack":"State / options / attack-off / v003","skill":"State / options / skill-on / v003","item":"State / options / item-off / v003"}};
const minimizedIds = new Set(["basic-info", "card", "status", "inventory", "equipment", "exchange", "options"]);
const results = [];
for (const definition of definitions) {
  const window = findWindow(root, definition.id);
  const review = page.children.find((node) => node.name === `Review / ${definition.ariaLabel} / v001`);
  if (!review || review.type !== "FRAME") throw new Error(`Review destination missing for ${definition.id}`);
  const minimized = minimizedIds.has(definition.id)
    ? page.children.find((node) => node.name === `Review / ${definition.ariaLabel} / v001 / Qwen minimized`)
    : null;
  const expectedNames = new Set(definition.controls.map((control, controlIndex) => `interaction/${definition.id}/${controlIndex}/${control.id}`));
  const removed = [];
  for (const child of [...window.children]) {
    if (child.name.startsWith(`interaction/${definition.id}/`) && !expectedNames.has(child.name)) {
      removed.push(child.id);
      child.remove();
    }
  }
  let hotspotCount = 0;
  for (let controlIndex = 0; controlIndex < definition.controls.length; controlIndex += 1) {
    const control = definition.controls[controlIndex];
    const hotspotName = `interaction/${definition.id}/${controlIndex}/${control.id}`;
    const existing = window.children.find((node) => node.name === hotspotName);
    const hotspot = existing?.type === "RECTANGLE" ? existing : figma.createRectangle();
    if (!existing) {
      hotspot.name = hotspotName;
      hotspot.fills = [{type:"SOLID",color:{r:0,g:0,b:0},opacity:0.001}];
      window.appendChild(hotspot);
    }
    hotspot.resize(Math.max(1, control.geometry.width), Math.max(1, control.geometry.height));
    hotspot.x = control.geometry.x;
    hotspot.y = control.geometry.y;
    const canonicalName = canonicalDestinations[definition.id]?.[control.id];
    const canonical = canonicalName ? page.children.find((node) => node.name === canonicalName) : null;
    const destination = minimized && /最小化|minimize/i.test(control.id) ? minimized : canonical ?? review;
    const duration = /スクロール|位置|^(BGM|Effect|HP|SP)$/.test(control.id) ? 0.16 : / on$|^(opaque|attack|skill|item|公開|非公開)$/.test(control.id) ? 0.08 : 0.2;
    hotspot.reactions = [{trigger:{type:"ON_CLICK"},actions:[{type:"NODE",destinationId:destination.id,navigation:"NAVIGATE",transition:{type:"SMART_ANIMATE",duration,easing:{type:duration===0.2?"EASE_OUT":"LINEAR"}}}]}];
    hotspotCount += 1;
  }
  if (minimized && minimized.type === "FRAME") minimized.reactions = [{trigger:{type:"ON_CLICK"},actions:[{type:"BACK"}]}];
  results.push({id:definition.id,hotspots:hotspotCount,removed,reviewId:review.id,minimizedId:minimized?.id??null});
}
return {results};
