#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/.." && pwd)
REGIONS="$REPO_ROOT/benchmarks/japanese-rpg-options-v001/regions"
FULL_SOURCE="$REPO_ROOT/benchmarks/japanese-rpg-options-v001/reference.png"
OUTPUT="$REPO_ROOT/prototype/public/assets/japanese-rpg-v001"
QWEN_TITLE="$REPO_ROOT/artifacts/runs/japanese-status-clean-plate-v001/image-01.png"
QWEN_BODY="$REPO_ROOT/artifacts/runs/japanese-status-derived-stats-v004/image-01.png"
QWEN_MIN="$OUTPUT/status/minimized-plate.png"
WORK_DIR=$(mktemp -d)
trap 'rm -rf -- "$WORK_DIR"' EXIT

plate() {
  local name=$1 width=$2 height=$3
  local directory="$OUTPUT/$name"
  mkdir -p "$directory/components"
  convert "$QWEN_TITLE" -filter point -resize "${width}x126!" -crop "${width}x18+0+0" +repage "$WORK_DIR/$name-title.png"
  convert "$QWEN_BODY" -filter point -resize 180x108\! -crop 1x1+10+10 +repage -filter point -resize "${width}x$((height - 18))!" "$WORK_DIR/$name-body.png"
  convert -size "${width}x${height}" xc:'#ffffff' "$WORK_DIR/$name-0.png"
  composite -geometry +0+0 "$WORK_DIR/$name-title.png" "$WORK_DIR/$name-0.png" "$WORK_DIR/$name-1.png"
  composite -geometry "+0+18" "$WORK_DIR/$name-body.png" "$WORK_DIR/$name-1.png" "$directory/clean-plate.png"
  convert "$directory/clean-plate.png" -stroke '#7891aa' -strokewidth 1 -fill none -draw "rectangle 0,0 $((width - 1)),$((height - 1))" "$WORK_DIR/$name-bordered.png"
  # Match the source shell's stepped six-pixel corner instead of trimming a
  # rectangular ring or substituting a shallow three-pixel chamfer.
  convert "$WORK_DIR/$name-bordered.png" -alpha set -channel A \
    -fx '(((j<1||j>=h-1)&&(i<5||i>=w-5))||((j<2||j>=h-2)&&(i<4||i>=w-4))||((j<4||j>=h-4)&&(i<2||i>=w-2))||((j<6||j>=h-6)&&(i<1||i>=w-1)))?0:a' \
    "$directory/clean-plate.png"
  if [[ "$name" == "equipment" ]]; then
    [[ -f "$directory/minimized-plate.png" ]] || {
      printf 'missing dedicated Equipment minimized asset; run assemble_generated_minimized_states.sh first\n' >&2
      exit 1
    }
  else
    cp "$QWEN_MIN" "$directory/minimized-plate.png"
  fi
}

crop() {
  local name=$1 component=$2 x=$3 y=$4 width=$5 height=$6
  convert "$REGIONS/$name/reference.png" -crop "${width}x${height}+${x}+${y}" +repage "$OUTPUT/$name/components/$component.png"
}

crop_full() {
  local name=$1 component=$2 x=$3 y=$4 width=$5 height=$6
  convert "$FULL_SOURCE" -crop "${width}x${height}+${x}+${y}" +repage "$OUTPUT/$name/components/$component.png"
}

remove_magenta() {
  local file=$1
  convert "$file" -alpha set -channel A -fx '((r>0.35)&&(b>0.35)&&(g<0.48)&&(r-g)>0.12&&(b-g)>0.12)?0:a' "$WORK_DIR/alpha.png"
  mv "$WORK_DIR/alpha.png" "$file"
}

clear_bottom_donor() {
  local file=$1 rows=$2
  convert "$file" -alpha set -channel A \
    -fx "(j>=h-${rows}&&(r>0.35)&&(b>0.35)&&(g<0.75)&&(r-g)>0.08&&(b-g)>0.08)?0:a" \
    "$WORK_DIR/edge-alpha.png"
  mv "$WORK_DIR/edge-alpha.png" "$file"
}

clear_bottom_rows() {
  local file=$1 rows=$2
  convert "$file" -alpha set -channel A \
    -fx "j>=h-${rows}?0:a" \
    "$WORK_DIR/edge-alpha.png"
  mv "$WORK_DIR/edge-alpha.png" "$file"
}

