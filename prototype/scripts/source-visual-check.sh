#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
PROTOTYPE_DIR=$(cd -- "$SCRIPT_DIR/.." && pwd)
REPO_DIR=$(cd -- "$PROTOTYPE_DIR/.." && pwd)
REFERENCE="$REPO_DIR/benchmarks/japanese-rpg-options-v001/reference.png"
EVIDENCE="$REPO_DIR/artifacts/qa/source-visuals"
WORK_DIR=$(mktemp -d)
trap 'rm -rf -- "$WORK_DIR"' EXIT

node "$SCRIPT_DIR/capture-source-visuals.mjs"

masked_mae() {
  local name=$1 reference=$2 actual=$3 threshold=$4
  convert "$reference" -alpha set \
    -fx '(r>0.35&&b>0.35&&g<0.48&&(r-g)>0.12&&(b-g)>0.12)?0:1' "$WORK_DIR/$name-mask.png"
  convert "$reference" "$WORK_DIR/$name-mask.png" -alpha off -compose CopyOpacity -composite \
    -background black -alpha background "$WORK_DIR/$name-reference.png"
  convert "$actual" "$WORK_DIR/$name-mask.png" -alpha off -compose CopyOpacity -composite \
    -background black -alpha background "$WORK_DIR/$name-actual.png"
  local result normalized
  result=$(compare -metric MAE "$WORK_DIR/$name-reference.png" "$WORK_DIR/$name-actual.png" null: 2>&1 || true)
  normalized=$(sed -n 's/.*(\([^)]*\)).*/\1/p' <<<"$result")
  awk -v value="$normalized" -v max="$threshold" 'BEGIN { if (value > max) exit 1 }'
  printf '%s MAE=%s max=%s\n' "$name" "$normalized" "$threshold"
}

masked_mae full "$REFERENCE" "$EVIDENCE/full.png" 0.050
masked_mae card "$REPO_DIR/benchmarks/japanese-rpg-options-v001/regions/card/reference.png" "$EVIDENCE/card.png" 0.025
convert "$REPO_DIR/benchmarks/japanese-rpg-options-v001/regions/skills/reference.png" -crop 281x184+0+0 +repage "$WORK_DIR/skills-source.png"
masked_mae skills "$WORK_DIR/skills-source.png" "$EVIDENCE/skills.png" 0.035
masked_mae equipment "$REPO_DIR/benchmarks/japanese-rpg-options-v001/regions/equipment/reference.png" "$EVIDENCE/equipment.png" 0.040
convert "$REFERENCE" -crop 280x120+285+279 +repage "$WORK_DIR/chat-source.png"
masked_mae chat "$WORK_DIR/chat-source.png" "$EVIDENCE/chat.png" 0.030
masked_mae exchange "$REPO_DIR/benchmarks/japanese-rpg-options-v001/regions/exchange/reference.png" "$EVIDENCE/exchange.png" 0.030
masked_mae game-menu "$REPO_DIR/benchmarks/japanese-rpg-options-v001/regions/game-menu/reference.png" "$EVIDENCE/game-menu.png" 0.055
masked_mae quickbar "$REPO_DIR/benchmarks/japanese-rpg-options-v001/regions/quickbar/reference.png" "$EVIDENCE/quickbar.png" 0.045
masked_mae party "$REPO_DIR/benchmarks/japanese-rpg-options-v001/regions/party/reference.png" "$EVIDENCE/party.png" 0.055
convert "$REFERENCE" -crop 281x35+568+314 +repage "$WORK_DIR/compact-source.png"
masked_mae compact-info "$WORK_DIR/compact-source.png" "$EVIDENCE/compact-info.png" 0.050
convert "$REFERENCE" -crop 600x21+0+538 +repage "$WORK_DIR/bottom-source.png"
masked_mae bottom-bar "$WORK_DIR/bottom-source.png" "$EVIDENCE/bottom-bar.png" 0.001
convert "$REFERENCE" -crop 245x41+604+523 +repage "$WORK_DIR/notification-source.png"
masked_mae notification "$WORK_DIR/notification-source.png" "$EVIDENCE/notification.png" 0.001

printf 'source-visual-check: PASS full composition and eleven source-relative window gates\n'
