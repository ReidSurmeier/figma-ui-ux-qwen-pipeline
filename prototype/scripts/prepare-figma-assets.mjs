import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const prototypeDir = resolve(import.meta.dirname, "..");
const repoDir = resolve(prototypeDir, "..");
const manifest = JSON.parse(await readFile(resolve(repoDir, "artifacts/qa/runtime-component-manifest.json"), "utf8"));
const outputDir = resolve(repoDir, "artifacts/figma-upload-v001");
await mkdir(outputDir, { recursive: true });

const assets = new Map();
const register = (sourceUrl, semanticKey) => {
  if (!sourceUrl || assets.has(sourceUrl)) return;
  const sourcePath = sourceUrl.startsWith("/assets/")
    ? resolve(prototypeDir, "public", sourceUrl.slice(1))
    : resolve(repoDir, sourceUrl);
  const extension = basename(sourcePath).split(".").at(-1);
  const uploadName = `${semanticKey.replace(/[^a-zA-Z0-9_-]+/g, "--")}.${extension}`;
  assets.set(sourceUrl, { sourceUrl, sourcePath, uploadName, uploadPath: resolve(outputDir, uploadName) });
};

for (const window of manifest.windows) {
  register(window.cleanPlate, `${window.id}--clean-plate`);
  for (const component of window.components) register(component.assetPath, `${window.id}--${component.id}`);
}

for (const id of ["basic-info", "card", "status", "inventory", "equipment", "exchange"]) {
  register(`/assets/japanese-rpg-v001/${id}/minimized-plate.png`, `${id}--minimized-plate`);
}
register("/assets/japanese-options-v001/clean-plate-alpha-edge.png", "options--clean-plate-alpha-edge");
register("/assets/japanese-options-v001/components/minimized-plate.png", "options--minimized-plate");
register("artifacts/qa/source-visuals/full.png", "runtime--full-reference");

for (const asset of assets.values()) await copyFile(asset.sourcePath, asset.uploadPath);
await writeFile(resolve(outputDir, "assets.json"), `${JSON.stringify({ schemaVersion: "1.0", assets: [...assets.values()] }, null, 2)}\n`);
process.stdout.write(`prepared ${assets.size} uniquely named final Figma assets\n`);
