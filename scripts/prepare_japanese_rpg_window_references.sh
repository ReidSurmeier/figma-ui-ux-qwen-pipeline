#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/.." && pwd)
MANIFEST="$REPO_ROOT/benchmarks/japanese-rpg-options-v001/windows.json"
SOURCE="$REPO_ROOT/benchmarks/japanese-rpg-options-v001/reference.png"
CONTACT_DIR=$(mktemp -d)
trap 'rm -rf -- "$CONTACT_DIR"' EXIT

while IFS=$'\t' read -r id x y width height; do
  output_dir="$REPO_ROOT/benchmarks/japanese-rpg-options-v001/regions/$id"
  mkdir -p "$output_dir"
  convert "$SOURCE" -crop "${width}x${height}+${x}+${y}" +repage "$output_dir/reference.png"
  convert "$output_dir/reference.png" -filter point -resize 200% \
    -gravity north -background '#111827' -splice 0x28 \
    -fill white -pointsize 18 -annotate +0+4 "$id" "$CONTACT_DIR/$id.png"
done < <(jq -r '.windows[] | [.id, .bounds[]] | @tsv' "$MANIFEST")

montage "$CONTACT_DIR"/*.png -tile 3x -geometry +8+8 -background '#111827' \
  "$REPO_ROOT/artifacts/runs/japanese-rpg-window-source-contact-sheet-v001.png"

sha256sum "$SOURCE" "$REPO_ROOT"/benchmarks/japanese-rpg-options-v001/regions/*/reference.png
