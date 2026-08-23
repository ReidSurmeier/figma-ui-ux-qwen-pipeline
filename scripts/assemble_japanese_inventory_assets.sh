#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/.." && pwd)
SOURCE="$REPO_ROOT/benchmarks/japanese-rpg-options-v001/regions/inventory/reference.png"
OUTPUT_DIR="$REPO_ROOT/prototype/public/assets/japanese-rpg-v001/inventory"
COMPONENT_DIR="$OUTPUT_DIR/components"
WORK_DIR=$(mktemp -d)
trap 'rm -rf -- "$WORK_DIR"' EXIT
mkdir -p "$COMPONENT_DIR"
rm -f "$COMPONENT_DIR/scrollbar.png"

convert "$REPO_ROOT/artifacts/runs/japanese-status-clean-plate-v001/image-01.png" \
  -filter point -resize 280x126\! -crop 280x18+0+0 +repage "$WORK_DIR/title.png"
convert "$REPO_ROOT/artifacts/runs/japanese-status-derived-stats-v004/image-01.png" \
  -filter point -resize 180x108\! -crop 1x1+10+10 +repage \
  -filter point -resize 280x119\! "$WORK_DIR/body.png"
convert -size 280x137 xc:'#ffffff' "$WORK_DIR/plate-0.png"
composite -geometry +0+0 "$WORK_DIR/title.png" "$WORK_DIR/plate-0.png" "$WORK_DIR/plate-1.png"
composite -geometry +0+18 "$WORK_DIR/body.png" "$WORK_DIR/plate-1.png" "$WORK_DIR/plate-2.png"
convert "$WORK_DIR/plate-2.png" -stroke '#6f8496' -strokewidth 1 -fill none \
  -draw 'rectangle 4,17 279,136 line 33,18 33,118 line 263,18 263,118' "$WORK_DIR/plate-3.png"
convert "$WORK_DIR/plate-3.png" -alpha set -channel A \
  -fx '(((j<1||j>=h-1)&&(i<5||i>=w-5))||((j<2||j>=h-2)&&(i<4||i>=w-4))||((j<4||j>=h-4)&&(i<2||i>=w-2))||((j<6||j>=h-6)&&(i<1||i>=w-1)))?0:a' \
  "$OUTPUT_DIR/clean-plate.png"
cp "$REPO_ROOT/prototype/public/assets/japanese-rpg-v001/basic-info/minimized-plate.png" "$OUTPUT_DIR/minimized-plate.png"

crop() {
  local name=$1 x=$2 y=$3 width=$4 height=$5
  convert "$SOURCE" -crop "${width}x${height}+${x}+${y}" +repage "$COMPONENT_DIR/$name.png"
}

crop title-icon 3 3 13 13
crop title-text 16 3 120 13
crop minimize 251 2 14 15
crop close 266 2 13 15
crop tab-item 5 18 29 35
crop tab-equip 5 53 29 35
crop tab-etc 5 88 29 35

for row in 0 1 2; do
  for column in 0 1 2 3 4 5 6; do
    crop "cell-${row}-${column}" "$((36 + column * 34))" "$((19 + row * 34))" 34 34
  done
done

crop scroll-up 263 18 17 17
convert "$SOURCE" -crop 17x1+263+90 +repage -filter point -resize 17x66\! "$COMPONENT_DIR/scroll-track.png"
crop scroll-thumb 263 31 17 51
crop scroll-down 263 101 17 18
crop resize-grip 263 119 17 18
convert "$COMPONENT_DIR/resize-grip.png" -alpha set -channel A \
  -fx '((r>0.47)&&(b>0.47)&&(g<0.36))?0:a' "$WORK_DIR/resize-grip.png"
mv "$WORK_DIR/resize-grip.png" "$COMPONENT_DIR/resize-grip.png"

montage "$COMPONENT_DIR"/*.png -tile 7x -geometry +5+5 -background '#111827' \
  "$REPO_ROOT/artifacts/runs/japanese-inventory-components-v001-contact-sheet.png"
sha256sum "$OUTPUT_DIR/clean-plate.png" "$OUTPUT_DIR/minimized-plate.png" "$COMPONENT_DIR"/*.png
