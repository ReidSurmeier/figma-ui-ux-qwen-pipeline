#!/usr/bin/env bash
set -euo pipefail

readonly REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly FIRST_RUN="${REPO_DIR}/artifacts/runs/japanese-party-member-first-cleared-v001/image-01.png"
readonly SECOND_RUN="${REPO_DIR}/artifacts/runs/japanese-party-member-second-selected-v001/image-02.png"
readonly OUTPUT_DIR="${REPO_DIR}/prototype/public/assets/japanese-rpg-v001/party/components"

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

identify "${OUTPUT_DIR}/member-indicator-off.png" "${OUTPUT_DIR}/member-indicator-selected.png"
