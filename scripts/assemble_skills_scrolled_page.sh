#!/usr/bin/env bash
set -euo pipefail

readonly REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly PAGE_CANDIDATE="${REPO_DIR}/artifacts/runs/japanese-skills-scrolled-page-v001/image-01.png"
readonly ROW_FOUR_CANDIDATE="${REPO_DIR}/artifacts/runs/japanese-skills-scrolled-row-four-v002/image-01.png"
readonly OUTPUT_DIR="${REPO_DIR}/prototype/public/assets/japanese-rpg-v001/skills/components"
readonly WORK_DIR="$(mktemp -d)"
trap 'rm -rf -- "${WORK_DIR}"' EXIT

test -f "${PAGE_CANDIDATE}"
test -f "${ROW_FOUR_CANDIDATE}"
install -d "${OUTPUT_DIR}"

# Qwen kept the four semantic rows but compressed them to unequal raster bands.
# These are the measured 4x candidate bands; each is normalized to the source
# 36-pixel runtime row only after extraction.
row_starts=(72 188 332 460)
row_heights=(116 144 112 124)

for row in 0 1 2 3; do
  candidate="${PAGE_CANDIDATE}"
  if [[ "${row}" == "3" ]]; then
    candidate="${ROW_FOUR_CANDIDATE}"
  fi
  row_y="${row_starts[${row}]}"
  row_height="${row_heights[${row}]}"
  convert "${candidate}" -crop "136x${row_height}+$((41 * 4))+${row_y}" +repage \
    -filter point -resize 34x34\! -strip "${OUTPUT_DIR}/page-2-icon-${row}.png"
  convert "${candidate}" -crop "112x${row_height}+$((75 * 4))+${row_y}" +repage \
    -filter point -resize 28x34\! -strip "${OUTPUT_DIR}/page-2-level-${row}.png"
  convert "${candidate}" -crop "564x${row_height}+$((104 * 4))+${row_y}" +repage \
    -filter point -resize 141x36\! -strip "${OUTPUT_DIR}/page-2-copy-${row}.png"
done

identify "${OUTPUT_DIR}"/page-2-{icon,level,copy}-{0,1,2,3}.png
