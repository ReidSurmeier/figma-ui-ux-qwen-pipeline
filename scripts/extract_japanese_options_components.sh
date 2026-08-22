#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/.." && pwd)
ASSET_TMP_DIR=$(mktemp -d)
trap 'rm -r -- "$ASSET_TMP_DIR"' EXIT

SOURCE="$REPO_ROOT/benchmarks/japanese-rpg-options-v001/regions/options-window/reference.png"
PLATE="$REPO_ROOT/prototype/public/assets/japanese-options-v001/clean-plate.png"
OUTPUT_DIR="$REPO_ROOT/prototype/public/assets/japanese-options-v001/components"
mkdir -p "$OUTPUT_DIR"

extract_delta() {
  local name=$1
  local x=$2
  local y=$3
  local width=$4
  local height=$5
  local threshold=$6

  convert "$SOURCE" -crop "${width}x${height}+${x}+${y}" +repage "$ASSET_TMP_DIR/${name}-source.png"
  convert "$PLATE" -crop "${width}x${height}+${x}+${y}" +repage "$ASSET_TMP_DIR/${name}-plate.png"
  convert "$ASSET_TMP_DIR/${name}-source.png" "$ASSET_TMP_DIR/${name}-plate.png" -alpha off -compose difference -composite -colorspace Gray -threshold "${threshold}%" "$ASSET_TMP_DIR/${name}-mask.png"
  convert "$ASSET_TMP_DIR/${name}-source.png" "$ASSET_TMP_DIR/${name}-mask.png" -alpha off -compose CopyOpacity -composite "$OUTPUT_DIR/${name}.png"
}

extract_crop() {
  local name=$1
  local x=$2
  local y=$3
  local width=$4
  local height=$5
  convert "$SOURCE" -crop "${width}x${height}+${x}+${y}" +repage "$OUTPUT_DIR/${name}.png"
}

extract_transparent_crop() {
  local name=$1
  local x=$2
  local y=$3
  local width=$4
  local height=$5
  local canvas_width=$6
  local canvas_height=$7

  convert "$SOURCE" \
    -crop "${width}x${height}+${x}+${y}" +repage \
    -fuzz 2% -transparent white \
    -background none -gravity northwest -extent "${canvas_width}x${canvas_height}" \
    "$OUTPUT_DIR/${name}.png"
}

extract_dark() {
  local name=$1
  local x=$2
  local y=$3
  local width=$4
  local height=$5
  local threshold=$6

  convert "$SOURCE" -crop "${width}x${height}+${x}+${y}" +repage "$ASSET_TMP_DIR/${name}-source.png"
  convert "$ASSET_TMP_DIR/${name}-source.png" -colorspace Gray -negate -threshold "${threshold}%" "$ASSET_TMP_DIR/${name}-mask.png"
  convert "$ASSET_TMP_DIR/${name}-source.png" "$ASSET_TMP_DIR/${name}-mask.png" -alpha off -compose CopyOpacity -composite "$OUTPUT_DIR/${name}.png"
}

extract_crop title-icon 3 3 13 13
# The title remains independently editable, but only its glyph pixels are
# opaque. Comparing against the Qwen-guided clean plate removes the baked blue
# rectangle that the old raw crop carried into every assembly.
extract_delta title-text 16 4 54 11 12
extract_crop minimize 251 3 14 14
extract_crop close 266 2 13 15
extract_crop tab-option 5 18 14 39
extract_crop tab-info 5 55 14 40
extract_crop bgm-label 27 20 34 18
extract_crop effect-label 27 43 44 19
extract_crop skin-label 27 68 35 20
extract_crop slider-left-arrow 74 20 12 15
extract_crop slider-right-arrow 222 20 14 15
# Normalize both checkbox states to the same transparent 11x11 canvas and the
# same 10x10 visible anchor. The previous opaque crops started at unrelated
# rows (23 and 47), so toggling moved the art and exposed a dark top pixel.
extract_transparent_crop checkbox-off 237 24 10 10 11 11
extract_transparent_crop checkbox-on 237 43 10 10 11 11
# The source label begins at x=248. The previous x=249 crop discarded the
# first column of the "o", making the truncated label appear to run under the
# checkbox. Isolate the complete dark glyph on a transparent canvas.
extract_dark on-label 248 22 22 15 35
extract_crop skin-dropdown 75 65 184 18
# Footer checkbox boxes begin at y=102. The previous 11x11 crops started one
# row too high and the checked donor at x=113 captured a black Snap-label pixel
# at source coordinate 115,101. Crop only the 10x10 box silhouettes and place
# them on clean 11x11 transparent canvases.
extract_transparent_crop footer-checkbox-off 11 102 10 10 11 11
extract_transparent_crop footer-checkbox-on 112 102 10 10 11 11
extract_crop footer-opaque 21 99 49 17
extract_crop footer-snap 76 99 40 17
extract_crop footer-attack 122 99 40 17
extract_crop footer-skill 173 99 32 17
extract_crop footer-item 214 99 30 17

# Minimized-state background: keep the Qwen/source-locked clean plate separate
# from the title icon, title text, and window buttons so every header element
# remains independently editable in Figma.
convert "$PLATE" -crop 280x18+0+0 +repage "$OUTPUT_DIR/title-bar-background.png"

# Rebuild an exact source track without its initial thumb. The same x-range in
# the Effect row is exposed because its thumb sits farther left.
convert "$SOURCE" -crop 143x11+83+24 +repage "$ASSET_TMP_DIR/slider-track-source.png"
convert "$SOURCE" -crop 15x11+180+24 +repage "$ASSET_TMP_DIR/slider-track-patch.png"
composite -geometry +81+0 "$ASSET_TMP_DIR/slider-track-patch.png" "$ASSET_TMP_DIR/slider-track-source.png" "$ASSET_TMP_DIR/slider-track-clean.png"
convert "$ASSET_TMP_DIR/slider-track-clean.png" -fuzz 4% -transparent white "$OUTPUT_DIR/slider-track.png"

# The old 15x15 thumb was an opaque screenshot crop, so a grey rectangle moved
# with the thumb and became especially visible at the right endpoint. Rebuild
# the exact background beneath the source thumb, then promote only the pixels
# that differ from that track/background as the independently movable layer.
convert "$SOURCE" -crop 15x15+164+22 +repage "$ASSET_TMP_DIR/slider-thumb-source.png"
convert -size 15x15 xc:white "$ASSET_TMP_DIR/slider-thumb-background.png"
convert "$ASSET_TMP_DIR/slider-track-clean.png" -crop 15x11+81+0 +repage "$ASSET_TMP_DIR/slider-thumb-track.png"
composite -geometry +0+2 "$ASSET_TMP_DIR/slider-thumb-track.png" "$ASSET_TMP_DIR/slider-thumb-background.png" "$ASSET_TMP_DIR/slider-thumb-baseline.png"
convert "$ASSET_TMP_DIR/slider-thumb-source.png" "$ASSET_TMP_DIR/slider-thumb-baseline.png" \
  -alpha off -compose difference -composite -colorspace Gray -threshold 2% \
  "$ASSET_TMP_DIR/slider-thumb-mask.png"
convert "$ASSET_TMP_DIR/slider-thumb-source.png" "$ASSET_TMP_DIR/slider-thumb-mask.png" \
  -alpha off -compose CopyOpacity -composite "$OUTPUT_DIR/slider-thumb.png"

sha256sum "$PLATE" "$OUTPUT_DIR"/*.png
