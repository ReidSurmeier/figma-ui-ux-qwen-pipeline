#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/.." && pwd)
ASSET_TMP_DIR=$(mktemp -d)
trap 'rm -r -- "$ASSET_TMP_DIR"' EXIT

SOURCE="$REPO_ROOT/benchmarks/japanese-rpg-options-v001/regions/options-window/reference.png"
GLOBAL="$REPO_ROOT/artifacts/runs/japanese-options-window-clean-plate-v001/image-04.png"
TITLE="$REPO_ROOT/artifacts/runs/japanese-options-window-remove-title-tabs-v001/image-01.png"
TITLE_TEXT="$REPO_ROOT/artifacts/runs/japanese-options-window-remove-title-text-v001/image-03.png"
BGM="$REPO_ROOT/artifacts/runs/japanese-options-window-remove-bgm-v001/image-04.png"
EFFECT="$REPO_ROOT/artifacts/runs/japanese-options-window-remove-effect-v001/image-04.png"
SKIN="$REPO_ROOT/artifacts/runs/japanese-options-window-remove-skin-v001/image-01.png"
FOOTER="$REPO_ROOT/artifacts/runs/japanese-options-window-remove-footer-v001/image-01.png"
OUTPUT_DIR="$REPO_ROOT/prototype/public/assets/japanese-options-v001"

mkdir -p "$OUTPUT_DIR"

for donor in "$GLOBAL" "$TITLE" "$TITLE_TEXT" "$BGM" "$EFFECT" "$SKIN" "$FOOTER"; do
  test -f "$donor"
done

convert "$GLOBAL" -filter Lanczos -resize 280x122! "$ASSET_TMP_DIR/global.png"
convert "$TITLE" -filter Lanczos -resize 280x122! "$ASSET_TMP_DIR/title.png"
convert "$TITLE_TEXT" -filter Lanczos -resize 280x122! "$ASSET_TMP_DIR/title-text.png"
convert "$BGM" -filter Lanczos -resize 280x122! "$ASSET_TMP_DIR/bgm.png"
convert "$EFFECT" -filter Lanczos -resize 280x122! "$ASSET_TMP_DIR/effect.png"
convert "$SKIN" -filter Lanczos -resize 280x122! "$ASSET_TMP_DIR/skin.png"
convert "$FOOTER" -filter Lanczos -resize 280x122! "$ASSET_TMP_DIR/footer.png"
cp "$SOURCE" "$ASSET_TMP_DIR/plate-0.png"

composite_region() {
  local donor=$1
  local x=$2
  local y=$3
  local width=$4
  local height=$5
  local stage=$6
  local next_stage=$7

  convert "$donor" -crop "${width}x${height}+${x}+${y}" +repage "$ASSET_TMP_DIR/region.png"
  composite -geometry "+${x}+${y}" "$ASSET_TMP_DIR/region.png" "$stage" "$next_stage"
}

# Qwen establishes that the occluded title region is a continuous title-bar
# surface. Reconstruct its source-locked vertical gradient from the untouched
# rows immediately above and below the glyphs; the previous y=2 stretch copied
# the pale top highlight through the whole region and created a white box.
convert "$SOURCE" -crop 58x1+16+3 +repage "$ASSET_TMP_DIR/title-surface-top.png"
convert "$SOURCE" -crop 58x1+16+15 +repage "$ASSET_TMP_DIR/title-surface-bottom.png"
convert "$ASSET_TMP_DIR/title-surface-top.png" "$ASSET_TMP_DIR/title-surface-bottom.png" \
  -append -filter Lanczos -resize 58x13! "$ASSET_TMP_DIR/title-surface.png"
composite -geometry +16+3 "$ASSET_TMP_DIR/title-surface.png" "$ASSET_TMP_DIR/plate-0.png" "$ASSET_TMP_DIR/plate-1.png"
convert "$SOURCE" -crop 3x34+6+20 +repage -resize 9x34! "$ASSET_TMP_DIR/option-tab-surface.png"
composite -geometry +9+20 "$ASSET_TMP_DIR/option-tab-surface.png" "$ASSET_TMP_DIR/plate-1.png" "$ASSET_TMP_DIR/plate-2.png"
convert "$SOURCE" -crop 3x31+6+59 +repage -resize 9x31! "$ASSET_TMP_DIR/info-tab-surface.png"
composite -geometry +9+59 "$ASSET_TMP_DIR/info-tab-surface.png" "$ASSET_TMP_DIR/plate-2.png" "$ASSET_TMP_DIR/plate-3.png"
convert "$SOURCE" -crop 13x1+3+2 +repage -resize 13x13! "$ASSET_TMP_DIR/title-left-patch.png"
composite -geometry +3+3 "$ASSET_TMP_DIR/title-left-patch.png" "$ASSET_TMP_DIR/plate-3.png" "$ASSET_TMP_DIR/plate-4.png"
convert "$SOURCE" -crop 28x1+252+2 +repage -resize 28x13! "$ASSET_TMP_DIR/title-right-patch.png"
composite -geometry +252+3 "$ASSET_TMP_DIR/title-right-patch.png" "$ASSET_TMP_DIR/plate-4.png" "$ASSET_TMP_DIR/plate-5.png"

convert "$SOURCE" -crop 4x26+272+18 +repage -resize 243x26! "$ASSET_TMP_DIR/bgm-surface.png"
composite -geometry +27+18 "$ASSET_TMP_DIR/bgm-surface.png" "$ASSET_TMP_DIR/plate-5.png" "$ASSET_TMP_DIR/plate-6.png"
convert "$SOURCE" -crop 4x26+272+43 +repage -resize 243x26! "$ASSET_TMP_DIR/effect-surface.png"
composite -geometry +27+43 "$ASSET_TMP_DIR/effect-surface.png" "$ASSET_TMP_DIR/plate-6.png" "$ASSET_TMP_DIR/plate-7.png"
convert "$SOURCE" -crop 10x30+264+67 +repage -resize 243x30! "$ASSET_TMP_DIR/skin-surface.png"
composite -geometry +27+67 "$ASSET_TMP_DIR/skin-surface.png" "$ASSET_TMP_DIR/plate-7.png" "$ASSET_TMP_DIR/plate-8.png"
convert "$SOURCE" -crop 27x22+245+98 +repage -resize 265x22! "$ASSET_TMP_DIR/footer-surface.png"
composite -geometry +7+98 "$ASSET_TMP_DIR/footer-surface.png" "$ASSET_TMP_DIR/plate-8.png" "$OUTPUT_DIR/clean-plate.png"

sha256sum "$OUTPUT_DIR/clean-plate.png"
