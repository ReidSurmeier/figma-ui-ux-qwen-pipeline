#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
stagehand_version=0.4.0
stagehand_sha256=bef60adb32766bf08c5daf9ef4f46794cf62916c52ce30a1ec75c1cc746554f8
stagehand_cache=${STAGEHAND_CACHE_DIR:-/tmp/qwen-ui-pipeline-stagehand-${stagehand_version}}
stagehand_bin=${STAGEHAND_BIN:-$stagehand_cache/godot-stagehand-linux-amd64}
godot_bin=${GODOT_BIN:-/home/reidsurmeier/.cache/qwen-ui-pipeline/godot-4.7.2/Godot_v4.7.2-stable_linux.x86_64}
evidence_dir=${STAGEHAND_EVIDENCE_DIR:-$repo_dir/artifacts/qa/godot-stagehand-v001}
stagehand_host=${STAGEHAND_HOST:-127.0.0.1}
scenario_template="$repo_dir/godot/tests/stagehand/basic-info-runtime.json"

if [[ ! -x "$stagehand_bin" ]]; then
  mkdir -p "$stagehand_cache"
  curl --fail --location --silent --show-error \
    "https://github.com/mrf/godot-stagehand/releases/download/v${stagehand_version}/godot-stagehand-linux-amd64" \
    --output "$stagehand_bin"
  chmod 0755 "$stagehand_bin"
fi

printf '%s  %s\n' "$stagehand_sha256" "$stagehand_bin" | sha256sum --check --status
[[ -x "$godot_bin" ]]

scenario_dir=$(mktemp -d)
scenario="$scenario_dir/basic-info-runtime.json"
jq \
  --arg host "$stagehand_host" \
  --arg project "$repo_dir/godot" \
  '.target.host = $host | .target.project_path = $project' \
  "$scenario_template" > "$scenario"

stagehand_env=(
  "STAGEHAND_BIND_ADDRESS=$stagehand_host"
  "STAGEHAND_ALLOW_REMOTE=1"
  "__EGL_VENDOR_LIBRARY_FILENAMES=/usr/share/glvnd/egl_vendor.d/50_mesa.json"
)
stagehand_command=(
  "$stagehand_bin" run "$scenario"
  --godot-bin "$godot_bin"
  --out-dir "$evidence_dir"
)

if [[ "${STAGEHAND_XVFB:-1}" == "1" ]]; then
  env -u WAYLAND_DISPLAY "${stagehand_env[@]}" xvfb-run -a "${stagehand_command[@]}"
else
  env "${stagehand_env[@]}" "${stagehand_command[@]}"
fi

jq -e '.status == "passed"' "$evidence_dir/report.json" >/dev/null
