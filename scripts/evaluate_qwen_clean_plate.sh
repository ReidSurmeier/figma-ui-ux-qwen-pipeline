#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
  printf 'Usage: %s CANDIDATE WIDTH HEIGHT\n' "$0" >&2
  exit 2
fi

CANDIDATE=$1
WIDTH=$2
HEIGHT=$3
WORK_DIR=$(mktemp -d)
trap 'rm -rf -- "$WORK_DIR"' EXIT

convert "$CANDIDATE" -filter point -resize "${WIDTH}x${HEIGHT}!" "$WORK_DIR/source-scale.png"
tesseract "$WORK_DIR/source-scale.png" stdout --psm 6 2>/dev/null > "$WORK_DIR/ocr.txt" || true
tesseract "$WORK_DIR/source-scale.png" stdout --psm 6 tsv 2>/dev/null > "$WORK_DIR/ocr.tsv" || true

OCR_TEXT=$(tr '\n' ' ' < "$WORK_DIR/ocr.txt" | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//')
# Empty pixel grids can produce low-confidence pseudo-letters. Gate on tokens
# that Tesseract itself rates at 60 or above, so row lines do not reject a
# genuinely blank donor while source labels and numeric values still do.
awk -F '\t' 'NR > 1 && ($11 + 0) >= 60 && $12 != "" { print $12 }' \
  "$WORK_DIR/ocr.tsv" > "$WORK_DIR/ocr-confident.txt"
OCR_CONFIDENT_TEXT=$(tr '\n' ' ' < "$WORK_DIR/ocr-confident.txt" | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//')
OCR_ALNUM_COUNT=$(tr -cd '[:alnum:]' < "$WORK_DIR/ocr-confident.txt" | wc -c | tr -d ' ')
OCR_RAW_ALNUM_COUNT=$(tr -cd '[:alnum:]' < "$WORK_DIR/ocr.txt" | wc -c | tr -d ' ')
OCR_RAW_LONGEST_TOKEN=$(tr -cs '[:alnum:]' '\n' < "$WORK_DIR/ocr.txt" | awk '{ if (length > max) max=length } END { print max + 0 }')
PINK_COUNT=$(convert "$WORK_DIR/source-scale.png" -alpha off \
  -fx '(r>0.58&&b>0.58&&g<0.7&&(r-g)>0.15&&(b-g)>0.15)?1:0' \
  -format '%[fx:mean*w*h]' info:)

VERDICT=pass
REASONS=()
if (( OCR_ALNUM_COUNT > 8 )); then
  VERDICT=reject
  REASONS+=("semantic-text-residue")
fi
# Low-confidence grid noise can accumulate many short pseudo-words. A single
# long token is the durable signal for retained semantic copy (for example,
# SakumaRiri in the rejected Party candidates), without rejecting blank ruled
# plates whose OCR is only fragments such as "SSeS" or "eee".
if (( OCR_RAW_LONGEST_TOKEN > 6 )); then
  VERDICT=reject
  REASONS+=("low-confidence-semantic-text-residue")
fi
if awk -v count="$PINK_COUNT" 'BEGIN { exit !(count > 0.5) }'; then
  VERDICT=reject
  REASONS+=("opaque-magenta-residue")
fi

jq -n \
  --arg verdict "$VERDICT" \
  --arg ocr_text "$OCR_TEXT" \
  --arg ocr_confident_text "$OCR_CONFIDENT_TEXT" \
  --argjson ocr_alnum_count "$OCR_ALNUM_COUNT" \
  --argjson ocr_raw_alnum_count "$OCR_RAW_ALNUM_COUNT" \
  --argjson ocr_raw_longest_token "$OCR_RAW_LONGEST_TOKEN" \
  --argjson opaque_magenta_pixels "$PINK_COUNT" \
  --argjson width "$WIDTH" \
  --argjson height "$HEIGHT" \
  --arg reasons "$(IFS=,; printf '%s' "${REASONS[*]:-}")" \
  '{
    verdict: $verdict,
    source_scale: {width: $width, height: $height},
    ocr: {confident_alphanumeric_characters: $ocr_alnum_count, raw_alphanumeric_characters: $ocr_raw_alnum_count, raw_longest_token: $ocr_raw_longest_token, confident_text: $ocr_confident_text, raw_text: $ocr_text},
    opaque_magenta_pixels: $opaque_magenta_pixels,
    reasons: (if $reasons == "" then [] else ($reasons | split(",")) end)
  }'

[[ "$VERDICT" == "pass" ]]
