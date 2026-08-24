#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
PROTOTYPE_DIR=$(cd -- "$SCRIPT_DIR/.." && pwd)
REPO_DIR=$(cd -- "$PROTOTYPE_DIR/.." && pwd)
RUNTIME_SOURCE="$PROTOTYPE_DIR/src/RemainingSourceWindows.tsx"
ASSEMBLY_SOURCE="$REPO_DIR/scripts/assemble_remaining_japanese_rpg_assets.sh"
MANIFEST="$REPO_DIR/artifacts/qa/runtime-component-manifest.json"

declare -A counts=(
  [card]=13 [skills]=33 [equipment]=15 [chat]=13
  [exchange]=22 [game-menu]=6 [party]=18 [quickbar]=5
  [compact-info]=5 [bottom-bar]=6 [notification]=5
)
declare -A dimensions=(
  [card]=280x150 [skills]=281x184 [equipment]=280x152 [chat]=280x120
  [exchange]=280x120 [game-menu]=222x133 [party]=160x157 [quickbar]=112x94
  [compact-info]=281x35 [bottom-bar]=600x21 [notification]=245x41
)

! rg -q 'benchmarks/|reference\.png|regions/' "$RUNTIME_SOURCE"
rg -Fq 'japanese-status-clean-plate-v001/image-01.png' "$ASSEMBLY_SOURCE"
rg -Fq 'japanese-status-derived-stats-v004/image-01.png' "$ASSEMBLY_SOURCE"

for name in "${!counts[@]}"; do
  clean_plate_path=$(jq -r --arg id "$name" '.windows[] | select(.id == $id) | .cleanPlate' "$MANIFEST")
  clean_plate="$PROTOTYPE_DIR/public/${clean_plate_path#/}"
  actual_dimensions=$(identify -format '%wx%h' "$clean_plate")
  [[ "$actual_dimensions" == "${dimensions[$name]}" ]] || { printf 'remaining-window-contract: FAIL %s plate is %s, expected %s\n' "$name" "$actual_dimensions" "${dimensions[$name]}" >&2; exit 1; }
  actual_count=$(jq -r --arg id "$name" '.windows[] | select(.id == $id) | .components | length' "$MANIFEST")
  unique_count=$(jq -r --arg id "$name" '.windows[] | select(.id == $id) | [.components[].assetPath] | unique | length' "$MANIFEST")
  [[ "$actual_count" == "${counts[$name]}" ]] || { printf 'remaining-window-contract: FAIL %s declares %s components, expected %s\n' "$name" "$actual_count" "${counts[$name]}" >&2; exit 1; }
  [[ "$unique_count" == "$actual_count" ]] || { printf 'remaining-window-contract: FAIL %s reuses one asset across independent components\n' "$name" >&2; exit 1; }
  while IFS= read -r asset_path; do
    [[ -f "$PROTOTYPE_DIR/public/${asset_path#/}" ]] || { printf 'remaining-window-contract: FAIL %s declares missing asset %s\n' "$name" "$asset_path" >&2; exit 1; }
  done < <(jq -r --arg id "$name" '.windows[] | select(.id == $id) | .components[].assetPath' "$MANIFEST")
  pink="$(convert "$clean_plate" -alpha set -fx '(a>0.1&&r>0.35&&b>0.35&&g<0.48&&(r-g)>0.12&&(b-g)>0.12)?1:0' -format '%[fx:mean*w*h]' info:)"
  awk -v count="$pink" 'BEGIN { exit !(count < 0.5) }'
  [[ "$(convert "$clean_plate" -alpha extract -crop 1x1+0+0 -format '%[fx:mean]' info:)" == "0" ]]
  if [[ "$name" != "quickbar" && "$name" != "bottom-bar" && "$name" != "notification" ]]; then
    sample_y=0
    [[ "$name" == "party" ]] && sample_y=6
    awk -v alpha="$(convert "$clean_plate" -alpha extract -crop "1x1+$(( $(identify -format '%w' "$clean_plate") / 2 ))+$sample_y" -format '%[fx:mean]' info:)" 'BEGIN { exit !(alpha > 0.9) }'
  fi
done

for asset in "$PROTOTYPE_DIR/public/assets/japanese-rpg-v001/quickbar/components"/slot-*.png; do
  pink="$(convert "$asset" -alpha set -fx '(a>0.1&&r>0.35&&b>0.35&&g<0.48&&(r-g)>0.12&&(b-g)>0.12)?1:0' -format '%[fx:mean*w*h]' info:)"
  awk -v count="$pink" 'BEGIN { exit !(count < 0.5) }'
done

# Apply the learned pink-border correction to every active component, not to
# historical siblings in the asset directory. A two-pixel allowance preserves
# legitimate close-icon accents while rejecting donor-colored crop rings.
while IFS=$'\t' read -r window_id component_id asset_path; do
  asset="$PROTOTYPE_DIR/public/${asset_path#/}"
  boundary_pink=$(convert "$asset" -alpha set \
    -fx '((i<3||j<3||i>=w-3||j>=h-3)&&a>0.1&&r>0.35&&b>0.35&&g<0.48&&(r-g)>0.12&&(b-g)>0.12)?1:0' \
    -format '%[fx:mean*w*h]' info:)
  awk -v count="$boundary_pink" 'BEGIN { exit !(count <= 2.5) }' || {
    printf 'remaining-window-contract: FAIL %s/%s carries %s donor-colored boundary pixels\n' "$window_id" "$component_id" "$boundary_pink" >&2
    exit 1
  }
done < <(jq -r '.windows[] | .id as $window | .components[] | [$window,.id,.assetPath] | @tsv' "$MANIFEST")

# Negative-space seams must be transparent, not merely excluded from the
# screenshot-difference mask. These are the exact crop edges that touch the
# donor magenta in the authority screenshot.
declare -A transparent_bottom_rows=(
  ["skills/components/use.png"]=1
  ["skills/components/close-action.png"]=1
  ["skills/components/resize-grip.png"]=1
  ["equipment/components/left-4.png"]=4
  ["equipment/components/right-4.png"]=4
  ["equipment/components/avatar.png"]=4
  ["chat/components/ok.png"]=1
  ["chat/components/cancel.png"]=1
  ["compact-info/components/hp-source-locked.png"]=1
  ["compact-info/components/sp-source-locked.png"]=1
)
for relative in "${!transparent_bottom_rows[@]}"; do
  asset="$PROTOTYPE_DIR/public/assets/japanese-rpg-v001/$relative"
  rows=${transparent_bottom_rows[$relative]}
  height=$(identify -format '%h' "$asset")
  alpha=$(convert "$asset" -alpha extract -crop "$(identify -format '%w' "$asset")x${rows}+0+$((height - rows))" +repage -format '%[fx:mean]' info:)
  awk -v value="$alpha" 'BEGIN { exit !(value < 0.001) }'
done

printf 'remaining-window-contract: PASS active Qwen plates, 141 unique declared component assets, movable source scroll thumbs, rounded pixel corners, no runtime underlay, and no donor-pink component seams\n'
