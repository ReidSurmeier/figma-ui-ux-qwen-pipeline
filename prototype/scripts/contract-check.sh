#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROTOTYPE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_DIR="$(cd "${PROTOTYPE_DIR}/.." && pwd)"
MANIFEST="${REPO_DIR}/benchmarks/japanese-rpg-options-v001/design-manifest.json"
TAB_PROVENANCE="${REPO_DIR}/benchmarks/japanese-rpg-options-v001/regions/options-window/tab-state-provenance.json"
MINIMIZED_PROVENANCE="${REPO_DIR}/benchmarks/japanese-rpg-options-v001/regions/options-window/minimized-state-provenance.json"
FIGMA_READBACK="${REPO_DIR}/benchmarks/japanese-rpg-options-v001/regions/options-window/figma-v004-readback.json"
REFERENCE="${REPO_DIR}/benchmarks/japanese-rpg-options-v001/regions/options-window/reference.png"
ASSET_DIR="${PROTOTYPE_DIR}/public/assets/japanese-options-v001/components"
RUNTIME_SOURCE="${PROTOTYPE_DIR}/src/OptionsWindow.tsx"
RUNTIME_STYLES="${PROTOTYPE_DIR}/src/styles.css"
E2E_SPEC="${PROTOTYPE_DIR}/e2e/options-window.spec.ts"
VISUAL_CHECK="${PROTOTYPE_DIR}/scripts/visual-check.sh"

jq empty "${MANIFEST}" "${TAB_PROVENANCE}" "${MINIMIZED_PROVENANCE}" "${FIGMA_READBACK}"

expected_reference_hash="$(jq -r '.reference.sha256' "${MANIFEST}")"
actual_reference_hash="$(sha256sum "${REFERENCE}" | cut -d' ' -f1)"
[[ "${actual_reference_hash}" == "${expected_reference_hash}" ]]

[[ "$(jq -r '.reference.visible_runtime_underlay' "${MANIFEST}")" == "false" ]]
[[ "$(jq -r '.qwen.model' "${MANIFEST}")" == "qwen/qwen-image-3-pro" ]]
[[ "$(jq -r '.runtime.slider_step' "${MANIFEST}")" == "1" ]]
[[ "$(jq -r '.qwen_attempt.status' "${TAB_PROVENANCE}")" == "rejected" ]]
[[ "$(jq -r '.qwen_attempt.model' "${TAB_PROVENANCE}")" == "qwen/qwen-image-3-pro" ]]
[[ "$(jq -r '.render_pass.model' "${MINIMIZED_PROVENANCE}")" == "qwen/qwen-image-3-pro" ]]
[[ "$(jq -r '.render_pass.provider' "${MINIMIZED_PROVENANCE}")" == "alibaba" ]]
[[ "$(jq -r '.status' "${MINIMIZED_PROVENANCE}")" == "generated-tested-awaiting-human-acceptance" ]]
[[ "$(jq -r '.figma_file_key' "${FIGMA_READBACK}")" == "v0bBUYUtCz88dfG2IMgho4" ]]
[[ "$(jq -r '.nodes.default' "${FIGMA_READBACK}")" == "27:3" ]]
[[ "$(jq -r '.nodes.info' "${FIGMA_READBACK}")" == "27:49" ]]
[[ "$(jq -r '.nodes.minimized' "${FIGMA_READBACK}")" == "27:99" ]]
[[ "$(jq -c '.geometry.bgm_checkbox' "${FIGMA_READBACK}")" == '[237,24,11,11]' ]]
[[ "$(jq -c '.geometry.effect_checkbox' "${FIGMA_READBACK}")" == '[237,43,11,11]' ]]
[[ "$(jq -c '.geometry.bgm_on_label' "${FIGMA_READBACK}")" == '[248,22,22,15]' ]]
[[ "$(jq -c '.geometry.effect_on_label' "${FIGMA_READBACK}")" == '[248,41,22,15]' ]]
[[ "$(jq -c '.geometry.bgm_thumb' "${FIGMA_READBACK}")" == '[163.54,22,15,15]' ]]
[[ "$(jq -c '.geometry.effect_thumb' "${FIGMA_READBACK}")" == '[136.56,47,15,15]' ]]
[[ "$(jq -c '.geometry.slider_track_center_endpoints' "${FIGMA_READBACK}")" == '[83,225]' ]]
[[ "$(jq -c '.geometry.default_option_hotspot' "${FIGMA_READBACK}")" == '[5,18,14,37]' ]]
[[ "$(jq -c '.geometry.default_info_hotspot' "${FIGMA_READBACK}")" == '[5,55,14,40]' ]]
[[ "$(jq -c '.geometry.footer_opaque_checkbox' "${FIGMA_READBACK}")" == '[11,102,11,11]' ]]
[[ "$(jq -c '.geometry.footer_attack_checkbox' "${FIGMA_READBACK}")" == '[112,102,11,11]' ]]
[[ "$(jq -c '.geometry.footer_skill_checkbox' "${FIGMA_READBACK}")" == '[163,102,11,11]' ]]
[[ "$(jq -c '.geometry.footer_item_checkbox' "${FIGMA_READBACK}")" == '[204,102,11,11]' ]]
[[ "$(jq -c '.geometry.minimized' "${FIGMA_READBACK}")" == '[0,0,180,18]' ]]
[[ "$(jq -r '.minimized_endpoint.prompt_id' "${FIGMA_READBACK}")" == "6340905d-4b06-46c1-b843-95cb7927a50a" ]]