transparent_component() {
  local name=$1 component=$2 width=$3 height=$4
  convert -size "${width}x${height}" xc:none "$OUTPUT/$name/components/$component.png"
}

plate card 280 150
crop card title-icon 3 3 13 13
crop card title-text 86 3 160 13
crop card close 266 2 13 15
transparent_component card minimize 14 18
crop card art 5 18 82 96
for row in 0 1 2 3; do crop card "copy-$row" 90 "$((20 + row * 19))" 155 19; done
crop card copy-4 90 94 67 18
crop card scrollbar 248 34 29 80
# The source scrollbar is a control, not one frozen picture. Rebuild the
# exposed channel from a source row that is not covered by the resting thumb,
# then isolate the exact source thumb by differencing it against that channel.
convert "$OUTPUT/card/components/scrollbar.png" -crop 29x1+0+50 +repage \
  -filter point -resize 29x58\! "$WORK_DIR/card-channel.png"
composite -geometry +0+10 "$WORK_DIR/card-channel.png" \
  "$OUTPUT/card/components/scrollbar.png" "$WORK_DIR/card-scrollbar-track.png"
convert "$OUTPUT/card/components/scrollbar.png" -crop 29x32+0+10 +repage \
  "$WORK_DIR/card-thumb-source.png"
convert "$WORK_DIR/card-scrollbar-track.png" -crop 29x32+0+10 +repage \
  "$WORK_DIR/card-thumb-clean.png"
convert "$WORK_DIR/card-thumb-source.png" "$WORK_DIR/card-thumb-clean.png" \
  -compose difference -composite -colorspace gray -threshold 4% \
  -morphology Close Square "$WORK_DIR/card-thumb-mask.png"
convert "$WORK_DIR/card-thumb-source.png" "$WORK_DIR/card-thumb-mask.png" \
  -alpha off -compose copy_opacity -composite \
  "$OUTPUT/card/components/scrollbar-thumb.png"
mv "$WORK_DIR/card-scrollbar-track.png" "$OUTPUT/card/components/scrollbar-track.png"
rm -f "$OUTPUT/card/components/scrollbar.png" "$OUTPUT/card/components/checkbox.png"
crop card bottom-icon 5 122 25 22
crop card bottom-slot 30 121 246 25

plate skills 281 184
crop skills title-icon 3 3 13 13
crop skills title-text 16 3 96 13
crop skills close 267 2 13 15
transparent_component skills minimize 14 18
for row in 0 1 2 3; do
  crop skills "icon-$row" 41 "$((20 + row * 36))" 34 34
  crop skills "copy-$row" 104 "$((18 + row * 36))" 141 36
  crop skills "level-$row" 75 "$((20 + row * 36))" 28 34
done
crop skills scrollbar 263 18 17 144
# Isolate the source thumb from the Skills track. The uncovered row at y=100
# is repeated only behind the resting thumb; arrows and surrounding pixels stay
# source-locked. The independent thumb can then traverse the whole channel.
convert "$OUTPUT/skills/components/scrollbar.png" -crop 17x1+0+100 +repage \
  -filter point -resize 17x38\! "$WORK_DIR/skills-channel.png"
composite -geometry +0+37 "$WORK_DIR/skills-channel.png" \
  "$OUTPUT/skills/components/scrollbar.png" "$WORK_DIR/skills-scrollbar-track.png"
convert "$OUTPUT/skills/components/scrollbar.png" -crop 17x38+0+37 +repage \
  "$WORK_DIR/skills-thumb-source.png"
convert "$WORK_DIR/skills-scrollbar-track.png" -crop 17x38+0+37 +repage \
  "$WORK_DIR/skills-thumb-clean.png"
convert "$WORK_DIR/skills-thumb-source.png" "$WORK_DIR/skills-thumb-clean.png" \
  -compose difference -composite -colorspace gray -threshold 4% \
  -morphology Close Square -fx '(i<5||i>14)?0:u' \
  "$WORK_DIR/skills-thumb-mask.png"
convert "$WORK_DIR/skills-thumb-source.png" "$WORK_DIR/skills-thumb-mask.png" \
  -alpha off -compose copy_opacity -composite \
  "$OUTPUT/skills/components/scrollbar-thumb.png"
