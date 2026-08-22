#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/.." && pwd)
RUN_DIR="$REPO_ROOT/artifacts/runs/japanese-options-window-minimized-state-v001"
DONOR="$RUN_DIR/v001_00003_.png"
RETAINED="$RUN_DIR/selected-minimized-plate.png"
RUNTIME="$REPO_ROOT/prototype/public/assets/japanese-options-v001/components/minimized-plate.png"

test -f "$DONOR"

# Candidate 3 is the only Qwen pass with a complete compact bar and no text.
# Its measured non-white donor bounds are 779x63 at the 4x render scale.
# Normalize that approved donor to the 180x18 source-scale Behavior Contract.
convert "$DONOR" -crop 779x63+0+0 +repage -filter Lanczos -resize 180x18! "$RETAINED"
cp "$RETAINED" "$RUNTIME"

sha256sum "$DONOR" "$RETAINED" "$RUNTIME"