for export_key in default info minimized runtime_default runtime_minimized; do
  export_path="$(jq -r ".exports.${export_key}.path" "${FIGMA_READBACK}")"
  expected_export_hash="$(jq -r ".exports.${export_key}.sha256" "${FIGMA_READBACK}")"
  actual_export_hash="$(sha256sum "$(dirname "${FIGMA_READBACK}")/${export_path}" | cut -d' ' -f1)"
  [[ "${actual_export_hash}" == "${expected_export_hash}" ]]
done

if rg -n 'reference\.png' "${PROTOTYPE_DIR}/src" "${PROTOTYPE_DIR}/index.html"; then
  printf 'contract-check: runtime source references the locked screenshot\n' >&2
  exit 1
fi

check_asset() {
  local name="$1"
  local expected_size="$2"
  local provenance_key="$3"
  local path="${ASSET_DIR}/${name}"
  local actual_size actual_hash expected_hash
  actual_size="$(identify -format '%wx%h' "${path}")"
  actual_hash="$(sha256sum "${path}" | cut -d' ' -f1)"
  expected_hash="$(jq -r ".promoted_assets.${provenance_key}.sha256" "${TAB_PROVENANCE}")"
  [[ "${actual_size}" == "${expected_size}" ]]
  [[ "${actual_hash}" == "${expected_hash}" ]]
}

check_asset "tab-option-inactive.png" "14x39" "option_inactive"
check_asset "tab-info-selected.png" "14x40" "info_selected"

option_alpha_difference="$(compare -metric AE \
  \( "${ASSET_DIR}/tab-option.png" -alpha extract \) \
  \( "${ASSET_DIR}/tab-option-inactive.png" -alpha extract \) \
  null: 2>&1 || true)"
info_alpha_difference="$(compare -metric AE \
  \( "${ASSET_DIR}/tab-info.png" -alpha extract \) \
  \( "${ASSET_DIR}/tab-info-selected.png" -alpha extract \) \
  null: 2>&1 || true)"
[[ "${option_alpha_difference}" == "0" ]]
[[ "${info_alpha_difference}" == "0" ]]

rg -q 'font-family: "DotGothic16"' "${RUNTIME_STYLES}"
[[ "$(sha256sum "${PROTOTYPE_DIR}/public/fonts/DotGothic16-Regular.ttf" | cut -d' ' -f1)" == "155da8f318553c11d9dffc2affbc7c2114c6a46f9740bcf639ed5568af92be71" ]]
[[ "$(sha256sum "${PROTOTYPE_DIR}/public/assets/japanese-options-v001/clean-plate.png" | cut -d' ' -f1)" == "$(jq -r '.qwen.clean_plate.sha256' "${MANIFEST}")" ]]
[[ "$(sha256sum "${ASSET_DIR}/minimized-plate.png" | cut -d' ' -f1)" == "$(jq -r '.promoted_asset.sha256' "${MINIMIZED_PROVENANCE}")" ]]
[[ "$(identify -format '%wx%h' "${ASSET_DIR}/minimized-plate.png")" == "180x18" ]]
for transparent_asset in checkbox-off.png checkbox-on.png footer-checkbox-off.png footer-checkbox-on.png on-label.png slider-thumb.png title-text.png; do
  [[ "$(identify -format '%[opaque]' "${ASSET_DIR}/${transparent_asset}" | tr '[:upper:]' '[:lower:]')" == "false" ]]
