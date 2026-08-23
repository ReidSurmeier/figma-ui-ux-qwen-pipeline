#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo_dir=$(cd -- "$script_dir/.." && pwd)
source_image="$repo_dir/benchmarks/japanese-rpg-options-v001/regions/basic-info/reference.png"
run_dir="$repo_dir/artifacts/runs/japanese-basic-info-remove-title-v002"
qa_dir="$repo_dir/artifacts/qa/basic-info-title-repair-v002"
selected="$run_dir/image-01.png"

mkdir -p "$qa_dir"
test -f "$source_image"
test -f "$run_dir/run.json"
test -f "$selected"

provider=$(jq -r '.provenance.provider' "$run_dir/run.json")
output_count=$(jq -r '.outputs | length' "$run_dir/run.json")
generation_cost=$(jq -r '.usage.cost' "$run_dir/run.json")
reference_sha=$(sha256sum "$repo_dir/artifacts/inputs/japanese-basic-info-title-repair-v002/reference-2x1.png" | cut -d ' ' -f 1)
recorded_reference_sha=$(jq -r '.provenance.reference_sha256' "$run_dir/run.json")
recorded_selected_sha=$(jq -r '.outputs[] | select(.file == "image-01.png") | .sha256' "$run_dir/run.json")
actual_selected_sha=$(sha256sum "$selected" | cut -d ' ' -f 1)
[[ "$provider" == "openrouter" ]]
[[ "$output_count" == "2" ]]
[[ "$recorded_reference_sha" == "$reference_sha" ]]
[[ "$recorded_selected_sha" == "$actual_selected_sha" ]]

convert "$source_image" -crop 213x11+55+3 +repage "$qa_dir/reference-title-background.png"

best_candidate=""
best_score="1"
for candidate in 01 02; do
  input="$run_dir/image-$candidate.png"
  source_scale="$qa_dir/candidate-$candidate-source-scale.png"
  title_background="$qa_dir/candidate-$candidate-title-background.png"
  test -f "$input"
  [[ "$(identify -format '%wx%h' "$input")" == "1024x512" ]]
  convert "$input" -filter Lanczos -resize 280x140\! -crop 280x120+0+0 +repage "$source_scale"
  convert "$source_scale" -crop 213x11+55+3 +repage "$title_background"
  metric=$(compare -metric MAE "$qa_dir/reference-title-background.png" "$title_background" null: 2>&1 || true)
  score=$(sed -n 's/.*(\([^)]*\)).*/\1/p' <<< "$metric")
  awk -v score="$score" 'BEGIN { exit !(score <= 0.05) }'
  if awk -v score="$score" -v best="$best_score" 'BEGIN { exit !(score < best) }'; then
    best_candidate="$candidate"
    best_score="$score"
  fi
done

[[ "$best_candidate" == "01" ]]

jq -n \
  --arg source_sha256 "$(sha256sum "$source_image" | cut -d ' ' -f 1)" \
  --arg selected_file "image-01.png" \
  --arg selected_sha256 "$actual_selected_sha" \
  --argjson selected_background_mae "$best_score" \
  --arg provider "$provider" \
  --argjson output_count "$output_count" \
  --arg reference_input_sha256 "$reference_sha" \
  --argjson generation_cost "$generation_cost" \
  '{
    schemaVersion: "1.0",
    verdict: "pass",
    sourceSha256: $source_sha256,
    provider: $provider,
    outputCount: $output_count,
    referenceInputSha256: $reference_input_sha256,
    generationCostUsd: $generation_cost,
    selected: {
      file: $selected_file,
      sha256: $selected_sha256,
      titleBackgroundNormalizedMae: $selected_background_mae,
      maximumTitleBackgroundNormalizedMae: 0.05
    },
    assemblyRule: "Only x=3..277 y=2..16 may enter the clean plate; the generated body and review margin are rejected."
  }' > "$qa_dir/report.json"

printf 'basic-info-title-repair-v002: PASS candidate 01 background MAE %s\n' "$best_score"
