#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/.." && pwd)
ASSET_TMP_DIR=$(mktemp -d)
trap 'rm -r -- "$ASSET_TMP_DIR"' EXIT

SOURCE="$REPO_ROOT/benchmarks/japanese-rpg-options-v001/regions/basic-info/reference.png"
PLATE="$REPO_ROOT/prototype/public/assets/japanese-rpg-v001/basic-info/clean-plate.png"
OUTPUT_DIR="$REPO_ROOT/prototype/public/assets/japanese-rpg-v001/basic-info/components"
install -d "$OUTPUT_DIR"

extract_delta() {
  local name=$1 x=$2 y=$3 width=$4 height=$5 threshold=$6
  convert "$SOURCE" -crop "${width}x${height}+${x}+${y}" +repage "$ASSET_TMP_DIR/${name}-source.png"
  convert "$PLATE" -crop "${width}x${height}+${x}+${y}" +repage "$ASSET_TMP_DIR/${name}-plate.png"
  convert "$ASSET_TMP_DIR/${name}-source.png" "$ASSET_TMP_DIR/${name}-plate.png" \
    -alpha off -compose difference -composite -colorspace Gray -threshold "${threshold}%" "$ASSET_TMP_DIR/${name}-mask.png"
  convert "$ASSET_TMP_DIR/${name}-source.png" "$ASSET_TMP_DIR/${name}-mask.png" \
    -alpha off -compose CopyOpacity -composite "$OUTPUT_DIR/${name}.png"
}

extract_dark() {
  local name=$1 x=$2 y=$3 width=$4 height=$5 threshold=$6
  convert "$SOURCE" -crop "${width}x${height}+${x}+${y}" +repage "$ASSET_TMP_DIR/${name}-source.png"
  convert "$ASSET_TMP_DIR/${name}-source.png" -colorspace Gray -negate -threshold "${threshold}%" "$ASSET_TMP_DIR/${name}-mask.png"
  convert "$ASSET_TMP_DIR/${name}-source.png" "$ASSET_TMP_DIR/${name}-mask.png" \
    -alpha off -compose CopyOpacity -composite "$OUTPUT_DIR/${name}.png"
}

extract_delta title-icon 3 3 11 11 8
# Isolate only the dark Japanese glyph pixels. A plate-difference crop here
# would carry a pale rectangular donor because the Qwen title gradient is not
# pixel-identical to the source.
extract_dark title-text 15 3 40 12 38
extract_delta window-button 268 3 10 11 8
extract_delta player-name 7 22 64 11 5
extract_delta player-class 7 38 43 10 5
extract_delta hp-label 95 28 16 10 5
extract_delta sp-label 95 50 16 10 5
extract_delta hp-value 125 33 71 11 5
extract_delta sp-value 125 55 71 11 5

extract_delta page-status 207 22 33 20 4
extract_delta page-option 244 22 33 20 4
extract_delta page-items 207 47 33 20 4
extract_delta page-equip 244 47 33 20 4
extract_delta page-skill 207 72 33 20 4
extract_delta page-map 244 72 33 20 4
extract_delta page-chat 207 97 33 20 4
extract_delta page-friend 244 97 33 20 4

extract_delta base-label 17 74 58 10 4
extract_delta job-label 17 86 54 10 4
extract_delta base-progress 86 76 104 9 4
extract_delta job-progress 86 88 104 9 4
extract_delta footer-text 4 104 198 12 4

# Reconstruct the exposed meter rail from source pixels that are not covered by
# either large handle. Preserve its one-pixel vertical style, then stretch only
# the constant middle column. The handle assets below are source deltas against
# this rail, so they carry no grey rectangular donor crop.
convert "$SOURCE" -crop 1x11+111+22 +repage "$ASSET_TMP_DIR/rail-left.png"
convert "$SOURCE" -crop 1x11+181+22 +repage -resize 79x11\! "$ASSET_TMP_DIR/rail-middle.png"
convert "$SOURCE" -crop 6x11+191+22 +repage "$ASSET_TMP_DIR/rail-right.png"
convert "$ASSET_TMP_DIR/rail-left.png" "$ASSET_TMP_DIR/rail-middle.png" "$ASSET_TMP_DIR/rail-right.png" +append "$OUTPUT_DIR/meter-track.png"

for row in hp sp; do
  if [[ "$row" == hp ]]; then y=22; thumb_width=48; else y=43; thumb_width=34; fi
  convert "$SOURCE" -crop "86x11+111+${y}" +repage "$ASSET_TMP_DIR/${row}-meter.png"
  convert "$ASSET_TMP_DIR/${row}-meter.png" "$OUTPUT_DIR/meter-track.png" \
    -alpha off -compose difference -composite -colorspace Gray -threshold 3% "$ASSET_TMP_DIR/${row}-thumb-mask.png"
  convert "$ASSET_TMP_DIR/${row}-meter.png" "$ASSET_TMP_DIR/${row}-thumb-mask.png" \
    -alpha off -compose CopyOpacity -composite -crop "${thumb_width}x11+0+0" +repage "$OUTPUT_DIR/${row}-thumb.png"
done

sha256sum "$PLATE" "$OUTPUT_DIR"/*.png
