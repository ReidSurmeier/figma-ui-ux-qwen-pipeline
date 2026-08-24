import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const sourcePath = resolve(root, "benchmarks/japanese-rpg-options-v001/regions/equipment/reference.png");
const priorPlatePath = resolve(root, "prototype/public/assets/japanese-rpg-v001/equipment/clean-plate.png");
const outputPaths = [
  resolve(root, "prototype/public/assets/japanese-rpg-v001/equipment/clean-plate-source-locked.png"),
  resolve(root, "godot/assets/windows/japanese-rpg-v001/equipment/clean-plate-source-locked.png"),
];

// The Qwen plate remains the editable empty-body authority. Only structure
// already present in the source is restored: title chrome and the outer frame.
// This prevents a second model pass from redrawing exact Japanese copy or the
// rounded source perimeter while keeping all equipment rows/avatar independent.
const structuralBands = [
  { left: 0, top: 0, width: 280, height: 18 },
  { left: 0, top: 18, width: 4, height: 134 },
  { left: 276, top: 18, width: 4, height: 134 },
  { left: 0, top: 150, width: 280, height: 2 },
];

for (const outputPath of outputPaths) {
  await mkdir(resolve(outputPath, ".."), { recursive: true });
  const args = [priorPlatePath];
  for (const band of structuralBands) {
    args.push(
      "(", sourcePath,
      "-crop", `${band.width}x${band.height}+${band.left}+${band.top}`,
      "+repage", ")",
      "-geometry", `+${band.left}+${band.top}`,
      "-composite",
    );
  }
  args.push(outputPath);
  execFileSync("convert", args, { stdio: "inherit" });
}
