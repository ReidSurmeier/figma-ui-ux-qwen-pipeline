#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/.." && pwd)
ASSET_TMP_DIR=$(mktemp -d)
trap 'rm -r -- "$ASSET_TMP_DIR"' EXIT

SOURCE="$REPO_ROOT/benchmarks/japanese-rpg-options-v001/regions/basic-info/reference.png"
GLOBAL="$REPO_ROOT/artifacts/runs/japanese-basic-info-clean-plate-v001/image-01.png"
BUTTONS="$REPO_ROOT/artifacts/runs/japanese-basic-info-remove-button-grid-v001/image-01.png"
RESOURCES="$REPO_ROOT/artifacts/runs/japanese-basic-info-remove-resources-v001/image-01.png"
LEVEL_FOOTER="$REPO_ROOT/artifacts/runs/japanese-basic-info-remove-level-footer-v001/image-01.png"
MINIMIZED="$REPO_ROOT/artifacts/runs/japanese-basic-info-minimized-state-v001/image-02.png"
OUTPUT_DIR="$REPO_ROOT/prototype/public/assets/japanese-rpg-v001/basic-info"

install -d "$OUTPUT_DIR"
for donor in "$SOURCE" "$GLOBAL" "$BUTTONS" "$RESOURCES" "$LEVEL_FOOTER" "$MINIMIZED"; do
  test -f "$donor"
done

convert "$BUTTONS" -filter Lanczos -resize 280x120\! "$ASSET_TMP_DIR/buttons.png"
convert "$GLOBAL" -filter Lanczos -resize 280x120\! "$ASSET_TMP_DIR/global.png"
convert "$RESOURCES" -filter Lanczos -resize 280x120\! "$ASSET_TMP_DIR/resources.png"
convert "$LEVEL_FOOTER" -filter Lanczos -resize 280x120\! "$ASSET_TMP_DIR/level-footer.png"
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

composite_region "$ASSET_TMP_DIR/resources.png" 5 19 197 45 "$ASSET_TMP_DIR/plate-0.png" "$ASSET_TMP_DIR/plate-1.png"
composite_region "$ASSET_TMP_DIR/level-footer.png" 4 68 197 29 "$ASSET_TMP_DIR/plate-1.png" "$ASSET_TMP_DIR/plate-2.png"
composite_region "$ASSET_TMP_DIR/level-footer.png" 3 101 199 17 "$ASSET_TMP_DIR/plate-2.png" "$ASSET_TMP_DIR/plate-3.png"

# The global candidate failed as a whole plate but did remove the complete
# title foreground cleanly. Use only its bounded internal title surface; its
# magenta outer pixels and unchanged body are excluded from assembly.
composite_region "$ASSET_TMP_DIR/global.png" 3 2 275 15 "$ASSET_TMP_DIR/plate-3.png" "$ASSET_TMP_DIR/plate-4.png"

# Run the successful button-grid donor last so later footer assembly cannot
# reintroduce the lower chat/friend buttons.
composite_region "$ASSET_TMP_DIR/buttons.png" 205 19 73 99 "$ASSET_TMP_DIR/plate-4.png" "$OUTPUT_DIR/clean-plate.png"

# The source crop includes the desktop magenta in anti-aliased pixels around
# the curved outer shell. Make only that forbidden donor color transparent;
# do not trim or clip the window chrome itself.
convert "$OUTPUT_DIR/clean-plate.png" -alpha set -channel A \
  -fx '((r>0.47)&&(b>0.47)&&(g<0.36))?0:a' \
  "$ASSET_TMP_DIR/clean-plate-transparent.png"
mv "$ASSET_TMP_DIR/clean-plate-transparent.png" "$OUTPUT_DIR/clean-plate.png"

# Explicit endpoint asset from the dedicated Qwen minimized-state pass. Qwen
# produced a clean title-only surface and complete endcap but ignored the
# requested compact width. Assemble its generated surface and endcap at the
# exact 180x18 contract; no expanded-runtime body pixel is used.
convert "$MINIMIZED" -filter Lanczos -resize 280x120\! "$ASSET_TMP_DIR/minimized.png"
convert "$ASSET_TMP_DIR/minimized.png" -crop 176x18+0+0 +repage "$ASSET_TMP_DIR/minimized-surface.png"
convert "$ASSET_TMP_DIR/minimized.png" -crop 4x18+276+0 +repage "$ASSET_TMP_DIR/minimized-endcap.png"
convert "$ASSET_TMP_DIR/minimized-surface.png" "$ASSET_TMP_DIR/minimized-endcap.png" +append "$OUTPUT_DIR/minimized-plate.png"

sha256sum "$OUTPUT_DIR/clean-plate.png" "$OUTPUT_DIR/minimized-plate.png"
