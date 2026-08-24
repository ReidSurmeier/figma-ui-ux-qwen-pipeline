#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
godot_dir="$repo_dir/godot"
godot_bin=${GODOT_BIN:-/home/reidsurmeier/.cache/qwen-ui-pipeline/godot-4.7.2/Godot_v4.7.2-stable_linux.x86_64}

if [[ ! -x "$godot_bin" ]]; then
  echo "Godot 4.7.2 binary not found: $godot_bin" >&2
  exit 1
fi

"$repo_dir/scripts/sync_godot_window_assets.sh"
"$repo_dir/scripts/sync_godot_window_assets.sh" --check

"$godot_bin" --headless --path "$godot_dir" --editor --quit
"$godot_bin" --headless --path "$godot_dir" --script res://tests/full_desktop_contract.gd
"$godot_bin" --headless --path "$godot_dir" --script res://tests/engine_contract.gd
mkdir -p "$godot_dir/web"
"$godot_bin" --headless --path "$godot_dir" --export-release Web web/index.html

web_server_pid=""
if [[ -z "${GODOT_WEB_URL:-}" ]]; then
  GODOT_WEB_URL="http://10.255.255.254:4176"
  node "$godot_dir/serve-web.mjs" >"$godot_dir/web/server.log" 2>&1 &
  web_server_pid=$!
  trap 'if [[ -n "$web_server_pid" ]]; then kill "$web_server_pid" 2>/dev/null || true; fi' EXIT
  for _attempt in {1..50}; do
    if curl --fail --silent --show-error "$GODOT_WEB_URL/index.html" >/dev/null; then break; fi
    sleep 0.1
  done
  curl --fail --silent --show-error "$GODOT_WEB_URL/index.html" >/dev/null
fi

GODOT_WEB_URL="$GODOT_WEB_URL" \
  "$repo_dir/prototype/node_modules/.bin/playwright" test --config "$godot_dir/playwright.config.mjs"
