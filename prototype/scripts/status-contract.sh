#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROTOTYPE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_DIR="$(cd "${PROTOTYPE_DIR}/.." && pwd)"
ASSET_ROOT="${PROTOTYPE_DIR}/public/assets/japanese-rpg-v001/status"
RUNTIME_SOURCE="${PROTOTYPE_DIR}/src/StatusSourceWindow.tsx"

[[ "$(find "${ASSET_ROOT}/components" -maxdepth 1 -name '*.png' | wc -l)" == "22" ]]
[[ "$(identify -format '%wx%h' "${ASSET_ROOT}/clean-plate.png")" == "280x126" ]]
[[ "$(identify -format '%wx%h' "${ASSET_ROOT}/minimized-plate.png")" == "180x18" ]]
[[ "$(convert "${ASSET_ROOT}/clean-plate.png" -alpha extract -crop 1x1+0+0 -format '%[fx:mean]' info:)" == "0" ]]
awk -v alpha="$(convert "${ASSET_ROOT}/clean-plate.png" -alpha extract -crop 1x1+140+6 -format '%[fx:mean]' info:)" 'BEGIN { exit !(alpha > 0.9) }'
! rg -q 'reference\.png|benchmarks/' "${RUNTIME_SOURCE}"

bash "${REPO_DIR}/scripts/evaluate_qwen_clean_plate.sh" "${ASSET_ROOT}/clean-plate.png" 280 126 >/dev/null

for run in \
  japanese-status-side-tabs-v001 \
  japanese-status-primary-stats-v002 \
  japanese-status-derived-stats-v004; do
  [[ "$(jq -r '.status' "${REPO_DIR}/artifacts/runs/${run}/run.json")" == "selected-local-donor" ]]
  [[ "$(jq -r '.provenance.provider' "${REPO_DIR}/artifacts/runs/${run}/run.json")" == "alibaba" ]]
  [[ "$(jq -r '.model' "${REPO_DIR}/artifacts/runs/${run}/brief.json")" == "qwen/qwen-image-3-pro" ]]
done

for asset in "${ASSET_ROOT}/clean-plate.png" "${ASSET_ROOT}/components"/*.png; do
  count="$(convert "$asset" -alpha set \
    -fx '(a>0.1&&r>0.58&&b>0.58&&g<0.7&&(r-g)>0.15&&(b-g)>0.15)?1:0' \
    -format '%[fx:mean*w*h]' info:)"
  awk -v count="$count" 'BEGIN { exit !(count < 0.5) }'
done

changed="$(compare -metric AE \
  "${REPO_DIR}/benchmarks/japanese-rpg-options-v001/regions/status/reference.png[180x18+0+0]" \
  "${ASSET_ROOT}/minimized-plate.png" null: 2>&1 || true)"
awk -v changed="$changed" 'BEGIN { exit !(changed > 10) }'

# A window is not sealable merely because its parts exist. Recompose the
# default state from the clean plate and independent rasters, then require the
# complete isolated window to meet the accepted BGM and Effect visual floor.
WORK_DIR="$(mktemp -d)"
trap 'rm -rf -- "$WORK_DIR"' EXIT
cp "${ASSET_ROOT}/clean-plate.png" "${WORK_DIR}/status-00.png"
index=0
while read -r component x y; do
  next=$((index + 1))
  composite -geometry "+${x}+${y}" \
    "${ASSET_ROOT}/components/${component}.png" \
    "${WORK_DIR}/status-$(printf '%02d' "$index").png" \
    "${WORK_DIR}/status-$(printf '%02d' "$next").png"
  index=$next
done <<'EOF'
title-icon 3 3
title-text 16 3
minimize 251 2
close 266 2
side-tabs 3 18
primary-row-0 20 18
increment-0 91 21
derived-row-0 100 18
primary-row-1 20 36
increment-1 91 39
derived-row-1 100 36
primary-row-2 20 54
increment-2 91 57
derived-row-2 100 54
primary-row-3 20 72
derived-row-3 100 72
primary-row-4 20 90
increment-4 91 93
derived-row-4 100 90
primary-row-5 20 108
increment-5 91 111
derived-row-5 100 108
EOF
composite "${WORK_DIR}/status-$(printf '%02d' "$index").png" \
  "${REPO_DIR}/benchmarks/japanese-rpg-options-v001/regions/status/reference.png" \
  "${WORK_DIR}/status-source-background.png"
mae="$(compare -metric MAE \
  "${REPO_DIR}/benchmarks/japanese-rpg-options-v001/regions/status/reference.png" \
  "${WORK_DIR}/status-source-background.png" null: 2>&1 | sed -nE 's/.*\(([^)]+)\).*/\1/p')"
awk -v mae="$mae" 'BEGIN { exit !(mae <= 0.03668) }'

printf 'status-contract: PASS selected Qwen donors, rounded pixel corners, empty OCR, independent rasters, zero opaque pink, and generated compact endpoint\n'
