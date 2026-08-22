#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROTOTYPE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_DIR="$(cd "${PROTOTYPE_DIR}/.." && pwd)"
HELPER="${REPO_DIR}/.agents/skills/figma-qwen-ui-pipeline/scripts/figma-mcp.mjs"
AUDIT_CODE="${REPO_DIR}/scripts/figma_japanese_options_v004_audit.js"

RAW_RESULT="$(node "${HELPER}" use \
  --target japanese-options-window-v004 \
  --code-file "${AUDIT_CODE}" \
  --description "Live read-only audit of Japanese Options v004 tab hit mapping, transparent slider thumb, geometry, assets, fonts, and reactions" \
  --skills figma-use,figma-generate-design)"

if jq -e '.isError == true' <<<"${RAW_RESULT}" >/dev/null; then
  jq -r '.content[]? | select(.type == "text") | .text' <<<"${RAW_RESULT}" >&2
  exit 1
fi

AUDIT="$(jq -r '[.content[]? | select(.type == "text") | .text] | join("\n")' <<<"${RAW_RESULT}")"
jq empty <<<"${AUDIT}"

jq -e '
  .roots.default == {
    id: "27:3", width: 280, height: 122,
    imageHash: "af5336e1e5f53ab2704531b91d686eb2ae38f60f"
  } and
  .roots.info == {
    id: "27:49", width: 280, height: 122,
    imageHash: "af5336e1e5f53ab2704531b91d686eb2ae38f60f"
  } and
  .roots.minimized == {
    id: "27:99", width: 180, height: 18,
    imageHash: "3dc4b5a7f7e12054527c8bf4e9d312ad858b508b"
  } and
  .geometry.title == {x: 16, y: 4, width: 54, height: 11} and
  .geometry.bgmCheckbox == {x: 237, y: 24, width: 11, height: 11} and
  .geometry.effectCheckbox == {x: 237, y: 43, width: 11, height: 11} and
  .geometry.bgmOnLabel == {x: 248, y: 22, width: 22, height: 15} and
  .geometry.effectOnLabel == {x: 248, y: 41, width: 22, height: 15} and
  .geometry.bgmThumb == {x: 163.54, y: 22, width: 15, height: 15} and
  .geometry.effectThumb == {x: 136.56, y: 47, width: 15, height: 15} and
  .geometry.optionHotspot == {x: 5, y: 18, width: 14, height: 37} and
  .geometry.infoHotspot == {x: 5, y: 55, width: 14, height: 40} and
  .geometry.footerOpaque == {x: 11, y: 102, width: 11, height: 11} and
  .geometry.footerAttack == {x: 112, y: 102, width: 11, height: 11} and
  .geometry.footerSkill == {x: 163, y: 102, width: 11, height: 11} and
  .geometry.footerItem == {x: 204, y: 102, width: 11, height: 11} and
  .geometry.minimizedRestore == {x: 151, y: 0, width: 14, height: 18} and
  .geometry.minimizedClose == {x: 166, y: 0, width: 13, height: 18} and
  .assetImageHashes.title == "577a734e026b8043517697474e260ac78837a01d" and
  .assetImageHashes.bgmCheckbox == "07fdc791a86e301aebe4e3705a7918e4864e6bb8" and
  .assetImageHashes.effectCheckbox == "197a787043a1f2720cffac8f6cc2fa4116956930" and
  all(.assetImageHashes.onLabels[]; . == "ddbac7937d2233d90d841bc3d69107e9eb37c750") and
  .assetImageHashes.bgmThumb == "db5c12df3af4686d6c0db1535853811e303b4bd9" and
  .assetImageHashes.effectThumb == "db5c12df3af4686d6c0db1535853811e303b4bd9" and
  .assetImageHashes.footerOpaque == "d2c04ca76bbc9d0a7974c4ef9083afbea85126d4" and
  .assetImageHashes.footerAttack == "2a9286bb425a0378a05452fac443590415953b17" and
  .assetImageHashes.footerSkill == "d2c04ca76bbc9d0a7974c4ef9083afbea85126d4" and
  .assetImageHashes.footerItem == "2a9286bb425a0378a05452fac443590415953b17" and
  .minimizedContainerVisible == false and
  .visualTabReactionCounts == {defaultOption: 0, defaultInfo: 0, infoOption: 0, infoInfo: 0} and
  any(.fonts[]; .family == "DotGothic16" and .style == "Regular") and
  (.reactions.defaultOptionHotspot | length) == 0 and
  .reactions.defaultInfoHotspot[0].destinationId == "27:49" and
  .reactions.defaultMinimize[0].destinationId == "27:99" and
  .reactions.infoOptionHotspot[0].destinationId == "27:3" and
  (.reactions.infoInfoHotspot | length) == 0 and
  .reactions.infoMinimize[0].destinationId == "27:99" and
  .reactions.minimizedRestore[0].type == "BACK"
' <<<"${AUDIT}" >/dev/null

printf 'figma-live-check: PASS v004 non-overlapping tab hotspots, transparent slider thumb authority, exact anchors, fonts, hidden body, and linked reactions\n'
