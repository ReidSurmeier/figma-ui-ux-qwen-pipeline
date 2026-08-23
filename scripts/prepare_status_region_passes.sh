#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/.." && pwd)
SOURCE="$REPO_ROOT/benchmarks/japanese-rpg-options-v001/regions/status/reference.png"
REGION_DIR="$REPO_ROOT/benchmarks/japanese-rpg-options-v001/regions/status/removals"
BRIEF_DIR="$REPO_ROOT/briefs/japanese-rpg-options-v001/windows/status-regions"
mkdir -p "$REGION_DIR" "$BRIEF_DIR"

write_pass() {
  local id=$1 x=$2 y=$3 width=$4 height=$5 size=$6 seed=$7 target=$8 preserve=$9
  convert "$SOURCE" -crop "${width}x${height}+${x}+${y}" +repage "$REGION_DIR/$id-reference.png"
  jq -n \
    --arg id "$id" --argjson width "$width" --argjson height "$height" \
    --arg size "$size" --argjson seed "$seed" --arg target "$target" --arg preserve "$preserve" \
    '{
      model: "qwen/qwen-image-3-pro",
      provider: "alibaba",
      objective: ("Erase every foreground mark from the exact Status-window " + $id + " crop and return the same crop as an empty local surface donor. This is strict inpainting, not a redesign and not a transcription task."),
      reference_role: ("Reference image 1 is the authoritative source crop. Its exact " + ($width|tostring) + " by " + ($height|tostring) + " canvas and all one-pixel panel boundaries are locked."),
      preservation_invariants: [
        "Keep the exact crop dimensions, pixel density, palette, row geometry, one-pixel separators, borders, and highlights.",
        ("Preserve " + $preserve + "."),
        "All surviving non-semantic pixels must remain at their original coordinates."
      ],
      canvas: [
        "Return this crop only, never the complete game screenshot or magenta desktop.",
        ("Render at exactly " + $size + " pixels for point reduction back to " + ($width|tostring) + " by " + ($height|tostring) + "."),
        "Continue the nearest white, pale-grey, or pale-blue panel surface through every erased foreground pixel."
      ],
      regions: [{
        name: $id,
        change: ("Completely remove " + $target + ". Leave no readable text, pseudo-text, numbers, arrows, icons, glyph fragments, shadows, or selection tint."),
        preserve: [$preserve, "row and column boundaries", "source-scale raster character"]
      }],
      exact_copy: [],
      style: ["Exact late-1990s Japanese PC RPG raster UI inpainting", "empty source-matched panel donor"],
      asset_rules: [
        "No semantic foreground may remain.",
        "No replacement labels, controls, icons, decoration, or invented panels."
      ],
      negative_constraints: [
        "No readable or gibberish text, digits, arrows, buttons, blue selection, magenta, neighboring windows, smoothing, modern UI, rounded cards, or soft shadows."
      ],
      quality_checks: [
        "OCR at source scale returns no labels or values.",
        "The donor aligns with the source crop boundaries and can be composited without a seam.",
        "Only empty local panel and chrome surfaces remain."
      ],
      output: {size: $size, aspect_ratio: "source", resolution: "1K", count: 1, seed: $seed}
    }' > "$BRIEF_DIR/$id-v001.json"
  uv run qwen-ui-pipeline compile "$BRIEF_DIR/$id-v001.json" >/dev/null
}

write_pass side-tabs 0 18 20 108 '384*2048' 22083101 \
  "both vertical English tab glyphs and their dark strokes" \
  "the pale side-tab wells, stepped right edges, white gutter, and outer left chrome"
write_pass primary-stats 20 18 90 108 '540*648' 22083102 \
  "Str Agi Vit Int Dex Luk, every value, plus sign, bonus value, blue arrow disc, and trailing point value" \
  "the six white row surfaces, thin grey row lines, column wells, and outer panel edges"
write_pass derived-stats 100 18 180 108 '720*432' 22083103 \
  "Atk Def Matk Mdef Hit Flee Critical Aspd Status Point Guild and every number punctuation and value" \
  "the two derived-stat columns, white row surfaces, thin grey separators, right edge, and lower rule"

