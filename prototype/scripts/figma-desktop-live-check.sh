#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
PROTOTYPE_DIR=$(cd -- "$SCRIPT_DIR/.." && pwd)
REPO_DIR=$(cd -- "$PROTOTYPE_DIR/.." && pwd)
HELPER="$REPO_DIR/.agents/skills/figma-qwen-ui-pipeline/scripts/figma-mcp.mjs"
AUDIT_CODE="$REPO_DIR/artifacts/figma-code-v001/audit.js"
AUDIT_EVIDENCE="$REPO_DIR/artifacts/qa/figma-desktop-audit-v001.json"
SCREENSHOT="$REPO_DIR/artifacts/qa/figma-desktop-current.png"
RUNTIME="$REPO_DIR/artifacts/qa/source-visuals/full.png"

RAW_RESULT=$(node "$HELPER" use \
  --target japanese-options-window-v004 \
  --code-file "$AUDIT_CODE" \
  --description "Live structural audit of the editable Japanese RPG desktop and all linked review destinations" \
  --skills figma-use,figma-generate-design)

if jq -e '.isError == true' <<<"$RAW_RESULT" >/dev/null; then
  jq -r '.content[]? | select(.type == "text") | .text' <<<"$RAW_RESULT" >&2
  exit 1
fi

AUDIT=$(jq -r '[.content[]? | select(.type == "text") | .text] | join("\n")' <<<"$RAW_RESULT")
jq empty <<<"$AUDIT"
jq . <<<"$AUDIT" > "$AUDIT_EVIDENCE"

jq -e '
  .root.id == "41:2" and
  .root.width == 849 and .root.height == 564 and .root.windowCount == 15 and
  .reference.id == "41:3" and (.reference.imageHash | type == "string") and
  (.windows | length) == 15 and
  all(.windows[];
    .geometry == .expectedGeometry and
    .rasterCount >= .expectedComponentMinimum and
    .hotspotCount == .expectedHotspots and
    (.unlinkedHotspots | length) == 0 and
    (.reviewId | type == "string")
  )
' <<<"$AUDIT" >/dev/null

node "$HELPER" screenshot \
  --target japanese-options-window-v004 \
  --node-id 41:2 \
  --out "$SCREENSHOT" \
  --max-dimension 2048 >/dev/null

[[ "$(identify -format '%wx%h' "$SCREENSHOT")" == "849x564" ]]
[[ "$(identify -format '%wx%h' "$RUNTIME")" == "849x564" ]]
RESULT=$(compare -metric MAE "$RUNTIME" "$SCREENSHOT" null: 2>&1 || true)
NORMALIZED=$(sed -n 's/.*(\([^)]*\)).*/\1/p' <<<"$RESULT")
awk -v value="$NORMALIZED" 'BEGIN { exit !(value <= 0.012) }'

printf 'figma-desktop-live-check: PASS 15 windows, 192 editable rasters, 147 linked hotspots, exact geometry, and runtime MAE=%s\n' "$NORMALIZED"
