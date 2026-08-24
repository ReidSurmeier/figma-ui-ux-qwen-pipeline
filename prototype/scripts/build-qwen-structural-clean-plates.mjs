import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const qwenChrome = resolve(root, "artifacts/runs/japanese-status-clean-plate-v001/image-01.png");
const qwenBody = resolve(root, "artifacts/runs/japanese-status-derived-stats-v004/image-01.png");
const windows = [
  { id: "basic-info", width: 280, height: 120 },
  { id: "status", width: 280, height: 126 },
  { id: "inventory", width: 280, height: 137 },
  { id: "equipment", width: 280, height: 152 },
  { id: "exchange", width: 280, height: 120 },
  { id: "game-menu", width: 222, height: 133 },
  { id: "party", width: 160, height: 157 },
];
const work = await mkdtemp(resolve(tmpdir(), "qwen-structural-plates-"));

try {
  for (const window of windows) {
    const title = resolve(work, `${window.id}-title.png`);
    const body = resolve(work, `${window.id}-body.png`);
    const base = resolve(work, `${window.id}-base.png`);
    const composed = resolve(work, `${window.id}-composed.png`);
    const bordered = resolve(work, `${window.id}-bordered.png`);
    execFileSync("convert", [
      qwenChrome,
      "-filter", "point",
      "-resize", `${window.width}x126!`,
      "-crop", `${window.width}x18+0+0`,
      "+repage",
      title,
    ]);
    execFileSync("convert", [
      qwenBody,
      "-filter", "point",
      "-resize", "180x108!",
      "-crop", "1x1+10+10",
      "+repage",
      "-filter", "point",
      "-resize", `${window.width}x${window.height - 18}!`,
      body,
    ]);
    execFileSync("convert", ["-size", `${window.width}x${window.height}`, "xc:#ffffff", base]);
    execFileSync("composite", ["-geometry", "+0+0", title, base, composed]);
    execFileSync("composite", ["-geometry", "+0+18", body, composed, bordered]);

    const outputs = [
      resolve(root, `prototype/public/assets/japanese-rpg-v001/${window.id}/clean-plate-qwen-structural.png`),
      resolve(root, `godot/assets/windows/japanese-rpg-v001/${window.id}/clean-plate-qwen-structural.png`),
    ];
    for (const output of outputs) {
      await mkdir(resolve(output, ".."), { recursive: true });
      execFileSync("convert", [
        bordered,
        "-stroke", "#7891aa",
        "-strokewidth", "1",
        "-fill", "none",
        "-draw", `rectangle 0,0 ${window.width - 1},${window.height - 1}`,
        "-alpha", "set",
        "-channel", "A",
        "-fx", "(((j<1||j>=h-1)&&(i<5||i>=w-5))||((j<2||j>=h-2)&&(i<4||i>=w-4))||((j<4||j>=h-4)&&(i<2||i>=w-2))||((j<6||j>=h-6)&&(i<1||i>=w-1))||((r>0.35)&&(b>0.35)&&(g<0.48)&&((r-g)>0.12)&&((b-g)>0.12)))?0:a",
        output,
      ]);
    }
    process.stdout.write(`${window.id}: Qwen structural plate ${window.width}x${window.height}\n`);
  }
} finally {
  await rm(work, { recursive: true, force: true });
}
