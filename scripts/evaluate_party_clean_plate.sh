#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  printf 'Usage: %s CANDIDATE\n' "$0" >&2
  exit 2
fi

CANDIDATE=$1
WORK_DIR=$(mktemp -d)
trap 'rm -rf -- "$WORK_DIR"' EXIT
convert "$CANDIDATE" -filter point -resize 160x210\! "$WORK_DIR/source.png"

DARK_PIXELS=$(convert "$WORK_DIR/source.png" -crop 150x25+5+18 +repage \
  -colorspace Gray -threshold 45% -negate -format '%[fx:mean*w*h]' info:)
ROW_RESULT=$(compare -metric MAE \
  "$WORK_DIR/source.png[150x20+5+23]" \
  "$WORK_DIR/source.png[150x20+5+48]" null: 2>&1 || true)
ROW_MAE=$(sed -n 's/.*(\([^)]*\)).*/\1/p' <<<"$ROW_RESULT")

VERDICT=pass
REASONS=()
if awk -v count="$DARK_PIXELS" 'BEGIN { exit !(count > 50) }'; then
  VERDICT=reject
  REASONS+=("first-row-foreground-residue")
fi
if awk -v value="$ROW_MAE" 'BEGIN { exit !(value > 0.03) }'; then
  VERDICT=reject
  REASONS+=("selected-row-surface-residue")
fi

jq -n --arg verdict "$VERDICT" --argjson dark "$DARK_PIXELS" --argjson row_mae "$ROW_MAE" \
  --arg reasons "$(IFS=,; printf '%s' "${REASONS[*]:-}")" \
  '{verdict: $verdict, first_row_dark_pixels: $dark, first_to_second_row_mae: $row_mae, reasons: (if $reasons == "" then [] else ($reasons | split(",")) end)}'

[[ "$VERDICT" == "pass" ]]
