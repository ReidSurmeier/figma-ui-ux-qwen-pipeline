#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
PROTOTYPE_DIR=$(cd -- "$SCRIPT_DIR/.." && pwd)
REPO_DIR=$(cd -- "$PROTOTYPE_DIR/.." && pwd)
RUNTIME_SOURCE="$PROTOTYPE_DIR/src/RemainingSourceWindows.tsx"
ASSEMBLY_SOURCE="$REPO_DIR/scripts/assemble_remaining_japanese_rpg_assets.sh"

declare -A counts=(
  [card]=13 [skills]=21 [equipment]=15 [chat]=12
  [exchange]=24 [game-menu]=8 [party]=20 [quickbar]=7
  [compact-info]=7 [bottom-bar]=8 [notification]=7
)
declare -A dimensions=(
  [card]=280x150 [skills]=281x184 [equipment]=280x152 [chat]=280x120
  [exchange]=280x120 [game-menu]=222x133 [party]=210x154 [quickbar]=112x94
  [compact-info]=281x35 [bottom-bar]=600x21 [notification]=245x41
)

! rg -q 'benchmarks/|reference\.png|regions/' "$RUNTIME_SOURCE"
rg -Fq 'japanese-status-clean-plate-v001/image-01.png' "$ASSEMBLY_SOURCE"
rg -Fq 'japanese-status-derived-stats-v004/image-01.png' "$ASSEMBLY_SOURCE"

for name in "${!counts[@]}"; do
  root="$PROTOTYPE_DIR/public/assets/japanese-rpg-v001/$name"
  [[ "$(identify -format '%wx%h' "$root/clean-plate.png")" == "${dimensions[$name]}" ]]
  [[ "$(find "$root/components" -maxdepth 1 -name '*.png' | wc -l)" == "${counts[$name]}" ]]
  pink="$(convert "$root/clean-plate.png" -alpha set -fx '(a>0.1&&r>0.35&&b>0.35&&g<0.48&&(r-g)>0.12&&(b-g)>0.12)?1:0' -format '%[fx:mean*w*h]' info:)"
  awk -v count="$pink" 'BEGIN { exit !(count < 0.5) }'
  [[ "$(convert "$root/clean-plate.png" -alpha extract -crop 1x1+0+0 -format '%[fx:mean]' info:)" == "0" ]]
  if [[ "$name" != "quickbar" && "$name" != "bottom-bar" && "$name" != "notification" ]]; then
    awk -v alpha="$(convert "$root/clean-plate.png" -alpha extract -gravity north -crop 1x1+0+0 -format '%[fx:mean]' info:)" 'BEGIN { exit !(alpha > 0.9) }'
  fi
done

for asset in "$PROTOTYPE_DIR/public/assets/japanese-rpg-v001/quickbar/components"/slot-*.png; do
  pink="$(convert "$asset" -alpha set -fx '(a>0.1&&r>0.35&&b>0.35&&g<0.48&&(r-g)>0.12&&(b-g)>0.12)?1:0' -format '%[fx:mean*w*h]' info:)"
  awk -v count="$pink" 'BEGIN { exit !(count < 0.5) }'
done

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
  ["compact-info/components/hp.png"]=1
  ["compact-info/components/sp.png"]=1
)
for relative in "${!transparent_bottom_rows[@]}"; do
  asset="$PROTOTYPE_DIR/public/assets/japanese-rpg-v001/$relative"
  rows=${transparent_bottom_rows[$relative]}
  height=$(identify -format '%h' "$asset")
  alpha=$(convert "$asset" -alpha extract -crop "$(identify -format '%w' "$asset")x${rows}+0+$((height - rows))" +repage -format '%[fx:mean]' info:)
  awk -v value="$alpha" 'BEGIN { exit !(value < 0.001) }'
done

printf 'remaining-window-contract: PASS Qwen plates, 142 independent assets, rounded pixel corners, no runtime underlay, and no donor-pink component seams\n'
