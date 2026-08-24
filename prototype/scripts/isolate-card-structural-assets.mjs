import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const source = resolve(repoRoot, "benchmarks/japanese-rpg-options-v001/regions/card/reference.png");
const browserAsset = resolve(repoRoot, "prototype/public/assets/japanese-rpg-v001/card/components/header-left-plate.png");
const godotAsset = resolve(repoRoot, "godot/assets/windows/japanese-rpg-v001/card/components/header-left-plate.png");
const sourceArt = resolve(repoRoot, "prototype/public/assets/japanese-rpg-v001/card/components/art.png");
const browserArt = resolve(repoRoot, "prototype/public/assets/japanese-rpg-v001/card/components/art-isolated-source-locked.png");
const godotArt = resolve(repoRoot, "godot/assets/windows/japanese-rpg-v001/card/components/art-isolated-source-locked.png");
const browserPanel = resolve(repoRoot, "prototype/public/assets/japanese-rpg-v001/card/components/art-panel-empty.png");
const godotPanel = resolve(repoRoot, "godot/assets/windows/japanese-rpg-v001/card/components/art-panel-empty.png");
const mask = resolve(repoRoot, "artifacts/qa/godot-options-v001/card-art-source-mask.png");

mkdirSync(dirname(browserAsset), { recursive: true });
mkdirSync(dirname(godotAsset), { recursive: true });

// This region is fully visible source structure, not a generated state. Crop it
// exactly, then remove only the flat desktop pink so the window remains movable
// without carrying a rectangular screenshot background.
execFileSync("convert", [
  source,
  "-crop", "86x18+0+0",
  "+repage",
  "-alpha", "on",
  "-fuzz", "1%",
  "-transparent", "#ff00fc",
  browserAsset,
]);
copyFileSync(browserAsset, godotAsset);

mkdirSync(dirname(mask), { recursive: true });
execFileSync("convert", [
  sourceArt,
  "-alpha", "off",
  "-fx", "(i<12||i>78||j<6||j>91)?0:min(1,max(max(1-r,1-g),1-b)*6)",
  mask,
]);
execFileSync("convert", [
  sourceArt,
  mask,
  "-alpha", "off",
  "-compose", "CopyOpacity",
  "-composite",
  browserArt,
]);
copyFileSync(browserArt, godotArt);

// The source cell interior is flat white. Preserve its captured stepped left
// and bottom bevel pixels while replacing only the semantic art/shadow area.
execFileSync("convert", [
  sourceArt,
  "-fill", "#ffffff",
  "-draw", "rectangle 4,0 81,91",
  browserPanel,
]);
copyFileSync(browserPanel, godotPanel);

console.log(JSON.stringify({ source, browserAsset, godotAsset, browserArt, godotArt, browserPanel, godotPanel, mask }));
