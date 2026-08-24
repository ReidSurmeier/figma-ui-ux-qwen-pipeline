import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const sourcePath = resolve(root, "benchmarks/japanese-rpg-options-v001/regions/game-menu/reference.png");
const priorPlatePath = resolve(root, "prototype/public/assets/japanese-rpg-v001/game-menu/clean-plate.png");
const outputPaths = [
  resolve(root, "prototype/public/assets/japanese-rpg-v001/game-menu/clean-plate-source-locked.png"),
  resolve(root, "godot/assets/windows/japanese-rpg-v001/game-menu/clean-plate-source-locked.png"),
];
const actionZone = { left: 0, top: 29, width: 193, height: 97 };

for (const outputPath of outputPaths) {
  await mkdir(resolve(outputPath, ".."), { recursive: true });
  execFileSync("convert", [
    sourcePath,
    "(", priorPlatePath,
    "-crop", `${actionZone.width}x${actionZone.height}+${actionZone.left}+${actionZone.top}`,
    "+repage", ")",
    "-geometry", `+${actionZone.left}+${actionZone.top}`,
    "-composite",
    outputPath,
  ], { stdio: "inherit" });
}
