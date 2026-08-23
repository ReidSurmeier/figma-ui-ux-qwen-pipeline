#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/.." && pwd)
RUNS="$REPO_ROOT/artifacts/runs"
OUTPUT="$REPO_ROOT/prototype/public/assets/japanese-rpg-v001"
WORK_DIR=$(mktemp -d)

assemble() {
  local id=$1 candidate=$2 crop_y=$3 crop_height=$4
  local source="$RUNS/japanese-$id-minimized-state-v001/image-$candidate.png"
  local target="$OUTPUT/$id/minimized-plate.png"
  mkdir -p "$(dirname -- "$target")"
  convert "$source" -crop "1024x${crop_height}+0+${crop_y}" +repage \
    -fuzz 4% -trim +repage -filter Lanczos -resize 280x18\! "$WORK_DIR/$id-bar.png"
  convert "$WORK_DIR/$id-bar.png" -crop 176x18+0+0 +repage "$WORK_DIR/$id-left.png"
  convert "$WORK_DIR/$id-bar.png" -crop 4x18+276+0 +repage "$WORK_DIR/$id-endcap.png"
  convert "$WORK_DIR/$id-left.png" "$WORK_DIR/$id-endcap.png" +append "$target"
}

# Selected only after cross-window contact-sheet inspection. These are three
# separate Qwen Image 3 Pro passes; deterministic assembly enforces the exact
# 180x18 runtime contract and is not represented as model output.
assemble status 02 18 66
assemble inventory 01 8 66
assemble equipment 02 0 89

sha256sum \
  "$OUTPUT/status/minimized-plate.png" \
  "$OUTPUT/inventory/minimized-plate.png" \
  "$OUTPUT/equipment/minimized-plate.png"
