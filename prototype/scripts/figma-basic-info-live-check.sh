#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROTOTYPE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_DIR="$(cd "${PROTOTYPE_DIR}/.." && pwd)"
HELPER="${REPO_DIR}/.agents/skills/figma-qwen-ui-pipeline/scripts/figma-mcp.mjs"
AUDIT_CODE="${REPO_DIR}/scripts/figma_japanese_basic_info_v001_audit.js"

RAW_RESULT="$(node "${HELPER}" use \
  --target japanese-options-window-v004 \
  --code-file "${AUDIT_CODE}" \
  --description "Live read-only audit of Japanese Basic Info v001 independent rasters, exact geometry, page links, and Qwen minimized endpoint" \
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
  .states == ["status", "option", "items", "equip", "skill", "map", "chat", "friend"] and
  ([.roots[] | .width == 280 and .height == 120 and .parentId == "0:1"] | all) and
  ([.roots[] | .imageHash == "99c695e224a7da63863bb83e4092fe710f93b96d"] | all) and
  ([.roots[] | .rasterLayerCount == 26 and .textLayerCount == 0] | all) and
  ([.roots[] | .minimizeActions[0].destinationId == "32:29"] | all) and
  .minimized == {
    id: "32:29", width: 180, height: 18, parentId: "0:1",
    imageHash: "7627842f3f2e552d238f4b2c3bb1f99eca4902c7",
    rasterLayerCount: 3,
    restoreGeometry: {x: 168, y: 3, width: 10, height: 11},
    restoreActions: [{type: "NODE", destinationId: "32:2", transition: "SMART_ANIMATE", duration: 0.20800000429153442}]
  } and
  .geometry["ui/basic/title/icon"] == {x: 3, y: 3, width: 11, height: 11} and
  .geometry["ui/basic/title/text"] == {x: 15, y: 3, width: 40, height: 12} and
  .geometry["ui/basic/title/minimize"] == {x: 268, y: 3, width: 10, height: 11} and
  .geometry["ui/basic/hp/track"] == {x: 111, y: 22, width: 86, height: 11} and
  .geometry["ui/basic/hp/thumb/default"] == {x: 111, y: 22, width: 48, height: 11} and
  .geometry["ui/basic/sp/track"] == {x: 111, y: 43, width: 86, height: 11} and
  .geometry["ui/basic/sp/thumb/default"] == {x: 111, y: 43, width: 34, height: 11} and
  .geometry["ui/basic/base/label"] == {x: 17, y: 74, width: 58, height: 10} and
  .geometry["ui/basic/footer/text"] == {x: 4, y: 104, width: 198, height: 12} and
  ([.states[] as $state |
    .roots[$state].pageControls |
    to_entries[] |
    if .key == $state
    then (.value.actions | length) == 0
    else (.value.actions | length) == 1 and .value.actions[0].transition == "SMART_ANIMATE"
    end] | all) and
  ([.states[] as $state |
    .roots[$state].pageControls |
    to_entries[] |
    select(.key != $state) |
    .value.actions[0].destinationId == $audit.roots[.key].id
  ] | all) and
  ([.states[] as $state | select($state != "status") | .roots[$state].pageControls[$state].strokeCount == 1] | all)
' <<<"${AUDIT}" >/dev/null

printf 'figma-basic-info-live-check: PASS 26 independent rasters, exact anchors, 8 page states, 56 cross-state links, and Qwen minimized endpoint\n'
