#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo_dir=$(cd -- "$script_dir/.." && pwd)
source_image="$repo_dir/benchmarks/japanese-rpg-options-v001/regions/basic-info/reference.png"
output_dir="$repo_dir/artifacts/inputs/japanese-basic-info-title-repair-v002"
output_image="$output_dir/reference-2x1.png"

mkdir -p "$output_dir"
convert "$source_image" \
  -background white \
  -gravity north \
  -extent 280x140 \
  "$output_image"

identify "$output_image"
sha256sum "$source_image" "$output_image"
