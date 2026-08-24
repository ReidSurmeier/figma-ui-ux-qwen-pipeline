import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const manifestPaths = [
  resolve(root, "artifacts/qa/runtime-component-manifest.json"),
  resolve(root, "godot/data/runtime-component-manifest.json"),
];
const manifest = JSON.parse(await readFile(manifestPaths[0], "utf8"));
const affected = new Set([
  "basic-info", "status", "inventory", "equipment", "exchange", "game-menu", "party",
]);
const donorAlpha = "a*(((r>0.35)&&(b>0.35)&&(g<0.48)&&((r-g)>0.12)&&((b-g)>0.12))?0:1)";
const work = await mkdtemp(resolve(tmpdir(), "qwen-owned-window-assets-"));

const run = (...args) => execFileSync(args[0], args.slice(1), { stdio: "inherit" });

try {
  for (const window of manifest.windows.filter(({ id }) => affected.has(id))) {
    const { width, height } = window.geometry;
    const sourceReference = resolve(
      root,
      `benchmarks/japanese-rpg-options-v001/regions/${window.id}/reference.png`,
    );
    const ownershipReference = resolve(
      root,
      `artifacts/qa/standalone-windows-v001/${window.id}/source-surface-mask.png`,
    );
    const structural = resolve(
      root,
      `prototype/public/assets/japanese-rpg-v001/${window.id}/clean-plate-qwen-structural.png`,
    );
    const source = resolve(work, `${window.id}-source.png`);
    const ownership = resolve(work, `${window.id}-ownership.png`);
    const sourceLayer = resolve(work, `${window.id}-source-layer.png`);
    let currentPlate = resolve(work, `${window.id}-plate-000.png`);

    run("convert", sourceReference, "-crop", `${width}x${height}+0+0`, "+repage", source);
    run("convert", ownershipReference, "-crop", `${width}x${height}+0+0`, "+repage", ownership);
    run("convert", source, ownership, "-alpha", "off", "-compose", "CopyOpacity", "-composite", sourceLayer);
    run("composite", sourceLayer, structural, currentPlate);

    for (const [index, component] of window.components.entries()) {
      const geometry = component.geometry;
      if (geometry.x < 0 || geometry.y < 0
        || geometry.x + geometry.width > width
        || geometry.y + geometry.height > height) {
        // Party's back/next/sell satellites are independent desktop controls,
        // not pixels owned by the 160x157 movable Party body.
        if (window.id === "party" && component.id.startsWith("party-action-")) {
          component.assetPath = `/assets/japanese-rpg-v001/party/components/${component.id.replace("party-", "")}.png`;
        }
        continue;
      }
      const size = `${geometry.width}x${geometry.height}`;
      const offset = `+${geometry.x}+${geometry.y}`;
      const existing = resolve(root, "prototype/public", component.assetPath.replace(/^\//, ""));
      const sourceCrop = resolve(work, `${window.id}-${index}-source.png`);
      const ownershipCrop = resolve(work, `${window.id}-${index}-ownership.png`);
      const alpha = resolve(work, `${window.id}-${index}-alpha.png`);
      const finalMask = resolve(work, `${window.id}-${index}-mask.png`);
      const sourceOwned = resolve(work, `${window.id}-${index}-source-owned.png`);
      const structuralPatch = resolve(work, `${window.id}-${index}-structural.png`);
      const clearPatch = resolve(work, `${window.id}-${index}-clear.png`);
      const nextPlate = resolve(work, `${window.id}-plate-${String(index + 1).padStart(3, "0")}.png`);

      run("convert", source, "-crop", `${size}${offset}`, "+repage", sourceCrop);
      run("convert", ownership, "-crop", `${size}${offset}`, "+repage", ownershipCrop);
      // Binary ownership avoids blending already-antialiased source pixels a
      // second time, which previously weakened Japanese glyphs and borders.
      run("convert", existing, "-alpha", "extract", "-threshold", "1%", alpha);
      run("convert", ownershipCrop, alpha, "-compose", "Multiply", "-composite", finalMask);
      run(
        "convert", sourceCrop, finalMask,
        "-alpha", "off", "-compose", "CopyOpacity", "-composite",
        "(", "+clone", "-channel", "A", "-fx", donorAlpha, "+channel", ")",
        "-compose", "CopyOpacity", "-composite",
        sourceOwned,
      );
      run("convert", structural, "-crop", `${size}${offset}`, "+repage", structuralPatch);
      run("convert", structuralPatch, alpha, "-alpha", "off", "-compose", "CopyOpacity", "-composite", clearPatch);
      run("composite", "-geometry", offset, clearPatch, currentPlate, nextPlate);
      currentPlate = nextPlate;

      const relative = `/assets/japanese-rpg-v001/${window.id}/components/source-owned/${component.id}.png`;
      const outputs = [
        resolve(root, "prototype/public", relative.replace(/^\//, "")),
        resolve(root, "godot/assets/windows", relative.replace(/^\/assets\/japanese-rpg-v001\//, "japanese-rpg-v001/")),
      ];
      for (const output of outputs) {
        await mkdir(resolve(output, ".."), { recursive: true });
        run("convert", sourceOwned, output);
      }
      component.assetPath = relative;
    }

    const plateRelative = `/assets/japanese-rpg-v001/${window.id}/clean-plate-qwen-owned.png`;
    const plateOutputs = [
      resolve(root, "prototype/public", plateRelative.replace(/^\//, "")),
      resolve(root, "godot/assets/windows", plateRelative.replace(/^\/assets\/japanese-rpg-v001\//, "japanese-rpg-v001/")),
    ];
    for (const output of plateOutputs) {
      await mkdir(resolve(output, ".."), { recursive: true });
      run(
        "convert", currentPlate,
        "(", "+clone", "-channel", "A", "-fx", donorAlpha, "+channel", ")",
        "-compose", "CopyOpacity", "-composite",
        output,
      );
    }
    window.cleanPlate = plateRelative;
    process.stdout.write(`${window.id}: ${window.components.length} source-owned components over Qwen chrome\n`);
  }

  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  for (const path of manifestPaths) await writeFile(path, serialized);
} finally {
  await rm(work, { recursive: true, force: true });
}