mv "$WORK_DIR/skills-scrollbar-track.png" "$OUTPUT/skills/components/scrollbar-track.png"
rm -f "$OUTPUT/skills/components/scrollbar.png"
crop skills points 2 163 173 20
crop skills use 175 164 43 20
crop skills close-action 220 164 43 20
crop skills resize-grip 263 162 17 22
for file in "$OUTPUT/skills/components"/{points,use,close-action,resize-grip}.png; do remove_magenta "$file"; done
# These source crops terminate directly on the donor background. Preserve the
# button pixels while making the final donor row truly transparent; the softer
# pink fringe is too light for the general high-chroma mask above.
for file in "$OUTPUT/skills/components"/{use,close-action,resize-grip}.png; do clear_bottom_rows "$file" 1; done

plate equipment 280 152
crop equipment title-icon 3 3 13 13
crop equipment title-text 16 3 110 13
crop equipment minimize 251 2 14 15
crop equipment close 266 2 13 15
for row in 0 1 2 3; do
  crop equipment "left-$row" 4 "$((18 + row * 29))" 105 29
  crop equipment "right-$row" 170 "$((18 + row * 29))" 106 29
done
crop equipment left-4 4 134 105 18
crop equipment right-4 170 134 106 18
crop equipment avatar 109 18 61 134
for file in "$OUTPUT/equipment/components"/{left-4,right-4,avatar}.png; do clear_bottom_donor "$file" 4; done

plate chat 280 120
crop chat title-icon 2 2 13 13
crop chat title-text 15 1 45 15
transparent_component chat minimize 14 18
transparent_component chat close 13 18
crop chat topic-label 3 26 41 19
crop chat topic-field 44 26 232 19
crop chat people 3 45 133 20
rm -f "$OUTPUT/chat/components/room.png"
crop chat room-label 136 45 45 20
crop chat room-select 181 45 95 20
crop chat security 3 65 131 20
crop chat password 135 65 141 20
# The source depicts 公開 selected and 非公開 unselected. Keep the Japanese
# labels in their exact source raster, remove the two baked state icons, and
# expose the on/off icons as independent transparent assets that can swap.
convert "$OUTPUT/chat/components/security.png" -crop 16x18+40+1 +repage "$OUTPUT/chat/components/privacy-on.png"
convert "$OUTPUT/chat/components/security.png" -crop 16x18+79+1 +repage "$OUTPUT/chat/components/privacy-off.png"
for file in "$OUTPUT/chat/components"/privacy-{on,off}.png; do
  convert "$file" -alpha set -channel A -fx '((r>0.96)&&(g>0.96)&&(b>0.96))?0:a' "$WORK_DIR/privacy-alpha.png"
  mv "$WORK_DIR/privacy-alpha.png" "$file"
done
convert "$OUTPUT/chat/components/security.png" -alpha set -channel A \
  -fx '((i>=40&&i<56)||(i>=79&&i<95))?0:a' "$WORK_DIR/security-labels.png"
mv "$WORK_DIR/security-labels.png" "$OUTPUT/chat/components/security.png"
crop_full chat ok 474 376 44 22
crop_full chat cancel 519 376 43 22
for file in "$OUTPUT/chat/components"/{ok,cancel}.png; do remove_magenta "$file"; done

plate exchange 280 120
crop exchange title-icon 3 3 13 13
crop exchange title-text 16 3 140 13
transparent_component exchange minimize 14 18
transparent_component exchange close 13 18
for row in 0 1; do
  for column in 0 1 2 3 4 5 6 7; do
    crop exchange "item-${row}-${column}" "$((5 + column * 34))" "$((19 + row * 34))" 34 34
  done
done
crop exchange summary 4 87 272 14
crop exchange ok 4 101 40 18
crop exchange trade 121 101 42 18
crop exchange cancel 235 101 41 18

plate game-menu 222 133
transparent_component game-menu title-icon 13 13
transparent_component game-menu title-text 128 13
transparent_component game-menu minimize 14 18
transparent_component game-menu close 13 18
for row in 0 1 2 3; do crop game-menu "action-$row" 0 "$((29 + row * 25))" 193 22; done

# Keep every source-visible Game Menu pixel exact. Qwen owns only the pixels
# hidden by the overlapping Skills window, the magenta desktop holes, and the
# semantic action footprints beneath their independent rasters.
cp "$OUTPUT/game-menu/clean-plate.png" "$WORK_DIR/game-menu-qwen-donor.png"
cp "$REGIONS/game-menu/reference.png" "$WORK_DIR/game-menu-source.png"
convert "$WORK_DIR/game-menu-source.png" -alpha off \
  -fx '((j<2)||((r>0.45)&&(b>0.45)&&(g<0.95)&&(r-g)>0.04&&(b-g)>0.04))?1:0' "$WORK_DIR/game-menu-hidden-mask.png"
