#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
godot_dir="$repo_dir/godot"
godot_bin=${GODOT_BIN:-/home/reidsurmeier/.cache/qwen-ui-pipeline/godot-4.7.2/Godot_v4.7.2-stable_linux.x86_64}

if [[ ! -x "$godot_bin" ]]; then
  echo "Godot 4.7.2 binary not found: $godot_bin" >&2
  exit 1
fi

"$godot_bin" --headless --path "$godot_dir" --editor --quit
"$godot_bin" --headless --path "$godot_dir" --script res://tests/full_desktop_contract.gd
"$godot_bin" --headless --path "$godot_dir" --script res://tests/engine_contract.gd
mkdir -p "$godot_dir/web"
"$godot_bin" --headless --path "$godot_dir" --export-release Web web/index.html

if [[ -n "${GODOT_WEB_URL:-}" ]]; then
  GODOT_WEB_URL="$GODOT_WEB_URL" \
    "$repo_dir/prototype/node_modules/.bin/playwright" test --config "$godot_dir/playwright.config.mjs"
fi
