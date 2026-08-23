#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
PROTOTYPE_DIR=$(cd -- "$SCRIPT_DIR/.." && pwd)
REPO_DIR=$(cd -- "$PROTOTYPE_DIR/.." && pwd)
ASSET_DIR="$PROTOTYPE_DIR/public/assets/japanese-rpg-v001/map"
COMPONENT_DIR="$ASSET_DIR/components"
SELECTION="$REPO_DIR/artifacts/runs/japanese-map-destination-v001-selection.json"
RUN="$REPO_DIR/artifacts/runs/japanese-map-destination-v001/run.json"

[[ "$(identify -format '%wx%h' "$ASSET_DIR/clean-plate.png")" == "280x150" ]]
[[ "$(identify -format '%wx%h' "$COMPONENT_DIR/title-icon.png")" == "16x15" ]]
[[ "$(identify -format '%wx%h' "$COMPONENT_DIR/title-text.png")" == "57x13" ]]
[[ "$(identify -format '%wx%h' "$COMPONENT_DIR/close.png")" == "13x15" ]]
[[ "$(identify -format '%wx%h' "$COMPONENT_DIR/map-body.png")" == "248x113" ]]
[[ "$(find "$COMPONENT_DIR" -maxdepth 1 -type f -name '*.png' | wc -l)" == "4" ]]

[[ "$(jq -r '.provenance.provider' "$RUN")" == "alibaba" ]]
[[ "$(jq -r '.provenance.prompt_id | length > 0' "$RUN")" == "true" ]]
[[ "$(jq -r '.model' "$SELECTION")" == "qwen/qwen-image-3-pro" ]]
[[ "$(jq -r '.provider' "$SELECTION")" == "alibaba" ]]
[[ "$(jq -r '.promoted_full_window' "$SELECTION")" == "null" ]]
[[ "$(jq -r '.assembly_invariants.full_generated_window_used_as_runtime_underlay' "$SELECTION")" == "false" ]]
[[ "$(jq -r '.accepted_components | length' "$SELECTION")" == "3" ]]
[[ "$(jq -r '.accepted_components[] | select(.id == "map-title-text") | .exact_copy' "$SELECTION")" == "マップ" ]]

compare -metric AE \
  "$ASSET_DIR/clean-plate.png" \
  "$PROTOTYPE_DIR/public/assets/japanese-rpg-v001/card/clean-plate.png" \
  null: 2>&1 | rg -qx '0'
pink=$(convert "$COMPONENT_DIR/map-body.png" -alpha set -fx '(a>0.1&&r>0.58&&b>0.58&&g<0.7&&(r-g)>0.15&&(b-g)>0.15)?1:0' -format '%[fx:mean*w*h]' info:)
[[ "$pink" == "0" ]]
! rg -q 'benchmarks/|reference\.png|image-01\.png' "$PROTOTYPE_DIR/src/MapSourceWindow.tsx"

printf 'map-contract: PASS bounded Qwen components, exact Map copy declaration, independent 18px chrome, no full-window underlay, and no donor magenta\n'
