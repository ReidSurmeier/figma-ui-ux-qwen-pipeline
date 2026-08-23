#!/usr/bin/env bash
set -euo pipefail

readonly REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly DONOR="$REPO_DIR/artifacts/runs/japanese-map-destination-v001/image-01.png"
readonly SOURCE_PLATE="$REPO_DIR/prototype/public/assets/japanese-rpg-v001/card/clean-plate.png"
readonly SOURCE_CLOSE="$REPO_DIR/prototype/public/assets/japanese-rpg-v001/card/components/close.png"
readonly OUTPUT_DIR="$REPO_DIR/prototype/public/assets/japanese-rpg-v001/map"
readonly COMPONENT_DIR="$OUTPUT_DIR/components"

mkdir -p "$COMPONENT_DIR"

# Candidate 1 is Qwen design authority only for these three bounded regions.
# Its complete chrome was rejected because the title band is not source-accurate.
convert "$DONOR" -crop 64x60+20+16 +repage -filter point -resize 16x15\! "$COMPONENT_DIR/title-icon.png"
convert "$DONOR" -crop 228x52+94+25 +repage -filter point -resize 57x13\! "$COMPONENT_DIR/title-text.png"
convert "$DONOR" -crop 992x452+66+117 +repage -filter point -resize 248x113\! "$COMPONENT_DIR/map-body.png"

# Reuse only independent, previously accepted chrome components. The complete
# card or reference screenshot is never mounted in the Map runtime.
convert "$SOURCE_PLATE" "$OUTPUT_DIR/clean-plate.png"
convert "$SOURCE_CLOSE" "$COMPONENT_DIR/close.png"

identify -format '%f %wx%h\n' \
  "$OUTPUT_DIR/clean-plate.png" \
  "$COMPONENT_DIR/title-icon.png" \
  "$COMPONENT_DIR/title-text.png" \
  "$COMPONENT_DIR/close.png" \
  "$COMPONENT_DIR/map-body.png"
sha256sum \
  "$OUTPUT_DIR/clean-plate.png" \
  "$COMPONENT_DIR/title-icon.png" \
  "$COMPONENT_DIR/title-text.png" \
  "$COMPONENT_DIR/close.png" \
  "$COMPONENT_DIR/map-body.png"
