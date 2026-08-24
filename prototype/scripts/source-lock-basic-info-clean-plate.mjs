import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const sourcePath = resolve(root, "benchmarks/japanese-rpg-options-v001/regions/basic-info/reference.png");
const priorPlatePath = resolve(root, "prototype/public/assets/japanese-rpg-v001/basic-info/clean-plate.png");
const outputPaths = [
  resolve(root, "prototype/public/assets/japanese-rpg-v001/basic-info/clean-plate-source-locked.png"),
  resolve(root, "godot/assets/windows/japanese-rpg-v001/basic-info/clean-plate-source-locked.png"),
];

// Start with exact source structure. Restore the empty Qwen plate only under
// controls whose visible assets move or change, preventing donor ghosts while
// retaining the exact title, Japanese copy, dividers, and rounded perimeter.
const dynamicZones = [
  { left: 111, top: 22, width: 86, height: 11 },
  { left: 111, top: 43, width: 86, height: 11 },
  { left: 207, top: 22, width: 70, height: 95 },
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
