#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROTOTYPE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_DIR="$(cd "${PROTOTYPE_DIR}/.." && pwd)"
HELPER="${REPO_DIR}/.agents/skills/figma-qwen-ui-pipeline/scripts/figma-mcp.mjs"
AUDIT_CODE="${REPO_DIR}/scripts/figma_japanese_status_v001_audit.js"

RAW_RESULT="$(node "${HELPER}" use \
  --target japanese-options-window-v004 \
  --code-file "${AUDIT_CODE}" \
  --description "Live read-only audit of Japanese Status v001 independent rasters, stat links, tabs, and Qwen minimize endpoint" \
  --skills figma-use,figma-generate-design)"

if jq -e '.isError == true' <<<"${RAW_RESULT}" >/dev/null; then
  jq -r '.content[]? | select(.type == "text") | .text' <<<"${RAW_RESULT}" >&2
  exit 1
fi

AUDIT="$(jq -r '[.content[]? | select(.type == "text") | .text] | join("\n")' <<<"${RAW_RESULT}")"
jq empty <<<"${AUDIT}"

jq -e '
  . as $audit |
  .pageId == "0:1" and
  .roots.default.id == "37:2" and .roots.info.id == "37:27" and
  .roots.Str.id == "37:62" and .roots.Agi.id == "37:87" and
  .roots.Vit.id == "37:112" and .roots.Dex.id == "37:137" and .roots.Luk.id == "37:162" and
  ([.roots[] | .width == 280 and .height == 126 and .parentId == "0:1"] | all) and
  ([.roots[] | .imageHash == "bfaf7b6200a720fcbc4982c3cb87b799764267c7"] | all) and
  .roots.default.rasterLayerCount == 17 and .roots.default.textLayerCount == 0 and
  .roots.info.rasterLayerCount == 17 and .roots.info.textLayerCount == 4 and
  ([.roots.Str, .roots.Agi, .roots.Vit, .roots.Dex, .roots.Luk] | all(.selectedStrokeCount == 1)) and
  .geometry.title == {x: 16, y: 3, width: 56, height: 13} and
  .geometry.sideTabs == {x: 3, y: 18, width: 17, height: 108} and
  .geometry.firstPrimary == {x: 20, y: 18, width: 90, height: 18} and
  .geometry.lastDerived == {x: 100, y: 108, width: 180, height: 18} and
  .geometry.strHotspot == {x: 91, y: 21, width: 11, height: 11} and
  .roots.default.reactions.minimize[0].destinationId == "37:57" and
  .roots.default.reactions.info[0].destinationId == "37:27" and
  (.roots.default.reactions.stats | length) == 0 and
  .roots.info.reactions.stats[0].destinationId == "37:2" and
  (.roots.info.reactions.info | length) == 0 and
  ([["Str", "Agi", "Vit", "Dex", "Luk"][] as $name |
    .roots.default.reactions.statsByName[$name][0].destinationId == .roots[$name].id] | all) and
  ([["Str", "Agi", "Vit", "Dex", "Luk"][] as $name |
    (.roots[$name].reactions.statsByName[$name] | length) == 0] | all) and
  .minimized == {
    id: "37:57", width: 180, height: 18,
    imageHash: "7627842f3f2e552d238f4b2c3bb1f99eca4902c7",
    rasterLayerCount: 4,
    restoreActions: [{type: "NODE", destinationId: "37:2", transition: "SMART_ANIMATE"}],
    closeActions: [{type: "BACK", destinationId: null, transition: null}]
  }
' <<<"${AUDIT}" >/dev/null

printf 'figma-status-live-check: PASS 17 independent rasters, 5 stat states, tabs, close, and Qwen minimize links\n'
