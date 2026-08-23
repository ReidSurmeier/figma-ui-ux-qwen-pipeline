#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/.." && pwd)
SOURCE="$REPO_ROOT/benchmarks/japanese-rpg-options-v001/regions/status/reference.png"
OUTPUT_DIR="$REPO_ROOT/prototype/public/assets/japanese-rpg-v001/status"
WORK_DIR=$(mktemp -d)
trap 'rm -rf -- "$WORK_DIR"' EXIT
mkdir -p "$OUTPUT_DIR"

convert "$REPO_ROOT/artifacts/runs/japanese-status-clean-plate-v001/image-01.png" \
  -filter point -resize 280x126\! "$WORK_DIR/global.png"
convert "$REPO_ROOT/artifacts/runs/japanese-status-side-tabs-v001/image-01.png" \
  -filter point -resize 20x108\! "$WORK_DIR/side.png"
convert "$REPO_ROOT/artifacts/runs/japanese-status-primary-stats-v002/image-01.png" \
  -filter point -resize 90x108\! "$WORK_DIR/primary.png"
convert "$REPO_ROOT/artifacts/runs/japanese-status-derived-stats-v004/image-01.png" \
  -filter point -resize 180x108\! "$WORK_DIR/derived.png"

convert "$WORK_DIR/global.png" -crop 280x18+0+0 +repage "$WORK_DIR/title.png"
cp "$SOURCE" "$WORK_DIR/plate-0.png"
composite -geometry +0+0 "$WORK_DIR/title.png" "$WORK_DIR/plate-0.png" "$WORK_DIR/plate-1.png"
composite -geometry +0+18 "$WORK_DIR/side.png" "$WORK_DIR/plate-1.png" "$WORK_DIR/plate-2.png"
composite -geometry +20+18 "$WORK_DIR/primary.png" "$WORK_DIR/plate-2.png" "$WORK_DIR/plate-3.png"
composite -geometry +100+18 "$WORK_DIR/derived.png" "$WORK_DIR/plate-3.png" "$WORK_DIR/plate-4.png"
convert "$WORK_DIR/plate-4.png" -alpha set -channel A \
  -fx '(((j<1||j>=h-1)&&(i<5||i>=w-5))||((j<2||j>=h-2)&&(i<4||i>=w-4))||((j<4||j>=h-4)&&(i<2||i>=w-2))||((j<6||j>=h-6)&&(i<1||i>=w-1)))?0:a' \
  "$OUTPUT_DIR/clean-plate.png"

# Shared compact chrome is a selected Qwen Image 3 Pro endpoint from the same
# source UI family. Status title/icon/buttons remain separate components.
[[ -f "$OUTPUT_DIR/minimized-plate.png" ]] || {
  printf 'missing dedicated Status minimized asset; run assemble_generated_minimized_states.sh first\n' >&2
  exit 1
}

bash "$REPO_ROOT/scripts/evaluate_qwen_clean_plate.sh" "$OUTPUT_DIR/clean-plate.png" 280 126
sha256sum "$OUTPUT_DIR/clean-plate.png" "$OUTPUT_DIR/minimized-plate.png"
