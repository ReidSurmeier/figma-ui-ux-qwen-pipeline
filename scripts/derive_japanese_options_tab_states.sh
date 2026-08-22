#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ASSET_DIR="${REPO_DIR}/prototype/public/assets/japanese-options-v001/components"

# The Qwen alternate-state run is retained as rejected provenance because it
# changed tab geometry and lettering. These two assets preserve the isolated
# source pixels and change only the source palette roles required by selection.
convert "${ASSET_DIR}/tab-option.png" \
  -fuzz 4% \
  -fill '#8E898D' -opaque '#3B3C40' \
  -fill '#F8F3F7' -opaque '#FFFFFF' \
  "${ASSET_DIR}/tab-option-inactive.png"

convert "${ASSET_DIR}/tab-info.png" \
  -fuzz 4% \
  -fill '#3B3C40' -opaque '#8E898D' \
  -fill '#FFFFFF' -opaque '#F8F3F7' \
  "${ASSET_DIR}/tab-info-selected.png"

sha256sum \
  "${ASSET_DIR}/tab-option-inactive.png" \
  "${ASSET_DIR}/tab-info-selected.png"
