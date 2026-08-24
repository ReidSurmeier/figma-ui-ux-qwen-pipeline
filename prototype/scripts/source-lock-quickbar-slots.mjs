import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const donorAlpha = "a*(((r>0.35)&&(b>0.35)&&(g<0.48)&&((r-g)>0.12)&&((b-g)>0.12))?0:1)";
const source = resolve(root, "benchmarks/japanese-rpg-options-v001/regions/quickbar/reference.png");
const slots = [
  { name: "slot-0-source-locked.png", crop: "42x42+2+2" },
  { name: "slot-1-source-locked.png", crop: "42x43+44+1" },
  { name: "slot-2-source-locked.png", crop: "76x42+2+50" },
];
const directories = [
  resolve(root, "prototype/public/assets/japanese-rpg-v001/quickbar/components"),
  resolve(root, "godot/assets/windows/japanese-rpg-v001/quickbar/components"),
];

for (const directory of directories) {
  await mkdir(directory, { recursive: true });
  for (const slot of slots) {
    execFileSync("convert", [
      source, "-crop", slot.crop, "+repage",
      "-alpha", "set",
      "(", "+clone", "-channel", "A", "-fx", donorAlpha, "+channel", ")",
      "-compose", "CopyOpacity", "-composite",
      resolve(directory, slot.name),
    ], { stdio: "inherit" });
  }
}
