#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/.." && pwd)
SOURCE="$REPO_ROOT/prototype/public/assets/japanese-options-v001/clean-plate.png"
OUTPUT="$REPO_ROOT/prototype/public/assets/japanese-options-v001/clean-plate-alpha-edge.png"
QWEN_EDGE="$REPO_ROOT/artifacts/runs/japanese-options-window-clean-plate-v001/image-01.png"
WORK_DIR=$(mktemp -d)
trap 'rm -r -- "$WORK_DIR"' EXIT

# The assembled plate contains the correct exposed surfaces, but its outer
# pixels came from the magenta-backed screenshot. Recover the perimeter from
# the Qwen clean-plate pass: it retained the source's stepped six-pixel curve
# and blue/grey chrome. Only the actual high-chroma donor field becomes alpha.
# The first implementation cleared a rectangular three-pixel ring and erased
# the curve itself; keeping a separately generated edge authority prevents
# that regression without placing the screenshot under the runtime.
test -f "$QWEN_EDGE"
convert "$SOURCE" -alpha set -channel A \
  -fx '((r>0.35)&&(b>0.35)&&(g<0.48)&&(r-g)>0.12&&(b-g)>0.12)?0:a' \
  "$WORK_DIR/body.png"
convert "$WORK_DIR/body.png" -alpha set -channel A \
  -fx '(i<6||i>=w-6||j<2||j>=h-2)?0:a' "$WORK_DIR/body-inset.png"

convert "$QWEN_EDGE" -filter point -resize 280x122\! -alpha set -channel A \
  -fx '((r>0.75)&&(b>0.75)&&(g<0.15)&&(r-g)>0.55&&(b-g)>0.55)?0:a' \
  "$WORK_DIR/qwen-alpha.png"
# Decontaminate the surviving anti-aliased curve. These are real edge pixels,
# but Qwen inherited magenta spill from the screenshot background. Preserve
# their luminance and alpha while moving only purple-biased pixels back into
# the source chrome's blue-grey family.
convert "$WORK_DIR/qwen-alpha.png" -colorspace Gray -fill '#7891aa' -colorize 62% \
  "$WORK_DIR/qwen-neutral.png"
convert "$WORK_DIR/qwen-alpha.png" -alpha extract "$WORK_DIR/qwen-alpha-mask.png"
convert "$WORK_DIR/qwen-alpha.png" -alpha off \
  -fx '((r>g*1.18)&&(b>g*1.18))?1:0' "$WORK_DIR/qwen-purple-mask.png"
convert "$WORK_DIR/qwen-purple-mask.png" "$WORK_DIR/qwen-alpha-mask.png" \
  -compose Multiply -composite "$WORK_DIR/qwen-edge-mask.png"
convert "$WORK_DIR/qwen-alpha.png" "$WORK_DIR/qwen-neutral.png" "$WORK_DIR/qwen-edge-mask.png" \
  -compose Over -composite "$WORK_DIR/qwen-decontaminated.png"
convert "$WORK_DIR/qwen-decontaminated.png" -alpha set -channel A \
  -fx '(i<6||i>=w-6||j<2||j>=h-2)?a:0' "$WORK_DIR/qwen-edge.png"

composite "$WORK_DIR/qwen-edge.png" "$WORK_DIR/body-inset.png" "$OUTPUT"

printf 'derive-runtime-plate: %s\n' "$(identify -format '%wx%h opaque=%[opaque]' "$OUTPUT")"
sha256sum "$SOURCE" "$OUTPUT"
