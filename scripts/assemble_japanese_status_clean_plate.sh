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

# The generated plate is a semantic-removal donor, not authority for every
# invariant source pixel. Apply it only beneath the alpha footprint owned by
# each independent foreground component. This prevents Qwen's harmless global
# redraw drift from changing the shell, row geometry, and empty source pixels.
owned_index=0
cp "$SOURCE" "$WORK_DIR/owned-00.png"
apply_donor_under_component() {
  local component=$1 x=$2 y=$3
  local file="$OUTPUT_DIR/components/$component.png"
  local width height next
  read -r width height < <(identify -format '%w %h\n' "$file")
  next=$((owned_index + 1))
  convert "$WORK_DIR/plate-4.png" -crop "${width}x${height}+${x}+${y}" +repage "$WORK_DIR/donor-$next.png"
  convert "$file" -alpha extract "$WORK_DIR/mask-$next.png"
  convert "$WORK_DIR/donor-$next.png" "$WORK_DIR/mask-$next.png" \
    -alpha off -compose CopyOpacity -composite "$WORK_DIR/patch-$next.png"
  composite -geometry "+${x}+${y}" "$WORK_DIR/patch-$next.png" \
    "$WORK_DIR/owned-$(printf '%02d' "$owned_index").png" \
    "$WORK_DIR/owned-$(printf '%02d' "$next").png"
  owned_index=$next
}

while read -r component x y; do
  apply_donor_under_component "$component" "$x" "$y"
done <<'EOF'
title-icon 3 3
title-text 16 3
minimize 251 2
close 266 2
side-tabs 3 18
primary-row-0 20 18
increment-0 91 21
derived-row-0 100 18
primary-row-1 20 36
increment-1 91 39
derived-row-1 100 36
primary-row-2 20 54
increment-2 91 57
derived-row-2 100 54
primary-row-3 20 72
derived-row-3 100 72
primary-row-4 20 90
increment-4 91 93
derived-row-4 100 90
primary-row-5 20 108
increment-5 91 111
derived-row-5 100 108
EOF

convert "$WORK_DIR/owned-$(printf '%02d' "$owned_index").png" -alpha set -channel A \
  -fx '((((j<1||j>=h-1)&&(i<5||i>=w-5))||((j<2||j>=h-2)&&(i<4||i>=w-4))||((j<4||j>=h-4)&&(i<2||i>=w-2))||((j<6||j>=h-6)&&(i<1||i>=w-1)))||((r>0.58)&&(b>0.58)&&(g<0.7)&&(r-g)>0.15&&(b-g)>0.15))?0:a' \
  "$OUTPUT_DIR/clean-plate.png"

# Shared compact chrome is a selected Qwen Image 3 Pro endpoint from the same
# source UI family. Status title/icon/buttons remain separate components.
[[ -f "$OUTPUT_DIR/minimized-plate.png" ]] || {
  printf 'missing dedicated Status minimized asset; run assemble_generated_minimized_states.sh first\n' >&2
  exit 1
}

bash "$REPO_ROOT/scripts/evaluate_qwen_clean_plate.sh" "$OUTPUT_DIR/clean-plate.png" 280 126
sha256sum "$OUTPUT_DIR/clean-plate.png" "$OUTPUT_DIR/minimized-plate.png"
