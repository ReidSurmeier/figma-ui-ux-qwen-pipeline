import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const sourcePath = resolve(root, "benchmarks/japanese-rpg-options-v001/regions/exchange/reference.png");
const priorPlatePath = resolve(root, "prototype/public/assets/japanese-rpg-v001/exchange/clean-plate.png");
const outputPaths = [
  resolve(root, "prototype/public/assets/japanese-rpg-v001/exchange/clean-plate-source-locked.png"),
  resolve(root, "godot/assets/windows/japanese-rpg-v001/exchange/clean-plate-source-locked.png"),
];

const dynamicZones = [
  { left: 5, top: 19, width: 272, height: 68 },
  { left: 4, top: 101, width: 40, height: 18 },
  { left: 121, top: 101, width: 42, height: 18 },
  { left: 235, top: 101, width: 41, height: 18 },
];

for (const outputPath of outputPaths) {
  await mkdir(resolve(outputPath, ".."), { recursive: true });
  const args = [sourcePath];
  for (const zone of dynamicZones) {
    args.push(
      "(", priorPlatePath,
      "-crop", `${zone.width}x${zone.height}+${zone.left}+${zone.top}`,
      "+repage", ")",
      "-geometry", `+${zone.left}+${zone.top}`,
      "-composite",
    );
  }
  args.push(outputPath);
  execFileSync("convert", args, { stdio: "inherit" });
}
