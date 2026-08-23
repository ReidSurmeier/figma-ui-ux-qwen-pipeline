#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
PROTOTYPE_DIR=$(cd -- "$SCRIPT_DIR/.." && pwd)
REPO_ROOT=$(cd -- "$PROTOTYPE_DIR/.." && pwd)
ASSET_DIR="$PROTOTYPE_DIR/public/assets/japanese-rpg-v001/basic-info"
COMPONENT_DIR="$ASSET_DIR/components"
PLATE="$ASSET_DIR/clean-plate.png"
MINIMIZED="$ASSET_DIR/minimized-plate.png"

test -f "$PLATE"
test -f "$MINIMIZED"
[[ "$(find "$COMPONENT_DIR" -maxdepth 1 -type f -name '*.png' | wc -l)" == "25" ]]
! rg -n 'benchmarks/|reference\.png' "$PROTOTYPE_DIR/src" "$PROTOTYPE_DIR/index.html"

for brief in "$REPO_ROOT"/briefs/japanese-rpg-options-v001/basic-info-*-v001.json; do
  [[ "$(jq -r '.model' "$brief")" == "qwen/qwen-image-3-pro" ]]
done
for run in \
  "$REPO_ROOT/artifacts/runs/japanese-basic-info-clean-plate-v001/run.json" \
  "$REPO_ROOT/artifacts/runs/japanese-basic-info-remove-button-grid-v001/run.json" \
  "$REPO_ROOT/artifacts/runs/japanese-basic-info-remove-resources-v001/run.json" \
  "$REPO_ROOT/artifacts/runs/japanese-basic-info-remove-level-footer-v001/run.json" \
  "$REPO_ROOT/artifacts/runs/japanese-basic-info-minimized-state-v001/run.json"; do
  [[ "$(jq -r '.provenance.provider' "$run")" == "alibaba" ]]
  [[ "$(jq -r '.provenance.prompt_id | length > 0' "$run")" == "true" ]]
  [[ "$(jq -r '.status | startswith("selected")' "$run")" == "true" ]]
done

bash "$REPO_ROOT/scripts/evaluate_basic_info_title_repair_v002.sh"

pink_opaque_count=$(convert "$PLATE" -fx '((a>0)&&(r>0.47)&&(b>0.47)&&(g<0.36))?1:0' -format '%[fx:mean*w*h]' info:)
[[ "$pink_opaque_count" == "0" ]]
read -r title_width title_height < <(convert "$COMPONENT_DIR/title-text.png" -alpha extract -trim -format '%w %h\n' info:)
read -r hp_width hp_height < <(convert "$COMPONENT_DIR/hp-thumb.png" -alpha extract -trim -format '%w %h\n' info:)
read -r sp_width sp_height < <(convert "$COMPONENT_DIR/sp-thumb.png" -alpha extract -trim -format '%w %h\n' info:)
(( title_width < 40 && title_height <= 12 ))
(( hp_width < 48 && hp_height <= 11 ))
(( sp_width < 34 && sp_height <= 11 ))

crop_equivalence=$(compare -metric AE "$MINIMIZED" "${PLATE}[180x18+0+0]" null: 2>&1 || true)
(( crop_equivalence > 0 ))

printf 'basic-info-contract: PASS Qwen provenance, no runtime reference, independent assets, no opaque pink donor, glyph-only title, transparent thumbs, and generated minimize endpoint\n'
