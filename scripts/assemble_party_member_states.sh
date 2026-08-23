#!/usr/bin/env bash
set -euo pipefail

readonly REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly FIRST_RUN="${REPO_DIR}/artifacts/runs/japanese-party-member-first-cleared-v001/image-01.png"
readonly SECOND_RUN="${REPO_DIR}/artifacts/runs/japanese-party-member-second-selected-v001/image-02.png"
readonly OUTPUT_DIR="${REPO_DIR}/prototype/public/assets/japanese-rpg-v001/party/components"
readonly CLEAN_PLATE="${REPO_DIR}/prototype/public/assets/japanese-rpg-v001/party/clean-plate.png"
readonly WORK_DIR="$(mktemp -d)"
trap 'rm -rf -- "${WORK_DIR}"' EXIT

test -f "${FIRST_RUN}"
test -f "${SECOND_RUN}"
install -d "${OUTPUT_DIR}"

convert "${FIRST_RUN}" \
  -crop 72x76+12+76 +repage \
  -filter point -resize 18x19\! \
  "${OUTPUT_DIR}/member-indicator-off.png"

convert "${SECOND_RUN}" \
  -crop 72x76+12+152 +repage \
  -filter point -resize 18x19\! \
  "${OUTPUT_DIR}/member-indicator-selected.png"

convert "${CLEAN_PLATE}" -crop 154x19+3+19 +repage "${WORK_DIR}/clean-row.png"
convert "${OUTPUT_DIR}/member-0.png" -alpha off \
  -fx '(i>=18&&r<0.4&&g<0.55&&b<0.72)?1:0' \
  "${WORK_DIR}/member-0-glyph-mask.png"
convert "${OUTPUT_DIR}/member-0.png" "${WORK_DIR}/member-0-glyph-mask.png" \
  -alpha off -compose CopyOpacity -composite "${WORK_DIR}/member-0-glyphs.png"
composite -geometry +0+0 "${WORK_DIR}/member-0-glyphs.png" \
  "${WORK_DIR}/clean-row.png" "${WORK_DIR}/member-0-unselected-base.png"
composite -geometry +0+0 "${OUTPUT_DIR}/member-indicator-off.png" \
  "${WORK_DIR}/member-0-unselected-base.png" "${OUTPUT_DIR}/member-row-0-unselected.png"

selected_label_ends=(0 53 148 59 92)
for row in 1 2 3 4; do
  source="${OUTPUT_DIR}/member-${row}.png"
  end="${selected_label_ends[$row]}"
  convert "${source}" -fill '#79A7FC' -draw "rectangle 18,1 ${end},17" \
    "${WORK_DIR}/member-${row}-selected-base.png"
  convert "${source}" -alpha off \
    -fx '(i>=18&&r<0.4&&g<0.55&&b<0.72)?1:0' \
    "${WORK_DIR}/member-${row}-glyph-mask.png"
  convert -size 154x19 xc:'#083B8C' "${WORK_DIR}/member-${row}-glyph-mask.png" \
    -alpha off -compose CopyOpacity -composite "${WORK_DIR}/member-${row}-selected-glyphs.png"
  composite -geometry +0+0 "${WORK_DIR}/member-${row}-selected-glyphs.png" \
    "${WORK_DIR}/member-${row}-selected-base.png" "${WORK_DIR}/member-${row}-selected-text.png"
  composite -geometry +0+0 "${OUTPUT_DIR}/member-indicator-selected.png" \
    "${WORK_DIR}/member-${row}-selected-text.png" "${OUTPUT_DIR}/member-row-${row}-selected.png"
done

for file in \
  "${OUTPUT_DIR}/member-indicator-off.png" \
  "${OUTPUT_DIR}/member-indicator-selected.png" \
  "${OUTPUT_DIR}/member-row-0-unselected.png" \
  "${OUTPUT_DIR}"/member-row-{1,2,3,4}-selected.png; do
  convert "${file}" -strip "${WORK_DIR}/stripped.png"
  mv "${WORK_DIR}/stripped.png" "${file}"
done

identify \
  "${OUTPUT_DIR}/member-indicator-off.png" \
  "${OUTPUT_DIR}/member-indicator-selected.png" \
  "${OUTPUT_DIR}/member-row-0-unselected.png" \
  "${OUTPUT_DIR}"/member-row-{1,2,3,4}-selected.png
