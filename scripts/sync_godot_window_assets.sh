#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo_dir=$(cd -- "$script_dir/.." && pwd)
source_root="$repo_dir/prototype/public/assets/japanese-rpg-v001"
target_root="$repo_dir/godot/assets/windows/japanese-rpg-v001"
source_manifest="$repo_dir/artifacts/qa/runtime-component-manifest.json"
target_manifest="$repo_dir/godot/data/runtime-component-manifest.json"
mode=${1:-sync}

if [[ "$mode" != "sync" && "$mode" != "--check" ]]; then
  printf 'usage: %s [sync|--check]\n' "$0" >&2
  exit 2
fi

test -d "$source_root"
test -f "$source_manifest"

if [[ "$mode" == "sync" ]]; then
  while IFS= read -r -d '' source_asset; do
    relative=${source_asset#"$source_root/"}
    target_asset="$target_root/$relative"
    install -D -m 0644 "$source_asset" "$target_asset"
  done < <(find "$source_root" -type f -name '*.png' -print0 | sort -z)
  install -D -m 0644 "$source_manifest" "$target_manifest"
fi

checked=0
while IFS= read -r -d '' source_asset; do
  relative=${source_asset#"$source_root/"}
  target_asset="$target_root/$relative"
  if [[ ! -f "$target_asset" ]] || ! cmp -s "$source_asset" "$target_asset"; then
    printf 'Godot asset drift: %s\n' "$relative" >&2
    exit 1
  fi
  checked=$((checked + 1))
done < <(find "$source_root" -type f -name '*.png' -print0 | sort -z)

cmp -s "$source_manifest" "$target_manifest" || {
  printf 'Godot manifest drift: %s\n' "$target_manifest" >&2
  exit 1
}

printf 'sync-godot-window-assets: PASS %d PNG assets and runtime manifest\n' "$checked"
