import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const donorAlpha = "a*(((r>0.35)&&(b>0.35)&&(g<0.48)&&((r-g)>0.12)&&((b-g)>0.12))?0:1)";
const windows = [
  {
    id: "compact-info",
    components: [
      { name: "title-icon-source-locked.png", crop: "13x13+3+4" },
      { name: "title-text-source-locked.png", crop: "100x13+16+4" },
      { name: "levels-source-locked.png", crop: "164x13+116+4" },
      { name: "hp-source-locked.png", crop: "126x15+16+20" },
      { name: "sp-source-locked.png", crop: "138x15+142+20" },
    ],
    cleanPlateMasks: [
      "rectangle 3,4 15,16",
      "rectangle 16,4 115,16",
      "rectangle 116,4 279,16",
      "rectangle 16,20 141,34",
      "rectangle 142,20 279,34",
    ],
  },
  {
    id: "notification",
    components: [
      { name: "bubble-source-locked.png", crop: "143x41+0+0" },
      { name: "upper-source-locked.png", crop: "102x20+143+0" },
      { name: "lower-source-locked.png", crop: "102x21+143+20" },
    ],
  },
];

for (const window of windows) {
  const source = resolve(
    root,
    `benchmarks/japanese-rpg-options-v001/regions/${window.id}/reference.png`,
  );
  const directories = [
    resolve(root, `prototype/public/assets/japanese-rpg-v001/${window.id}/components`),
    resolve(root, `godot/assets/windows/japanese-rpg-v001/${window.id}/components`),
  ];

  for (const directory of directories) {
    await mkdir(directory, { recursive: true });
    for (const component of window.components) {
      // Pink and its resampling fringe belong to the donor background. Remove
      // them while retaining the source-authored blue/grey UI pixels, so the
      // component stays clean over both light and dark review plates.
      execFileSync("convert", [
        source,
        "-crop",
        component.crop,
        "+repage",
        "-alpha", "set",
        "(", "+clone", "-channel", "A", "-fx", donorAlpha, "+channel", ")",
        "-compose", "CopyOpacity", "-composite",
        resolve(directory, component.name),
      ], { stdio: "inherit" });
    }
    if (window.cleanPlateMasks) {
      execFileSync("convert", [
        source,
        "-alpha", "set",
        "(", "+clone", "-channel", "A", "-fx", donorAlpha, "+channel", ")",
        "-compose", "CopyOpacity", "-composite",
        "-channel",
        "RGBA",
        "-fill",
        "none",
        ...window.cleanPlateMasks.flatMap((mask) => ["-draw", mask]),
        resolve(directory, "..", "clean-plate-source-locked.png"),
      ], { stdio: "inherit" });
    }
  }
}
