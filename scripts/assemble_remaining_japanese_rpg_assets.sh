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
  cp "$QWEN_MIN" "$directory/minimized-plate.png"
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
crop card checkbox 90 94 67 18
crop card scrollbar 248 34 29 80
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
crop chat room 136 45 140 20
crop chat security 3 65 131 20
crop chat password 135 65 141 20
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

plate party 210 154
convert "$OUTPUT/party/clean-plate.png" -alpha set -channel A -fx 'i>=160?0:a' "$WORK_DIR/party-alpha.png"
mv "$WORK_DIR/party-alpha.png" "$OUTPUT/party/clean-plate.png"
crop party title-icon 3 39 13 13
crop party title-text 16 39 125 13
transparent_component party minimize 14 18
crop party close 143 38 13 15
crop party summary 3 54 154 19
for row in 0 1 2 3 4; do crop party "member-$row" 3 "$((54 + row * 19))" 154 19; done
for row in 0 1 2; do crop_full party "action-$row" 738 "$((350 + row * 23))" 41 20; done
for file in "$OUTPUT/party/components"/action-*.png; do remove_magenta "$file"; done
for column in 0 1 2 3 4; do crop party "tool-$column" "$((4 + column * 29))" 150 29 20; done
crop party friends 3 170 76 20
crop party party-tab 80 170 77 20

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
