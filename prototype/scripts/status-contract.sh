#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROTOTYPE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_DIR="$(cd "${PROTOTYPE_DIR}/.." && pwd)"
ASSET_ROOT="${PROTOTYPE_DIR}/public/assets/japanese-rpg-v001/status"
RUNTIME_SOURCE="${PROTOTYPE_DIR}/src/StatusSourceWindow.tsx"

[[ "$(find "${ASSET_ROOT}/components" -maxdepth 1 -name '*.png' | wc -l)" == "17" ]]
[[ "$(identify -format '%wx%h' "${ASSET_ROOT}/clean-plate.png")" == "280x126" ]]
[[ "$(identify -format '%wx%h' "${ASSET_ROOT}/minimized-plate.png")" == "180x18" ]]
[[ "$(convert "${ASSET_ROOT}/clean-plate.png" -alpha extract -crop 1x1+0+0 -format '%[fx:mean]' info:)" == "0" ]]
awk -v alpha="$(convert "${ASSET_ROOT}/clean-plate.png" -alpha extract -crop 1x1+140+0 -format '%[fx:mean]' info:)" 'BEGIN { exit !(alpha > 0.9) }'
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

printf 'status-contract: PASS selected Qwen donors, rounded pixel corners, empty OCR, independent rasters, zero opaque pink, and generated compact endpoint\n'
