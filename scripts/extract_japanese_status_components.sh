#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/.." && pwd)
SOURCE="$REPO_ROOT/benchmarks/japanese-rpg-options-v001/regions/status/reference.png"
OUTPUT_DIR="$REPO_ROOT/prototype/public/assets/japanese-rpg-v001/status/components"
WORK_DIR=$(mktemp -d)
trap 'rm -rf -- "$WORK_DIR"' EXIT
mkdir -p "$OUTPUT_DIR"

extract_semantic() {
  local name=$1 x=$2 y=$3 width=$4 height=$5 threshold=${6:-0.68}
  convert "$SOURCE" -crop "${width}x${height}+${x}+${y}" +repage "$WORK_DIR/$name-source.png"
  convert "$WORK_DIR/$name-source.png" -alpha off \
    -fx "(((r+g+b)/3)<${threshold} || (b-r)>0.10)?1:0" "$WORK_DIR/$name-mask.png"
  convert "$WORK_DIR/$name-source.png" "$WORK_DIR/$name-mask.png" \
    -alpha off -compose CopyOpacity -composite "$OUTPUT_DIR/$name.png"
}

extract_crop() {
  local name=$1 x=$2 y=$3 width=$4 height=$5
  convert "$SOURCE" -crop "${width}x${height}+${x}+${y}" +repage "$OUTPUT_DIR/$name.png"
}

extract_crop title-icon 3 3 13 13
extract_semantic title-text 16 3 56 13 0.72
extract_crop minimize 251 2 14 15
extract_crop close 266 2 13 15
extract_semantic side-tabs 3 18 17 108 0.74

for index in 0 1 2 3 4 5; do
  y=$((18 + index * 18))
  extract_semantic "primary-row-$index" 20 "$y" 90 18 0.70
  extract_semantic "derived-row-$index" 100 "$y" 180 18 0.70
  if [[ "$index" != "3" ]]; then
    extract_crop "increment-$index" 91 "$((y + 3))" 11 11
    convert "$OUTPUT_DIR/primary-row-$index.png" -alpha set -channel A \
      -fx '(i>=71&&i<82&&j>=3&&j<14)?0:a' "$WORK_DIR/primary-row-$index-without-increment.png"
    mv "$WORK_DIR/primary-row-$index-without-increment.png" "$OUTPUT_DIR/primary-row-$index.png"
  fi
done

for asset in "$OUTPUT_DIR"/*.png; do
  convert "$asset" -alpha set -channel A \
    -fx '((r>0.47)&&(b>0.47)&&(g<0.36))?0:a' "$WORK_DIR/$(basename "$asset")"
  mv "$WORK_DIR/$(basename "$asset")" "$asset"
done

montage "$OUTPUT_DIR"/*.png -tile 4x -geometry +6+6 -background '#111827' \
  "$REPO_ROOT/artifacts/runs/japanese-status-components-v001-contact-sheet.png"
sha256sum "$OUTPUT_DIR"/*.png