done
[[ "$(sha256sum "${ASSET_DIR}/on-label.png" | cut -d' ' -f1)" == "$(jq -r '.local_asset_hashes.on_label' "${FIGMA_READBACK}")" ]]
[[ "$(sha256sum "${ASSET_DIR}/footer-checkbox-off.png" | cut -d' ' -f1)" == "$(jq -r '.local_asset_hashes.footer_checkbox_off' "${FIGMA_READBACK}")" ]]
[[ "$(sha256sum "${ASSET_DIR}/footer-checkbox-on.png" | cut -d' ' -f1)" == "$(jq -r '.local_asset_hashes.footer_checkbox_on' "${FIGMA_READBACK}")" ]]
[[ "$(sha256sum "${ASSET_DIR}/slider-thumb.png" | cut -d' ' -f1)" == "$(jq -r '.local_asset_hashes.slider_thumb' "${FIGMA_READBACK}")" ]]
[[ "$(identify -format '%@' "${ASSET_DIR}/on-label.png")" == "11x6+0+5" ]]
[[ "$(identify -format '%@' "${ASSET_DIR}/footer-checkbox-off.png")" == "10x10+0+0" ]]
[[ "$(identify -format '%@' "${ASSET_DIR}/footer-checkbox-on.png")" == "10x10+0+0" ]]
[[ "$(identify -format '%@' "${ASSET_DIR}/slider-thumb.png")" == "8x9+5+2" ]]
rg -q 'transition: width 208ms steps\(13, end\), height 208ms steps\(13, end\)' "${RUNTIME_STYLES}"
rg -q '\.arrow:active' "${RUNTIME_STYLES}"
rg -q '\.window-button:active' "${RUNTIME_STYLES}"
rg -q '\.vertical-tabs button:active' "${RUNTIME_STYLES}"
rg -q '\.skin-combobox-button:active' "${RUNTIME_STYLES}"
rg -q 'Math\.min\(maxX, Math\.max\(minX, proposedX\)\)' "${RUNTIME_SOURCE}"
rg -q 'generated compact state instead of cropping' "${E2E_SPEC}"
rg -q 'checkbox state changes preserve the visible source anchor' "${E2E_SPEC}"
rg -q 'bottom checkbox states never paint a dead pixel above their visible boxes' "${E2E_SPEC}"
rg -q 'volume checkboxes leave the source gap before a complete on label' "${E2E_SPEC}"
rg -q 'title has no rectangular boundary seam' "${E2E_SPEC}"
rg -q 'slider thumbs reach both source track endpoints without native inset' "${E2E_SPEC}"
rg -q 'option and info pixels map to non-overlapping tab hit regions' "${E2E_SPEC}"
rg -q 'pixel-layout regions' "${E2E_SPEC}"
rg -q 'source pixel geometry' "${E2E_SPEC}"
rg -q -U '\.skin-combobox-button \{\n  display: block;' "${RUNTIME_STYLES}"
rg -q 'title boundary MAE' "${VISUAL_CHECK}"
rg -Fq '.geometry.bgmCheckbox == {x: 237, y: 24' "${PROTOTYPE_DIR}/scripts/figma-live-check.sh"
rg -Fq '.geometry.effectCheckbox == {x: 237, y: 43' "${PROTOTYPE_DIR}/scripts/figma-live-check.sh"
rg -Fq '.geometry.optionHotspot == {x: 5, y: 18, width: 14, height: 37}' "${PROTOTYPE_DIR}/scripts/figma-live-check.sh"
rg -Fq '.geometry.infoHotspot == {x: 5, y: 55, width: 14, height: 40}' "${PROTOTYPE_DIR}/scripts/figma-live-check.sh"
[[ "$(jq -r '.verification.end_to_end_flows' "${MANIFEST}")" == "23" ]]

printf 'contract-check: PASS source, provider, underlay, slider endpoints, transparent thumb, exact tab hit mapping, hash, source-locked geometry, alpha, press, drag, shared pixel-font, title, minimize, and recorded Figma v004 contracts\n'
