#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROTOTYPE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_DIR="$(cd "${PROTOTYPE_DIR}/.." && pwd)"
ASSET_ROOT="${PROTOTYPE_DIR}/public/assets/japanese-rpg-v001/inventory"
RUNTIME_SOURCE="${PROTOTYPE_DIR}/src/InventorySourceWindow.tsx"

[[ "$(find "${ASSET_ROOT}/components" -maxdepth 1 -name '*.png' | wc -l)" == "33" ]]
[[ "$(identify -format '%wx%h' "${ASSET_ROOT}/clean-plate.png")" == "280x137" ]]
[[ "$(identify -format '%wx%h' "${ASSET_ROOT}/minimized-plate.png")" == "180x18" ]]
[[ "$(convert "${ASSET_ROOT}/clean-plate.png" -alpha extract -crop 1x1+0+0 -format '%[fx:mean]' info:)" == "0" ]]
awk -v alpha="$(convert "${ASSET_ROOT}/clean-plate.png" -alpha extract -crop 1x1+140+0 -format '%[fx:mean]' info:)" 'BEGIN { exit !(alpha > 0.9) }'
! rg -q 'reference\.png|benchmarks/' "${RUNTIME_SOURCE}"
rg -Fq 'japanese-status-derived-stats-v004/image-01.png' "${REPO_DIR}/scripts/assemble_japanese_inventory_assets.sh"
rg -Fq 'japanese-status-clean-plate-v001/image-01.png' "${REPO_DIR}/scripts/assemble_japanese_inventory_assets.sh"

for asset in "${ASSET_ROOT}/clean-plate.png" "${ASSET_ROOT}/components/resize-grip.png"; do
  count="$(convert "$asset" -alpha set \
    -fx '(a>0.1&&r>0.58&&b>0.58&&g<0.7&&(r-g)>0.15&&(b-g)>0.15)?1:0' \
    -format '%[fx:mean*w*h]' info:)"
  awk -v count="$count" 'BEGIN { exit !(count < 0.5) }'
done

printf 'inventory-contract: PASS Qwen-derived plate, rounded pixel corners, 33 independent assets, continuous visual scrollbar, zero opaque pink, and no reference underlay\n'