convert "$WORK_DIR/game-menu-qwen-donor.png" "$WORK_DIR/game-menu-hidden-mask.png" -alpha off -compose CopyOpacity -composite "$WORK_DIR/game-menu-hidden-patch.png"
composite "$WORK_DIR/game-menu-hidden-patch.png" "$WORK_DIR/game-menu-source.png" "$WORK_DIR/game-menu-owned-00.png"
game_menu_index=0
for row in 0 1 2 3; do
  next=$((game_menu_index + 1))
  component="$OUTPUT/game-menu/components/action-$row.png"
  convert "$component" -alpha extract "$WORK_DIR/game-menu-mask-$next.png"
  convert "$WORK_DIR/game-menu-qwen-donor.png" -crop "193x22+0+$((29 + row * 25))" +repage "$WORK_DIR/game-menu-donor-$next.png"
  convert "$WORK_DIR/game-menu-donor-$next.png" "$WORK_DIR/game-menu-mask-$next.png" -alpha off -compose CopyOpacity -composite "$WORK_DIR/game-menu-patch-$next.png"
  composite -geometry "+0+$((29 + row * 25))" "$WORK_DIR/game-menu-patch-$next.png" "$WORK_DIR/game-menu-owned-$(printf '%02d' "$game_menu_index").png" "$WORK_DIR/game-menu-owned-$(printf '%02d' "$next").png"
  game_menu_index=$next
done
convert "$WORK_DIR/game-menu-owned-$(printf '%02d' "$game_menu_index").png" -alpha set -channel A \
  -fx '((((j<1||j>=h-1)&&(i<5||i>=w-5))||((j<2||j>=h-2)&&(i<4||i>=w-4))||((j<4||j>=h-4)&&(i<2||i>=w-2))||((j<6||j>=h-6)&&(i<1||i>=w-1)))||((r>0.35)&&(b>0.35)&&(g<0.48)&&(r-g)>0.12&&(b-g)>0.12))?0:a' "$OUTPUT/game-menu/clean-plate.png"

plate party 160 175
crop party title-icon 3 5 13 13
crop party title-text 16 5 125 13
transparent_component party minimize 14 18
crop party close 143 4 13 15
crop party summary 3 20 154 19
for row in 0 1 2 3 4; do crop party "member-$row" 3 "$((20 + row * 19))" 154 19; done
for row in 0 1 2; do crop_full party "action-$row" 738 "$((350 + row * 23))" 41 20; done
for file in "$OUTPUT/party/components"/action-*.png; do remove_magenta "$file"; done
for column in 0 1 2 3 4; do crop party "tool-$column" "$((4 + column * 29))" 116 29 20; done
crop party friends 3 136 76 20
crop party party-tab 80 136 77 20

# Preserve the exact complete 160x175 Party shell and use the Qwen plate only
# beneath independently owned foreground components.
cp "$OUTPUT/party/clean-plate.png" "$WORK_DIR/party-qwen-donor.png"
cp "$REGIONS/party/reference.png" "$WORK_DIR/party-source.png"
party_index=0
cp "$WORK_DIR/party-source.png" "$WORK_DIR/party-owned-00.png"
party_donor() {
  local component=$1 x=$2 y=$3
  local file="$OUTPUT/party/components/$component.png"
  local width height next
  read -r width height < <(identify -format '%w %h\n' "$file")
  next=$((party_index + 1))
  convert "$WORK_DIR/party-qwen-donor.png" -crop "${width}x${height}+${x}+${y}" +repage "$WORK_DIR/party-donor-$next.png"
  convert "$file" -alpha extract "$WORK_DIR/party-mask-$next.png"
  convert "$WORK_DIR/party-donor-$next.png" "$WORK_DIR/party-mask-$next.png" -alpha off -compose CopyOpacity -composite "$WORK_DIR/party-patch-$next.png"
  composite -geometry "+${x}+${y}" "$WORK_DIR/party-patch-$next.png" "$WORK_DIR/party-owned-$(printf '%02d' "$party_index").png" "$WORK_DIR/party-owned-$(printf '%02d' "$next").png"
  party_index=$next
}
while read -r component x y; do party_donor "$component" "$x" "$y"; done <<'EOF'
title-icon 3 5
title-text 16 5
close 143 4
member-0 3 20
member-1 3 39
member-2 3 58
member-3 3 77
member-4 3 96
tool-0 4 116
tool-1 33 116
tool-2 62 116
tool-3 91 116
tool-4 120 116
friends 3 136
party-tab 80 136
EOF
convert "$WORK_DIR/party-owned-$(printf '%02d' "$party_index").png" -alpha set -channel A \
  -fx '((r>0.35)&&(b>0.35)&&(g<0.48)&&(r-g)>0.12&&(b-g)>0.12)?0:a' "$OUTPUT/party/clean-plate.png"

