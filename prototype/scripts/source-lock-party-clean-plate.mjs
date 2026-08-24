import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../..");
const source = resolve(root, "benchmarks/japanese-rpg-options-v001/regions/party/reference.png");
const prior = resolve(root, "prototype/public/assets/japanese-rpg-v001/party/clean-plate.png");
const outputs = [resolve(root, "prototype/public/assets/japanese-rpg-v001/party/clean-plate-source-locked.png"), resolve(root, "godot/assets/windows/japanese-rpg-v001/party/clean-plate-source-locked.png")];
const zones = [{left:3,top:20,width:154,height:95},{left:4,top:116,width:145,height:20},{left:3,top:136,width:154,height:20}];
for (const output of outputs) {
  await mkdir(resolve(output, ".."), { recursive: true });
  const args = [source, "-crop", "160x157+0+0", "+repage"];
  for (const z of zones) args.push("(", prior, "-crop", `${z.width}x${z.height}+${z.left}+${z.top}`, "+repage", ")", "-geometry", `+${z.left}+${z.top}`, "-composite");
  args.push(output); execFileSync("convert", args, { stdio: "inherit" });
}
