import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoDir = resolve(import.meta.dirname, "../..");
const sourcePath = resolve(repoDir, "benchmarks/japanese-rpg-options-v001/reference.png");
const rejectedRunDir = resolve(repoDir, "artifacts/runs/japanese-desktop-background-v001");
const candidateRunDir = resolve(repoDir, "artifacts/runs/japanese-desktop-background-v002");
const outputPath = resolve(repoDir, "prototype/public/assets/japanese-rpg-v001/desktop/background.png");
const expectedHashes = {
  v001: [
    "60b4355df9603cc98d1d91da9371b9a86bdc25b410209521816b825fa3a03c42",
    "b62941e22c0c0c0db892cc83d5ef5928d37553dac6b6e83448a03683e6f031a0",
  ],
  v002: [
    "8163250553e60c75ae6234f854626993388f5cfea7460eafe77d2de68103301f",
    "0b24aae5c6b72ee0798d63c0fc59e56bc047cccb1e4c1d370e655a550ef80aab",
  ],
};

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) throw result.error;
  if (![0, 1].includes(result.status)) throw new Error(`${command} failed: ${result.stderr}`);
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function standardDeviation(path) {
  return Number(run("identify", ["-format", "%[fx:standard_deviation]", path]));
}

function normalizedMae(reference, actual) {
  const match = run("compare", ["-metric", "MAE", reference, actual, "null:"]).match(/\(([^)]+)\)/);
  if (!match) throw new Error("ImageMagick did not emit normalized MAE");
  return Number(match[1]);
}

const workDir = await mkdtemp(resolve(tmpdir(), "desktop-background-evaluation-"));
const maskPath = resolve(workDir, "exposed-source-mask.png");
const maskedSourcePath = resolve(workDir, "masked-source.png");
run("convert", [sourcePath, "-alpha", "off", "-fx", "((r>0.45)&&(b>0.45)&&(g<0.95)&&(r-g)>0.04&&(b-g)>0.04)?1:0", maskPath]);
run("convert", [sourcePath, maskPath, "-alpha", "off", "-compose", "CopyOpacity", "-composite", "-background", "black", "-alpha", "remove", maskedSourcePath]);

async function evaluate(runDir, expected, version) {
  const candidates = [];
  for (let index = 0; index < expected.length; index += 1) {
    const inputPath = resolve(runDir, `image-${String(index + 1).padStart(2, "0")}.png`);
    const actualHash = await sha256(inputPath);
    if (actualHash !== expected[index]) throw new Error(`${version} candidate ${index + 1} provenance hash drifted`);
    const resizedPath = resolve(workDir, `${version}-${index + 1}-849x564.png`);
    const maskedPath = resolve(workDir, `${version}-${index + 1}-masked.png`);
    run("convert", [inputPath, "-filter", "point", "-resize", "849x566!", "-crop", "849x564+0+0", "+repage", resizedPath]);
    run("convert", [resizedPath, maskPath, "-alpha", "off", "-compose", "CopyOpacity", "-composite", "-background", "black", "-alpha", "remove", maskedPath]);
    candidates.push({
      candidate: index + 1,
      input: inputPath.slice(repoDir.length + 1),
      sha256: actualHash,
      flatFieldStandardDeviation: standardDeviation(inputPath),
      exposedSourceNormalizedMae: normalizedMae(maskedSourcePath, maskedPath),
      resizedPath,
    });
  }
  return candidates;
}

const rejected = await evaluate(rejectedRunDir, expectedHashes.v001, "v001");
if (rejected.some(({ flatFieldStandardDeviation }) => flatFieldStandardDeviation < 0.1)) {
  throw new Error("The screenshot-copying v001 run no longer proves its rejection condition");
}

const candidates = await evaluate(candidateRunDir, expectedHashes.v002, "v002");
const eligible = candidates
  .filter(({ flatFieldStandardDeviation, exposedSourceNormalizedMae }) => flatFieldStandardDeviation <= 0.03 && exposedSourceNormalizedMae <= 0.015)
  .sort((a, b) => a.exposedSourceNormalizedMae - b.exposedSourceNormalizedMae);
if (!eligible.length) throw new Error("No clean Qwen background candidate passed the flat-field and exposed-source gates");
const selected = eligible[0];
await mkdir(dirname(outputPath), { recursive: true });
run("convert", [selected.resizedPath, "-strip", "-define", "png:exclude-chunks=date,time", outputPath]);

const report = {
  schemaVersion: "1.0",
  status: "pass",
  model: "qwen/qwen-image-3-pro",
  provider: "alibaba",
  sourceAuthority: sourcePath.slice(repoDir.length + 1),
  sourceSha256: await sha256(sourcePath),
  rejectedRun: {
    path: rejectedRunDir.slice(repoDir.length + 1),
    reason: "Reference-conditioned generation copied foreground UI instead of returning a clean background field.",
    candidates: rejected.map(({ resizedPath: _resizedPath, ...candidate }) => candidate),
  },
  acceptedRun: {
    path: candidateRunDir.slice(repoDir.length + 1),
    promptId: "5719385a-8e94-9e4e-9827-cfa8d8fb6299",
    selectedCandidate: selected.candidate,
    candidates: candidates.map(({ resizedPath: _resizedPath, ...candidate }) => candidate),
  },
  productionAsset: outputPath.slice(repoDir.length + 1),
  productionSha256: await sha256(outputPath),
};
await writeFile(resolve(candidateRunDir, "evaluation.json"), `${JSON.stringify(report, null, 2)}\n`);
await rm(workDir, { recursive: true, force: true });
process.stdout.write(`desktop-background: PASS candidate ${selected.candidate}, ${report.productionSha256}\n`);