mkdir -p "$OUTPUT/quickbar/components"
convert -size 112x94 xc:none "$OUTPUT/quickbar/clean-plate.png"
cp "$QWEN_MIN" "$OUTPUT/quickbar/minimized-plate.png"
transparent_component quickbar title-icon 13 13
transparent_component quickbar title-text 80 13
transparent_component quickbar minimize 14 18
transparent_component quickbar close 13 18
crop quickbar slot-0 2 2 42 42
crop quickbar slot-1 44 1 42 43
crop quickbar slot-2 2 50 76 42
for file in "$OUTPUT/quickbar/components"/slot-*.png; do remove_magenta "$file"; done

plate compact-info 281 35
crop_full compact-info title-icon 571 318 13 13
crop_full compact-info title-text 584 318 100 13
transparent_component compact-info minimize 14 18
transparent_component compact-info close 13 18
crop_full compact-info levels 684 318 164 13
crop_full compact-info hp 584 334 126 15
crop_full compact-info sp 710 334 138 15
for file in "$OUTPUT/compact-info/components"/{levels,hp,sp}.png; do remove_magenta "$file"; done
clear_bottom_donor "$OUTPUT/compact-info/components/hp.png" 1
clear_bottom_donor "$OUTPUT/compact-info/components/sp.png" 1

mkdir -p "$OUTPUT/bottom-bar/components"
rm -f "$OUTPUT/bottom-bar/components/lead.png" "$OUTPUT/bottom-bar/components/track.png"
convert -size 600x21 xc:none "$OUTPUT/bottom-bar/clean-plate.png"
cp "$QWEN_MIN" "$OUTPUT/bottom-bar/minimized-plate.png"
transparent_component bottom-bar title-icon 13 13
transparent_component bottom-bar title-text 80 13
transparent_component bottom-bar minimize 14 18
transparent_component bottom-bar close 13 18
crop_full bottom-bar rail 0 538 580 21
convert "$FULL_SOURCE" -crop 9x21+106+538 +repage "$WORK_DIR/bottom-clean-patch.png"
composite -geometry +97+0 "$WORK_DIR/bottom-clean-patch.png" "$OUTPUT/bottom-bar/components/rail.png" "$WORK_DIR/bottom-rail-clean.png"
mv "$WORK_DIR/bottom-rail-clean.png" "$OUTPUT/bottom-bar/components/rail.png"
convert "$FULL_SOURCE" -crop 8x17+98+540 +repage -alpha set -channel A \
  -fx '((b>r*1.15)&&(b>g*1.05)&&(b>0.42))?a:0' "$OUTPUT/bottom-bar/components/thumb.png"
crop_full bottom-bar previous 580 538 10 21
crop_full bottom-bar next 590 538 10 21

mkdir -p "$OUTPUT/notification/components"
convert -size 245x41 xc:none "$OUTPUT/notification/clean-plate.png"
cp "$QWEN_MIN" "$OUTPUT/notification/minimized-plate.png"
transparent_component notification title-icon 13 13
transparent_component notification title-text 80 13
transparent_component notification minimize 14 18
transparent_component notification close 13 18
crop_full notification bubble 604 523 143 41
crop_full notification upper 747 523 102 20
crop_full notification lower 747 543 102 21
for file in "$OUTPUT/notification/components"/{bubble,upper,lower}.png; do remove_magenta "$file"; done

for name in card skills equipment chat exchange game-menu party quickbar compact-info bottom-bar notification; do
  montage "$OUTPUT/$name/components"/*.png -tile 8x -geometry +4+4 -background '#111827' "$REPO_ROOT/artifacts/runs/japanese-$name-components-v001-contact-sheet.png"
done

printf 'assembled remaining Japanese RPG component assets from source-locked crops over Qwen plates\n'