# Reference 2 for the v002 retries is an empty semantic target, not a final
# asset. Qwen remains the renderer; the guide separates desired blank geometry
# from Reference 1's source-style authority so the model is less likely to
# transcribe the foreground that it was asked to erase.
convert -size 90x108 xc:'#ffffff' \
  -fill '#f7f6f8' -stroke '#c7c7c7' -strokewidth 1 \
  -draw 'rectangle 31,1 89,16 rectangle 31,19 89,34 rectangle 31,37 89,52 rectangle 31,55 89,70 rectangle 31,73 89,88 rectangle 31,91 89,106' \
  -stroke '#d8d8d8' \
  -draw 'line 58,1 58,16 line 78,1 78,16 line 58,19 58,34 line 78,19 78,34 line 58,37 58,52 line 78,37 78,52 line 58,55 58,70 line 78,55 78,70 line 58,73 58,88 line 78,73 78,88 line 58,91 58,106 line 78,91 78,106' \
  "$REGION_DIR/primary-stats-empty-guide.png"

convert -size 180x108 xc:'#ffffff' -stroke '#c7c7c7' -strokewidth 1 \
  -draw 'line 0,17 179,17 line 0,35 179,35 line 0,53 179,53 line 0,71 179,71 line 0,89 179,89 line 0,107 179,107' \
  "$REGION_DIR/derived-stats-empty-guide.png"

for id in primary-stats derived-stats; do
  jq '
    .objective = ("Render the empty semantic target in Reference image 2 with the exact source style and coordinates from Reference image 1. Erase every source label, value, digit, arrow, and icon. Reference 2 controls what remains; Reference 1 controls only palette, pixel texture, and border character.") |
    .reference_role = "Reference image 1 is the original Status-window region and is style authority only. Reference image 2 is the mandatory empty geometry target. Never transcribe semantic foreground from Reference 1; render Reference 2 as a source-matched late-1990s raster surface." |
    .preservation_invariants += ["Reference image 2 locks the empty row and column geometry; keep it empty."] |
    .negative_constraints += ["Do not copy or redraw any text, digits, labels, values, plus signs, arrows, or icons from Reference image 1."] |
    .quality_checks += ["The output is semantically identical to the empty Reference 2 guide and stylistically matched to Reference 1."] |
    .output.seed += 100
  ' "$BRIEF_DIR/$id-v001.json" > "$BRIEF_DIR/$id-v002.json"
  uv run qwen-ui-pipeline compile "$BRIEF_DIR/$id-v002.json" >/dev/null
done

jq '
  .objective = "Render Reference image 1 as a finished empty late-1990s Japanese RPG derived-stat table surface. Reference image 2 is an accepted empty Qwen donor and controls the raster palette and border character. No source screenshot containing text is present in this pass." |
  .reference_role = "Reference image 1 is the mandatory empty 180 by 108 geometry guide. Reference image 2 is a Qwen-rendered blank style donor from the same Status window. Keep the guide empty and borrow only pale panel colors, hard one-pixel borders, and raster texture from the donor." |
  .preservation_invariants = [
    "Keep the exact six-row 180 by 108 geometry from Reference image 1.",
    "Keep every row empty.",
    "Use Reference image 2 only for pale-blue-grey palette, hard pixel-scale borders, and subtle late-1990s raster texture."
  ] |
  .negative_constraints += ["No magenta edge and no semantic source screenshot is available to transcribe."] |
  .output.seed += 100
' "$BRIEF_DIR/derived-stats-v002.json" > "$BRIEF_DIR/derived-stats-v003.json"
uv run qwen-ui-pipeline compile "$BRIEF_DIR/derived-stats-v003.json" >/dev/null

jq '
  .objective = "Render the exact empty 180 by 108 six-row table guide in Reference image 1 as a finished pale white late-1990s Japanese RPG panel. Keep every row empty and keep the complete canvas filled by the table surface." |
  .reference_role = "Reference image 1 is the only authority. Preserve its complete 180 by 108 white table surface, six-row geometry, one-pixel dividers, and empty content." |
  .preservation_invariants = [
    "Keep the exact 180 by 108 canvas.",
    "The panel fills the complete canvas from left edge to right edge.",
    "Keep six empty white rows and their hard one-pixel separators."
  ] |
  .negative_constraints = [
    "No text, digits, labels, values, arrows, icons, selection, neighboring content, smoothing, rounded cards, gradients, or soft shadows.",
    "No outside field or margin; the table surface reaches all four crop edges."
  ] |
  .output.seed += 100
' "$BRIEF_DIR/derived-stats-v003.json" > "$BRIEF_DIR/derived-stats-v004.json"
uv run qwen-ui-pipeline compile "$BRIEF_DIR/derived-stats-v004.json" >/dev/null

printf 'status-region-passes: prepared\n'
